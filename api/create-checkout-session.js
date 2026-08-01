// ============================================================
// /api/create-checkout-session.js
//
// Runs on Vercel's servers, NOT in the customer's browser.
// This is the only place the Stripe secret key is ever touched.
//
// Every piece here is one-of-one and already made — there's no
// palette to pick and no quantity to choose. The browser only
// tells us WHICH pieces. We look up the price, the availability,
// and the payment mode ourselves, so nobody can tamper with the
// total, buy something that's already gone, or downgrade an
// "ask me first" item into an instant charge.
// ============================================================

import Stripe from "stripe";
import { createClient } from "@sanity/client";

// Local development only: `vercel dev` does not reliably inject
// .env.local into the function process, so we load it ourselves.
// On the real Vercel servers there is no .env.local file and the
// real environment variables are already set, so this does nothing.
if (!process.env.VERCEL) {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local" });
  } catch { /* dotenv not installed in production - fine */ }
}

// useCdn: false means a price change in Sanity Studio takes effect
// immediately rather than being cached for a few minutes.
const sanity = createClient({
  projectId: "uo61beyo",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});

const MAX_LINES = 20; // max distinct pieces in one order

// Fallbacks used only if Site Settings hasn't been filled in yet.
const DEFAULT_SHIPPING_USD = 8;

// Built on the first request instead of at import time. Creating it at
// the top of the file meant a missing key crashed the whole module
// before any code could run, producing an unreadable "socket hang up"
// instead of a real error message.
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export async function POST(request) {
  try {
    const stripe = getStripe();
    const { items, customer } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Your cart is empty." }, { status: 400 });
    }
    if (items.length > MAX_LINES) {
      return Response.json(
        { error: "Too many different items in one order." },
        { status: 400 }
      );
    }

    // Reject up front if the same piece was sent twice — a one-of-one
    // item can't be bought as "quantity 2". Cheaper to check before we
    // hit Sanity.
    const rawIds = items.map((i) => String(i.id));
    if (new Set(rawIds).size !== rawIds.length) {
      return Response.json(
        { error: "One of these pieces is listed twice — please refresh your cart." },
        { status: 400 }
      );
    }

    // ---- 1. Look up the REAL product data from Sanity -------------
    const [products, settings] = await Promise.all([
      sanity.fetch(
        `*[_type == "product" && slug.current in $ids]{
           "id": slug.current, name, size, price, sold, orderState, paymentMode,
           "category": category->title
         }`,
        { ids: rawIds }
      ),
      sanity.fetch(
        `*[_type == "siteSettings"][0]{ shippingRateUsd, localPickupEnabled }`
      ),
    ]);

    const byId = Object.fromEntries(products.map((p) => [p.id, p]));

    // ---- 2. Rebuild the order from trusted data -----------------
    const line_items = [];
    const summaryLines = [];
    const slugs = [];
    let needsApproval = false;

    for (const item of items) {
      const p = byId[String(item.id)];

      if (!p) {
        return Response.json(
          { error: "One of these pieces is no longer available." },
          { status: 400 }
        );
      }
      if (p.sold) {
        const gone =
          p.orderState === "pending"
            ? `Sorry — "${p.name}" is on hold for someone else. Please remove it from your cart.`
            : `Sorry — "${p.name}" just sold. Please remove it from your cart.`;
        return Response.json({ error: gone }, { status: 409 });
      }
      if (typeof p.price !== "number" || p.price <= 0) {
        return Response.json(
          { error: "Pricing is being updated. Please try again shortly." },
          { status: 400 }
        );
      }

      // The artist decides per product whether the card gets charged
      // straight away or only held. This comes from Sanity, never from
      // the browser.
      if (p.paymentMode === "approval") needsApproval = true;

      // Every piece is one-of-one - quantity is always exactly 1.
      // The Sanity slug rides along in metadata so the webhook can
      // mark the right piece sold without guessing from the name.
      const subtitle = [p.category, p.size].filter(Boolean).join(" · ");

      line_items.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(p.price * 100), // Stripe works in cents
          product_data: {
            name: p.size ? `${p.name} — ${p.size}` : p.name,
            description: subtitle
              ? `${subtitle} · One-of-one, handmade piece.`
              : "One-of-one, handmade piece.",
            metadata: { sanity_slug: p.id },
          },
        },
      });

      summaryLines.push(p.size ? `${p.name} (${p.size})` : p.name);
      slugs.push(p.id);
    }

    // ---- 3. Shipping options (editable in Site Settings) ---------
    const shippingUsd =
      typeof settings?.shippingRateUsd === "number" && settings.shippingRateUsd >= 0
        ? settings.shippingRateUsd
        : DEFAULT_SHIPPING_USD;

    const shipping_options = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: Math.round(shippingUsd * 100), currency: "usd" },
          display_name: shippingUsd === 0 ? "Free Shipping" : "Standard Shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 14 },
          },
        },
      },
    ];

    if (settings?.localPickupEnabled !== false) {
      shipping_options.push({
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
          display_name: "Local pickup / hand delivery",
        },
      });
    }

    // ---- 4. Create the Checkout Session --------------------------
    const siteUrl =
      process.env.SITE_URL || "https://visualfrequenciesstudios.com";

    const sessionArgs = {
      mode: "payment",
      line_items,

      customer_email: customer?.email || undefined,

      success_url: `${siteUrl}/?order=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?order=cancelled`,

      // Physical goods, so we need to know where it's going
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options,

      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,

      // IMPORTANT for one-of-one stock: a Checkout Session lasts 24 hours
      // by default, and Stripe does NOT re-check availability when the
      // customer finally pays. That means an abandoned tab could sit on a
      // piece for a full day and then buy it out from under someone.
      // 30 minutes is the shortest Stripe allows, and it shrinks that
      // window to something realistically harmless.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,

      // Only switch this on after Stripe Tax is configured in the dashboard
      automatic_tax: { enabled: false },

      // Metadata shows up on the payment in the Stripe dashboard
      metadata: {
        source: "visualfrequenciesstudios.com",
        order_mode: needsApproval ? "hold" : "charge",
        customer_name: String(customer?.name || "").slice(0, 100),
        order_notes: String(customer?.notes || "").slice(0, 480),
        order_summary: summaryLines.join(" | ").slice(0, 480),
        sanity_slugs: slugs.join(",").slice(0, 480),
      },
    };

    // ---- 5. Charge now, or just place a hold? --------------------
    //
    // If ANY piece in the cart is marked "Ask me first", the whole
    // order is authorized rather than captured. Stripe sets capture
    // behaviour per payment, not per line item, so a mixed cart has to
    // pick one — and holding is the safe direction to round toward.
    // Nobody's card gets charged for something the artist hasn't
    // agreed to make or ship.
    //
    // Manual capture only works with cards, so we pin the payment
    // method types rather than letting Stripe offer wallets and
    // bank debits that can't be held.
    if (needsApproval) {
      sessionArgs.payment_method_types = ["card"];
      sessionArgs.payment_intent_data = {
        capture_method: "manual",
        description: `Pending approval — ${summaryLines.join(", ")}`.slice(0, 350),
        metadata: { order_mode: "hold", sanity_slugs: slugs.join(",").slice(0, 480) },
      };
    } else {
      sessionArgs.payment_intent_data = {
        description: summaryLines.join(", ").slice(0, 350),
        metadata: { order_mode: "charge", sanity_slugs: slugs.join(",").slice(0, 480) },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionArgs);

    return Response.json({ url: session.url, mode: needsApproval ? "hold" : "charge" });
  } catch (err) {
    console.error("Checkout session failed:", err);

    // Configuration problems should be obvious while developing,
    // not disguised as a generic customer-facing error.
    if (err.message === "STRIPE_SECRET_KEY is not set") {
      return Response.json(
        { error: "Server is missing its Stripe key. Check the environment variables." },
        { status: 500 }
      );
    }

    return Response.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
