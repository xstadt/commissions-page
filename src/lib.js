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
