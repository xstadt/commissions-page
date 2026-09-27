// ============================================================
// /api/stripe-webhook.js
//
// Stripe's servers call this directly the moment something
// happens to a payment. It does NOT depend on the customer's
// browser coming back to the site, which is the whole point.
//
// There are two kinds of order now, and this file handles the
// full life of both:
//
//   CHARGE RIGHT AWAY
//     checkout.session.completed  -> money taken, piece marked Sold
//
//   ASK ME FIRST (card held, not charged)
//     checkout.session.completed  -> piece set aside, artist emailed
//     payment_intent.succeeded    -> artist approved in Stripe, now Sold
//     payment_intent.canceled     -> artist released it (or the 7-day
//                                    hold expired), piece back on sale
//
// Editions (a run of 15 or 100 sold from one listing) follow the
// same life, but instead of flipping `sold` they log one entry per
// order in `editionOrders` — pending while a card is held, paid once
// the money moves, removed if the hold is released. The shop works
// out what's left from that log.
//
// Events this doesn't recognise are acknowledged and ignored.
//
// STRIPE DASHBOARD: send these three event types to this endpoint —
//   checkout.session.completed
//   payment_intent.succeeded
//   payment_intent.canceled
// ============================================================

import Stripe from "stripe";
import { createClient } from "@sanity/client";
import { isEdition, unitsTaken, orderKey } from "./_inventory.js";

// Local development only - see the note in create-checkout-session.js
if (!process.env.VERCEL) {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local" });
  } catch { /* dotenv not installed in production - fine */ }
}

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mgodnbvr";

// Both clients are built on first use rather than at import time, so a
// missing key produces a readable error instead of crashing the module.
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// This one needs WRITE access, unlike the read-only client the shop
// page and checkout function use.
let _sanity = null;
function getSanity() {
  if (!_sanity) {
    _sanity = createClient({
      projectId: "uo61beyo",
      dataset: "production",
      apiVersion: "2024-01-01",
      useCdn: false,
      token: process.env.SANITY_WRITE_TOKEN,
    });
  }
  return _sanity;
}

// Formspree can reject a submission while still returning a response,
// so a request that didn't throw is NOT proof it worked.
async function notify(payload) {
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "(no body)");
      console.error(`Formspree rejected the email — HTTP ${res.status}:`, detail);
    }
    return res.ok;
  } catch (err) {
    console.error("Formspree request failed:", err);
    return false;
  }
}

function money(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function qtyLabel(qty) {
  return qty > 1 ? ` ×${qty}` : "";
}

// ------------------------------------------------------------
// Add (or advance) one order in an edition's sales log.
//
// Two buyers can finish checkout for the same edition within the
// same second. Each write is tied to the revision we just read, and
// if someone else wrote first Sanity refuses ours, we re-read and try
// again, so neither order gets dropped.
//
// Returns how the write went, plus how many copies past the edition
// size this order went, in case two checkouts raced for the last few
// (Stripe has already taken the money by now, so the order is
// recorded either way and the artist gets told to sort it out).
// ------------------------------------------------------------
async function recordEditionOrder(sanity, docId, entry) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const doc = await sanity.fetch(
      `*[_id == $id][0]{ _rev, name, editionSize, editionOrders }`,
      { id: docId }
    );
    if (!doc) return { status: "missing" };

    const orders = doc.editionOrders || [];
    const existing = orders.find((o) => o.sessionId === entry.sessionId);
    if (existing && existing.state === entry.state) {
      return { status: "duplicate", name: doc.name };
    }

    const others = orders.filter((o) => o.sessionId !== entry.sessionId);
    const oversold = Math.max(0, unitsTaken({ editionOrders: others }) + entry.qty - doc.editionSize);

    let patch = sanity.patch(docId).ifRevisionId(doc._rev);
    if (existing) {
      patch = patch.set({
        [`editionOrders[_key=="${existing._key}"].state`]: entry.state,
        [`editionOrders[_key=="${existing._key}"].paymentIntentId`]: entry.paymentIntentId,
      });
    } else {
      patch = patch
        .setIfMissing({ editionOrders: [] })
        .append("editionOrders", [
          { _key: orderKey(entry.sessionId, docId), _type: "editionOrder", ...entry },
        ]);
    }

    try {
      await patch.commit();
      return { status: existing ? "updated" : "added", oversold, name: doc.name };
    } catch (err) {
      // 409 = someone else changed the document since we read it.
      if (err?.statusCode === 409) continue;
      throw err;
    }
  }
  throw new Error(`Gave up recording edition order on ${docId} after repeated conflicts`);
}

// ------------------------------------------------------------
// Find the edition entries tied to one payment that are still
// waiting on the artist.
// ------------------------------------------------------------
async function pendingEditionEntries(sanity, paymentIntentId) {
  const docs = await sanity.fetch(
    `*[_type == "product" && defined(editionSize) && $pi in editionOrders[].paymentIntentId]{
       _id, name, "slug": slug.current,
       "entries": editionOrders[paymentIntentId == $pi && state == "pending"]{ _key, qty }
     }`,
    { pi: paymentIntentId }
  );
  return docs.filter((d) => d.entries?.length > 0);
}

function stripeLink(paymentIntentId, livemode) {
  const base = livemode
    ? "https://dashboard.stripe.com/payments/"
    : "https://dashboard.stripe.com/test/payments/";
  return paymentIntentId ? base + paymentIntentId : "https://dashboard.stripe.com/payments";
}

export async function POST(request) {
  const stripe = getStripe();
  const sanity = getSanity();

  // Signature verification needs the body EXACTLY as Stripe sent it,
  // byte for byte. request.text() gives us that. Do not parse it as
  // JSON first — re-stringifying changes the bytes and the check fails.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature check failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event, stripe, sanity);
    } else if (event.type === "payment_intent.succeeded") {
      await handleCaptured(event, sanity);
    } else if (event.type === "payment_intent.canceled") {
      await handleReleased(event, sanity);
    }
  } catch (err) {
    // Log it, but still return 200. If we return an error, Stripe
    // retries this webhook for days and the artist gets the same
    // email over and over.
    console.error(`Handling ${event.type} failed:`, err);
  }

  return Response.json({ received: true });
}

// ------------------------------------------------------------
// A checkout finished. Either the money moved, or a hold was placed.
// ------------------------------------------------------------
async function handleCheckoutCompleted(event, stripe, sanity) {
  const session = event.data.object;

  // Pull the full session so we get the line items with their product
  // names attached, plus the payment itself so we can tell a completed
  // charge apart from a hold.
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items", "line_items.data.price.product", "payment_intent"],
  });

  const lineItems = full.line_items?.data || [];
  const intent = full.payment_intent || null;
  const intentId = typeof intent === "string" ? intent : intent?.id || null;
  const intentStatus = typeof intent === "object" ? intent?.status : null;

  // Where did this land?
  //   succeeded       -> charged, done
  //   requires_capture-> card held, waiting on the artist
  //   anything else   -> a slow payment method still settling; do
  //                      nothing until it resolves
  let stage = null;
  if (intentStatus === "succeeded" || full.payment_status === "paid") stage = "paid";
  else if (intentStatus === "requires_capture") stage = "pending";

  if (!stage) {
    console.log(
      `Session ${full.id} completed but payment is "${intentStatus || full.payment_status}" — nothing to do yet.`
    );
    return;
  }

  const lines = lineItems
    .map((li) => {
      const name = li.price?.product?.name || li.description || "Item";
      return `• ${name}${qtyLabel(li.quantity || 1)} — ${money(li.amount_total)}`;
    })
    .join("\n");

  // ---- Set the pieces aside in Sanity ------------------------
  // The slug was embedded in metadata at checkout time, so this is an
  // exact match rather than guessing from the name.
  //
  // One-of-ones: both a charge and a hold flip `sold` on. That's
  // deliberate: a piece someone has a card hold against must not stay
  // buyable, or two people end up owning the same object. `orderState`
  // is what separates "gone forever" from "waiting on the artist".
  //
  // Editions: the order goes into the edition's sales log with its
  // copy count, and the shop's count goes down by that many.
  let alreadyProcessed = false;
  const stockWarnings = [];

  const soldLines = lineItems
    .map((li) => ({
      slug: li.price?.product?.metadata?.sanity_slug,
      qty: li.quantity || 1,
    }))
    .filter((l) => l.slug);
  const soldSlugs = soldLines.map((l) => l.slug);

  if (soldSlugs.length > 0) {
    const matches = await sanity.fetch(
      `*[_type == "product" && slug.current in $slugs]{
         _id, name, "slug": slug.current, sold, orderState, soldOrderId, editionSize
       }`,
      { slugs: soldSlugs }
    );

    const oneOffs = matches.filter((m) => !isEdition(m));
    const editions = matches.filter(isEdition);
    const now = new Date().toISOString();

    // If every one-of-one already carries THIS checkout reference at
    // THIS stage, we've seen the event before — Stripe re-sends
    // webhooks on timeout, and without this the artist gets the same
    // email twice.
    const oneOffsDone = oneOffs.every(
      (m) => m.soldOrderId === full.id && m.orderState === stage
    );

    if (!oneOffsDone) {
      const tx = sanity.transaction();
      oneOffs.forEach((m) =>
        tx.patch(m._id, {
          set: {
            sold: true,
            orderState: stage,
            soldOrderId: full.id,
            paymentIntentId: intentId || "",
            soldAt: now,
          },
        })
      );
      await tx.commit();
    }

    let editionsDone = true;
    for (const m of editions) {
      const qty = soldLines
        .filter((l) => l.slug === m.slug)
        .reduce((n, l) => n + l.qty, 0);
      const result = await recordEditionOrder(sanity, m._id, {
        qty,
        state: stage,
        sessionId: full.id,
        paymentIntentId: intentId || "",
        at: now,
      });
      if (result.status !== "duplicate") editionsDone = false;
      if (result.oversold > 0) {
        stockWarnings.push(
          `"${m.name}" went ${result.oversold} over its edition of ${m.editionSize} — two checkouts finished at nearly the same time. Refund ${result.oversold} ${result.oversold === 1 ? "copy" : "copies"} in Stripe, or make extra.`
        );
      }
    }

    alreadyProcessed = matches.length > 0 && oneOffsDone && editionsDone;

    const missed = soldSlugs.filter((slug) => !matches.some((m) => m.slug === slug));
    if (missed.length > 0) {
      console.error("Could not find a Sanity product for slugs:", missed);
    }
  }

  if (alreadyProcessed) {
    console.log(`Session ${full.id} already handled — skipping duplicate email.`);
    return;
  }

  // Stripe moved shipping_details into collected_information.
  // Checking both keeps this working across API versions.
  const ship =
    full.collected_information?.shipping_details || full.shipping_details || null;

  const address = ship?.address
    ? [
        ship.name,
        ship.address.line1,
        ship.address.line2,
        `${ship.address.city}, ${ship.address.state} ${ship.address.postal_code}`,
        ship.address.country,
      ]
        .filter(Boolean)
        .join("\n")
    : "No shipping address — likely local pickup";

  const held = stage === "pending";

  await notify({
    form_type:
      (held ? "ORDER AWAITING YOUR APPROVAL" : "PAID Order") +
      (stockWarnings.length ? " — OVERSOLD, CHECK STOCK" : ""),
    action_needed: held
      ? "Their card is on hold — no money has moved yet. Open the Stripe link below and either Capture it to take payment, or Cancel it to release the hold and put the piece back in the shop. Card holds expire on their own after 7 days."
      : "Payment cleared. Nothing to approve — just make and ship it.",
    ...(stockWarnings.length ? { stock_warning: stockWarnings.join("\n") } : {}),
    name: full.customer_details?.name || full.metadata?.customer_name || "",
    email: full.customer_details?.email || "",
    phone: full.customer_details?.phone || "",
    amount: `${money(full.amount_total)} ${held ? "(held, not charged)" : "(charged)"}`,
    order_summary: lines,
    customer_notes: full.metadata?.order_notes || "None",
    shipping_address: address,
    approve_or_release_here: stripeLink(intentId, full.livemode),
    stripe_session: full.id,
  });

  console.log(`Order email sent for ${full.id} (${stage})`);
}

// ------------------------------------------------------------
// The artist hit Capture in Stripe — a held order became a real one.
// ------------------------------------------------------------
async function handleCaptured(event, sanity) {
  const intent = event.data.object;

  // Only pieces that were actually waiting on approval. Instant-charge
  // orders also fire this event, and they were already settled by
  // checkout.session.completed, so they match nothing here.
  const [matches, editionDocs] = await Promise.all([
    sanity.fetch(
      `*[_type == "product" && paymentIntentId == $pi && orderState == "pending"]{
         _id, name, "slug": slug.current
       }`,
      { pi: intent.id }
    ),
    pendingEditionEntries(sanity, intent.id),
  ]);

  if (matches.length === 0 && editionDocs.length === 0) return;

  const tx = sanity.transaction();
  matches.forEach((m) =>
    tx.patch(m._id, { set: { sold: true, orderState: "paid" } })
  );
  editionDocs.forEach((d) =>
    tx.patch(d._id, {
      set: Object.fromEntries(
        d.entries.map((e) => [`editionOrders[_key=="${e._key}"].state`, "paid"])
      ),
    })
  );
  await tx.commit();

  const summary = [
    ...matches.map((m) => `• ${m.name}`),
    ...editionDocs.map(
      (d) => `• ${d.name}${qtyLabel(d.entries.reduce((n, e) => n + (e.qty || 0), 0))}`
    ),
  ];

  console.log(
    `Captured ${intent.id} — marked paid:`,
    [...matches, ...editionDocs].map((m) => m.slug).join(", ")
  );

  await notify({
    form_type: "Approved order — payment captured",
    action_needed: "You approved this one in Stripe. The money is on its way to your account.",
    amount: money(intent.amount_received || intent.amount),
    order_summary: summary.join("\n"),
    stripe_payment: intent.id,
  });
}

// ------------------------------------------------------------
// The hold went away — the artist cancelled it, or the 7-day
// authorization window ran out. Put the pieces back in the shop.
// ------------------------------------------------------------
async function handleReleased(event, sanity) {
  const intent = event.data.object;

  const [matches, editionDocs] = await Promise.all([
    sanity.fetch(
      `*[_type == "product" && paymentIntentId == $pi && orderState == "pending"]{
         _id, name, "slug": slug.current
       }`,
      { pi: intent.id }
    ),
    pendingEditionEntries(sanity, intent.id),
  ]);

  if (matches.length === 0 && editionDocs.length === 0) return;

  const tx = sanity.transaction();
  matches.forEach((m) =>
    tx.patch(m._id, {
      set: { sold: false, orderState: "none" },
      unset: ["soldOrderId", "paymentIntentId", "soldAt"],
    })
  );
  // Dropping the entry from the sales log is what puts those copies
  // back on sale — the shop's count goes back up by that many.
  editionDocs.forEach((d) =>
    tx.patch(d._id, {
      unset: d.entries.map((e) => `editionOrders[_key=="${e._key}"]`),
    })
  );
  await tx.commit();

  const summary = [
    ...matches.map((m) => `• ${m.name}`),
    ...editionDocs.map(
      (d) => `• ${d.name}${qtyLabel(d.entries.reduce((n, e) => n + (e.qty || 0), 0))}`
    ),
  ];

  console.log(
    `Released ${intent.id} — back on sale:`,
    [...matches, ...editionDocs].map((m) => m.slug).join(", ")
  );

  await notify({
    form_type: "Hold released — pieces back in the shop",
    action_needed:
      "This hold was cancelled or expired, so no money changed hands and these pieces are listed for sale again. The buyer was not told — reach out if they were expecting this one.",
    reason: intent.cancellation_reason || "cancelled or expired",
    order_summary: summary.join("\n"),
    stripe_payment: intent.id,
  });
}
