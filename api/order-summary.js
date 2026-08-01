// ============================================================
// /api/order-summary.js
//
// Feeds the confirmation page. The browser comes back from Stripe
// holding a checkout session id, and asks us what actually happened.
//
// Read-only, and it hands back nothing the buyer didn't just type
// in themselves two screens ago. Session ids are long and random,
// so possessing one is treated as proof you placed the order.
// ============================================================

import Stripe from "stripe";

// Local development only - see the note in create-checkout-session.js
if (!process.env.VERCEL) {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local" });
  } catch { /* dotenv not installed in production - fine */ }
}

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export async function GET(request) {
  try {
    const stripe = getStripe();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id");

    // Cheap sanity check before spending a Stripe call on it.
    if (!sessionId || !/^cs_[A-Za-z0-9_]{10,120}$/.test(sessionId)) {
      return Response.json({ error: "Missing or malformed order reference." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "line_items.data.price.product", "payment_intent"],
    });

    const intent = session.payment_intent;
    const intentStatus = typeof intent === "object" ? intent?.status : null;

    // "hold"    -> card authorized, artist approves before any charge
    // "charged" -> money already taken
    // "pending" -> a slower payment method still settling
    let mode = "charged";
    if (intentStatus === "requires_capture") mode = "hold";
    else if (intentStatus !== "succeeded" && session.payment_status !== "paid") mode = "pending";

    const items = (session.line_items?.data || []).map((li) => ({
      name: li.price?.product?.name || li.description || "Item",
      slug: li.price?.product?.metadata?.sanity_slug || null,
      amount: li.amount_total ?? 0,
    }));

    const ship =
      session.collected_information?.shipping_details || session.shipping_details || null;

    // The last chunk of the session id, which is unique enough to
    // quote in an email and short enough to read out loud.
    const reference = `VFS-${sessionId.slice(-8).toUpperCase()}`;

    return Response.json({
      reference,
      mode,
      email: session.customer_details?.email || null,
      name: session.customer_details?.name || session.metadata?.customer_name || null,
      currency: session.currency || "usd",
      subtotal: session.amount_subtotal ?? 0,
      shipping: session.total_details?.amount_shipping ?? 0,
      discount: session.total_details?.amount_discount ?? 0,
      total: session.amount_total ?? 0,
      items,
      shippingTo: ship?.address
        ? {
            name: ship.name || null,
            line1: ship.address.line1 || null,
            line2: ship.address.line2 || null,
            city: ship.address.city || null,
            state: ship.address.state || null,
            postalCode: ship.address.postal_code || null,
          }
        : null,
    });
  } catch (err) {
    // An unknown id is a 404 from Stripe, not a server fault.
    if (err?.statusCode === 404 || err?.code === "resource_missing") {
      return Response.json({ error: "We couldn't find that order." }, { status: 404 });
    }
    console.error("Order summary lookup failed:", err);
    return Response.json({ error: "Couldn't load your order details." }, { status: 500 });
  }
}
