// ============================================================
// /api/_inventory.js
//
// Stock math shared by checkout and the webhook. The leading
// underscore tells Vercel this is a helper, not an endpoint.
//
// Two kinds of product live in the shop:
//
//   ONE-OF-ONE   editionSize is blank. Availability is the old
//                `sold` switch, exactly as before.
//
//   EDITION      editionSize is a number (15, 100, ...). Every sale
//                or card hold is logged in `editionOrders`, and what's
//                left is editionSize minus everything in that log.
//                `sold` still works as a manual "pull it from the
//                shop" switch, but the webhook never touches it.
//
// src/lib.js has a browser copy of editionRemaining(). Keep the two
// in step.
// ============================================================

export function isEdition(p) {
  return typeof p?.editionSize === "number" && p.editionSize >= 1;
}

// Units spoken for: paid orders plus card holds still waiting on
// the artist. A hold has to count, or the same unit could be sold to
// someone else while the artist is deciding.
export function unitsTaken(p) {
  return (p?.editionOrders || []).reduce(
    (sum, o) => sum + (o.state === "pending" || o.state === "paid" ? o.qty || 0 : 0),
    0
  );
}

// How many a shopper could still buy right now.
export function editionRemaining(p) {
  if (!isEdition(p)) return p?.sold ? 0 : 1;
  if (p.sold) return 0;
  return Math.max(0, p.editionSize - unitsTaken(p));
}

// Sanity array items need a _key. Built from the Stripe session and
// the product so a re-delivered webhook produces the same key.
export function orderKey(sessionId, slug) {
  const tail = String(sessionId).replace(/[^A-Za-z0-9]/g, "").slice(-16);
  const s = String(slug).replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
  return `o${tail}${s}`;
}
