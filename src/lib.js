// ==========================================
// SHARED HELPERS
//
// Plain values and functions used across more than one page.
// Kept apart from shared.jsx (which holds shared components) so
// React's fast refresh keeps working during `npm run dev`.
// ==========================================

// Formspree endpoint — handles commissions and order notifications.
// A hidden form_type field tells them apart in the inbox.
export const FORMSPREE_ENDPOINT = "https://formspree.io/f/mgodnbvr";

// Concept review feedback goes to its own Formspree form, so a busy
// month in the store can't use up the allowance that client feedback
// needs. Create a second form in Formspree and paste its endpoint here.
// Until you do, feedback falls back to the main form above.
export const CONCEPT_FORMSPREE_ENDPOINT = "https://formspree.io/f/xjyvvdzp";

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Stripe reports amounts in cents.
export function money(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

// ---- Stock ----
// A product with an editionSize is a run of matching pieces sold from
// one listing; without one it's a one-of-one. api/_inventory.js holds
// the server's copy of this math — keep the two in step.
export function isEdition(p) {
  return typeof p?.editionSize === "number" && p.editionSize >= 1;
}

// How many a shopper could still buy. One-of-ones are 1 or 0.
// For editions, paid orders AND card holds both count as taken.
export function editionRemaining(p) {
  if (!isEdition(p)) return p?.sold ? 0 : 1;
  if (p.sold) return 0;
  const taken = (p.editionOrders || []).reduce(
    (sum, o) => sum + (o.state === "pending" || o.state === "paid" ? o.qty || 0 : 0),
    0
  );
  return Math.max(0, p.editionSize - taken);
}

// Loading placeholders, injected once at App level.
export const SKELETON_CSS = `
.skel-shimmer {
  background: var(--border);
  animation: skelPulse 1.5s ease-in-out infinite;
}
.skel-line { height: 12px; border-radius: 6px; }
@keyframes skelPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.65; } }
@media (prefers-reduced-motion: reduce) { .skel-shimmer { animation: none; } }
`;
