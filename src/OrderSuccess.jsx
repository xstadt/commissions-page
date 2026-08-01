import { useState, useEffect, useMemo } from "react";
import { client, urlFor } from "./sanityClient";
import { Footer } from "./shared";
import { money } from "./lib";

/*
 * ========================================
 * ORDER CONFIRMATION
 * ========================================
 *
 * Where Stripe drops the customer after checkout. It asks the server
 * what actually happened rather than trusting the URL, because the
 * outcome genuinely differs:
 *
 *   charged  — money taken, piece is theirs
 *   hold     — card authorized only, artist approves before charging
 *   pending  — a slower payment method still settling
 *
 * If the lookup fails for any reason the page still reassures the
 * customer instead of showing them an error next to their money.
 */

// The signature element: a waveform that draws itself across the
// screen. Visual Frequencies — the signal came through. The shape is
// deterministic, so the same order always renders the same wave.
function wavePath(width, height, amp) {
  const steps = 130;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * width;
    // Envelope fades the amplitude to nothing at both ends so the
    // line resolves into silence rather than getting clipped.
    const env = Math.pow(Math.sin(Math.PI * t), 0.7);
    const y =
      height / 2 -
      env *
        amp *
        (Math.sin(t * 23) * 0.55 +
          Math.sin(t * 9.3 + 1.2) * 0.3 +
          Math.sin(t * 41 + 0.6) * 0.15);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return "M" + pts.join(" L");
}

function Waveform({ variant }) {
  const path = useMemo(
    () => wavePath(600, 90, variant === "hold" ? 16 : 30),
    [variant]
  );

  return (
    <svg
      className={`vfs-wave ${variant}`}
      viewBox="0 0 600 90"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--sage)" />
          <stop offset="35%" stopColor="var(--soft-teal)" />
          <stop offset="70%" stopColor="var(--lavender)" />
          <stop offset="100%" stopColor="var(--warm-gold)" />
        </linearGradient>
      </defs>
      <path d={path} pathLength="1" />
    </svg>
  );
}

export default function OrderSuccess({ result, sessionId, settings, onDone }) {
  const cancelled = result === "cancelled";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!cancelled && !!sessionId);
  const [photos, setPhotos] = useState({});

  // The order went through, so whatever is sitting in the cart is
  // stale. Clear it before they navigate anywhere else.
  useEffect(() => {
    if (cancelled) return;
    try {
      localStorage.removeItem("vfs_cart");
    } catch {
      /* private mode */
    }
  }, [cancelled]);

  useEffect(() => {
    if (cancelled || !sessionId) return;
    let stop = false;

    fetch(`/api/order-summary?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("lookup failed"))))
      .then((data) => {
        if (stop) return;
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        // Not fatal. The payment already succeeded — we just can't
        // show the itemised recap, so the page falls back to the
        // short confirmation below.
        console.error("Order lookup failed:", err);
        if (!stop) setLoading(false);
      });

    return () => {
      stop = true;
    };
  }, [cancelled, sessionId]);

  // Pull the real photos so the recap looks like the shop they just
  // came from, rather than a wall of text.
  useEffect(() => {
    const slugs = (order?.items || []).map((i) => i.slug).filter(Boolean);
    if (slugs.length === 0) return;
    let stop = false;

    client
      .fetch(`*[_type == "product" && slug.current in $slugs]{"id": slug.current, image}`, {
        slugs,
      })
      .then((rows) => {
        if (stop) return;
        setPhotos(Object.fromEntries((rows || []).map((r) => [r.id, r.image])));
      })
      .catch(() => {
        /* photos are decoration here — silence is fine */
      });

    return () => {
      stop = true;
    };
  }, [order]);

  const mode = order?.mode || (cancelled ? "cancelled" : "charged");
  const variant = mode === "hold" ? "hold" : "charged";

  // ---- copy per outcome ----
  let title, blurb;
  if (cancelled) {
    title = "Checkout cancelled";
    blurb =
      "Nothing was charged and nothing was reserved. Your cart is exactly where you left it.";
  } else if (mode === "hold") {
    title = "Hold placed";
    blurb = order?.email
      ? `Your card is authorized but hasn't been charged. We sent the details to ${order.email}.`
      : "Your card is authorized but hasn't been charged yet.";
  } else if (mode === "pending") {
    title = "Payment processing";
    blurb =
      "Your payment method takes a little longer to clear. We'll confirm by email as soon as it settles.";
  } else {
    title = "Order confirmed";
    blurb = order?.email
      ? `Payment went through. A receipt is on its way to ${order.email}.`
      : "Payment went through and a receipt is on its way to your inbox.";
  }

  const steps =
    mode === "hold"
      ? [
          {
            t: "The artist reviews it",
            d: "This piece is set aside for you in the meantime — nobody else can buy it.",
          },
          {
            t: "You get an answer within a week",
            d: "Approved, and the card is charged for the amount below. Declined, and the hold falls off on its own with nothing taken.",
          },
          {
            t: "Then it ships",
            d: "Packed by hand and sent out, with tracking to your inbox.",
          },
        ]
      : [
          {
            t: "Your receipt arrives",
            d: "Straight from Stripe, with the full breakdown.",
          },
          {
            t: "The piece gets packed",
            d: "By hand, usually within a few days.",
          },
          {
            t: "It ships to you",
            d: "You'll get tracking as soon as it's on the way.",
          },
        ];

  return (
    <div className="vfs-confirm">
      <style>{CONFIRM_CSS}</style>

      <div className="confirm-head">
        <Waveform variant={cancelled ? "hold" : variant} />

        <div className="confirm-eyebrow">
          {cancelled ? "No charge made" : mode === "hold" ? "Awaiting approval" : "Received"}
        </div>
        <h1 className="confirm-title">{title}</h1>
        <p className="confirm-blurb">{blurb}</p>

        {order?.reference && (
          <div className="confirm-ref">
            <span>Order</span>
            <code>{order.reference}</code>
          </div>
        )}
      </div>

      {loading && (
        <div className="confirm-card">
          <div className="skel-line skel-shimmer" style={{ width: "45%" }} />
          <div className="skel-line skel-shimmer" style={{ width: "70%", marginTop: 14 }} />
          <div className="skel-line skel-shimmer" style={{ width: "60%", marginTop: 14 }} />
        </div>
      )}

      {/* ---------- ORDER RECAP ---------- */}
      {!loading && order?.items?.length > 0 && (
        <div className="confirm-card">
          <div className="confirm-card-label">
            {mode === "hold" ? "Reserved for you" : "Your order"}
          </div>

          {order.items.map((item, i) => (
            <div className="confirm-line" key={i}>
              <div className="confirm-thumb">
                {photos[item.slug] ? (
                  <img
                    src={urlFor(photos[item.slug]).width(120).height(120).quality(70).auto("format").url()}
                    alt=""
                  />
                ) : (
                  "🎨"
                )}
              </div>
              <div className="confirm-line-name">{item.name}</div>
              <div className="confirm-line-amount">{money(item.amount)}</div>
            </div>
          ))}

          <div className="confirm-totals">
            <div className="confirm-total-row">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="confirm-total-row discount">
                <span>Discount</span>
                <span>−{money(order.discount)}</span>
              </div>
            )}
            <div className="confirm-total-row">
              <span>Shipping</span>
              <span>{order.shipping > 0 ? money(order.shipping) : "Free"}</span>
            </div>
            <div className="confirm-total-row grand">
              <span>{mode === "hold" ? "Held on your card" : "Total"}</span>
              <span>{money(order.total)}</span>
            </div>
          </div>

          {mode === "hold" && (
            <div className="confirm-hold-note">
              This amount is reserved on your card, not taken. You're only charged if the
              artist approves the order.
            </div>
          )}
        </div>
      )}

      {/* ---------- SHIPPING ---------- */}
      {!loading && order?.shippingTo && (
        <div className="confirm-card">
          <div className="confirm-card-label">Shipping to</div>
          <div className="confirm-address">
            {[
              order.shippingTo.name,
              order.shippingTo.line1,
              order.shippingTo.line2,
              [order.shippingTo.city, order.shippingTo.state].filter(Boolean).join(", ") +
                (order.shippingTo.postalCode ? ` ${order.shippingTo.postalCode}` : ""),
            ]
              .filter((l) => l && l.trim())
              .map((line, i) => (
                <div key={i}>{line}</div>
              ))}
          </div>
        </div>
      )}

      {/* ---------- WHAT HAPPENS NEXT ---------- */}
      {!cancelled && (
        <div className="confirm-card">
          <div className="confirm-card-label">What happens next</div>
          <ol className="confirm-steps">
            {steps.map((s, i) => (
              <li key={i}>
                <span className="confirm-step-mark">{i + 1}</span>
                <div>
                  <div className="confirm-step-title">{s.t}</div>
                  <div className="confirm-step-desc">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ---------- ACTIONS ---------- */}
      <div className="confirm-actions">
        <button className="confirm-btn primary" onClick={() => onDone("store")}>
          {cancelled ? "Back to the cart" : "Keep browsing the shop"}
        </button>
        <button className="confirm-btn" onClick={() => onDone("gallery")}>
          See the gallery
        </button>
      </div>

      {!cancelled && (
        <p className="confirm-help">
          Questions about this order?{" "}
          {settings?.contactEmail ? (
            <a href={`mailto:${settings.contactEmail}?subject=Order ${order?.reference || ""}`}>
              Email us
            </a>
          ) : (
            "Send a note through the Commissions page"
          )}
          {order?.reference ? ` and quote ${order.reference}.` : "."}
        </p>
      )}

      <Footer settings={settings} />
    </div>
  );
}

const CONFIRM_CSS = `
.vfs-confirm { animation: fadeUp 0.35s ease; }

.confirm-head { text-align: center; margin-bottom: 36px; }

/* ---- the signature waveform ---- */
.vfs-wave {
  width: 100%; height: 90px; display: block; margin: 0 auto 8px;
  overflow: visible;
}
.vfs-wave path {
  fill: none;
  stroke: url(#waveGrad);
  stroke-width: 2.5;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: waveDraw 1.5s cubic-bezier(0.4, 0, 0.15, 1) forwards;
}
.vfs-wave.hold path { animation: waveDraw 1.5s cubic-bezier(0.4,0,0.15,1) forwards, wavePulse 2.8s ease-in-out 1.5s infinite; }
@keyframes waveDraw { to { stroke-dashoffset: 0; } }
@keyframes wavePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }

.confirm-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: 3px;
  text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px;
}
.confirm-title {
  font-size: clamp(30px, 7vw, 44px); font-weight: 800;
  letter-spacing: -1px; line-height: 1.1; margin-bottom: 14px;
}
.confirm-blurb {
  color: var(--text-dim); font-size: 15px; line-height: 1.75;
  font-weight: 300; max-width: 440px; margin: 0 auto;
}
.confirm-ref {
  display: inline-flex; align-items: center; gap: 10px; margin-top: 22px;
  padding: 7px 8px 7px 16px; border-radius: 99px;
  border: 1px solid var(--border); background: var(--surface);
}
.confirm-ref span {
  font-size: 10px; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: var(--text-dim);
}
.confirm-ref code {
  font-family: 'Inter', monospace; font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; color: var(--text);
  background: var(--bg); padding: 5px 12px; border-radius: 99px;
}

/* ---- cards ---- */
.confirm-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 24px; margin-bottom: 16px;
}
.confirm-card-label {
  font-size: 11px; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: var(--text-dim); margin-bottom: 18px;
}

.confirm-line {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 0; border-bottom: 1px solid var(--border);
}
.confirm-line:last-of-type { border-bottom: none; }
.confirm-thumb {
  width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(145deg, #1e1b17, #141210);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: var(--border); overflow: hidden;
}
.confirm-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.confirm-line-name { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; line-height: 1.4; }
.confirm-line-amount { font-size: 14px; font-weight: 700; color: var(--sage); flex-shrink: 0; }

.confirm-totals { border-top: 1px solid var(--border); margin-top: 12px; padding-top: 14px; }
.confirm-total-row {
  display: flex; justify-content: space-between; gap: 12px;
  font-size: 13px; color: var(--text-dim); padding: 5px 0; font-weight: 400;
}
.confirm-total-row.discount span:last-child { color: var(--sage); }
.confirm-total-row.grand {
  font-size: 16px; font-weight: 800; color: var(--text);
  border-top: 1px solid var(--border); margin-top: 10px; padding-top: 14px;
}
.confirm-hold-note {
  margin-top: 16px; padding: 13px 15px; border-radius: 12px;
  background: rgba(219,192,120,0.08); border: 1px solid rgba(219,192,120,0.28);
  font-size: 12.5px; line-height: 1.65; color: var(--text-dim); font-weight: 300;
}

.confirm-address {
  font-size: 14px; line-height: 1.7; color: var(--text-dim); font-weight: 300;
}
.confirm-address div:first-child { color: var(--text); font-weight: 500; }

/* ---- next steps: a real sequence, so it's numbered ---- */
.confirm-steps { list-style: none; margin: 0; padding: 0; }
.confirm-steps li {
  display: flex; gap: 16px; padding: 14px 0;
  border-bottom: 1px solid var(--border);
}
.confirm-steps li:last-child { border-bottom: none; padding-bottom: 0; }
.confirm-step-mark {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  border: 1.5px solid var(--border); color: var(--text-dim);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; margin-top: 1px;
}
.confirm-step-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.confirm-step-desc { font-size: 13px; line-height: 1.7; color: var(--text-dim); font-weight: 300; }

/* ---- actions ---- */
.confirm-actions { display: flex; gap: 10px; margin-top: 24px; flex-wrap: wrap; }
.confirm-btn {
  flex: 1 1 160px; padding: 15px 20px; border-radius: 99px; cursor: pointer;
  font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px;
  letter-spacing: 1px; text-transform: uppercase;
  border: 1.5px solid var(--border); background: transparent; color: var(--text-dim);
  transition: border-color 0.15s, color 0.15s, filter 0.2s;
}
.confirm-btn:hover { border-color: var(--text-dim); color: var(--text); }
.confirm-btn.primary {
  border: none; color: var(--bg);
  background: linear-gradient(135deg, var(--sage), var(--soft-teal), var(--lavender));
}
.confirm-btn.primary:hover { filter: brightness(1.1); color: var(--bg); }

.confirm-help {
  text-align: center; margin-top: 22px;
  font-size: 12.5px; color: var(--text-dim); font-weight: 300; line-height: 1.7;
}
.confirm-help a { color: var(--sage); text-decoration: none; font-weight: 500; }
.confirm-help a:hover { text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .vfs-confirm { animation: none; }
  .vfs-wave path, .vfs-wave.hold path { animation: none; stroke-dashoffset: 0; }
}
`;
