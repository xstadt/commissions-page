import { useState, useEffect, useCallback, useRef } from "react";
import logo from "./logo.png";
import artistPortrait from "./artist-portrait.JPG";
import family1 from "./family1.jpg";
import familybw from "./familybw.jpg";
import studio1 from "./studio1.jpg";

/*
 * ========================================
 * VISUAL FREQUENCIES STUDIOS — V7
 * ========================================
 *
 * CHANGES FROM V6:
 * - Quick-add controls: moved to bottom-right of image, squircle shape, more padding
 * - Mobile: persistent + button visible on touch devices (no hover needed)
 * - "In cart" indicator on product cards showing qty per color
 * - Subtle hover effects on all action buttons
 * - Scroll to top on tab switch
 * - Dynamic copyright year
 * - Various polish
 */

const COMMISSION_STATUS = "open";

// Formspree endpoint — handles both commissions and bottle orders.
// A hidden form_type field tells them apart in your inbox.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mgodnbvr";

// ==========================================
// PRODUCT CATALOG
// ==========================================
const PRODUCTS = [
  {
    id: "classic-18",
    name: "The Daily",
    size: "18 oz",
    price: 45,
    description: "Compact everyday carry. Perfect for coffee-table size — fits in any bag, cupholder, or hand. Great for a single design motif or tight composition.",
    colors: ["Sage Wash", "Dusty Rose", "Deep Indigo"],
  },
{
  id: "classic-24",
  name: "The Standard",
  size: "24 oz",
  price: 55,
  description: "The most popular size. Enough surface for a full wraparound scene without being too bulky. The sweet spot for most custom work.",
  colors: ["Sage Wash", "Dusty Rose", "Deep Indigo", "Warm Gold"],
},
{
  id: "classic-32",
  name: "The Statement",
  size: "32 oz",
  price: 65,
  description: "More room to work with — ideal for detailed scenes, full band artwork, or layered compositions that need breathing room.",
  colors: ["Sage Wash", "Dusty Rose", "Deep Indigo", "Warm Gold"],
},
{
  id: "classic-40",
  name: "The Canvas",
  size: "40 oz",
  price: 75,
  description: "Maximum surface area for maximum expression. A true walking art piece. Best for elaborate, multi-element designs.",
  colors: ["Sage Wash", "Dusty Rose", "Deep Indigo", "Warm Gold", "Midnight"],
},
];

// ==========================================
// HELPERS
// ==========================================

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 99, padding: "10px 22px", fontSize: 13, fontWeight: 600,
          color: "var(--sage)", zIndex: 999, animation: "toastIn 0.25s ease",
          whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          fontFamily: "'Inter', sans-serif",
    }}>{message}</div>
  );
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: 64, paddingTop: 32, paddingBottom: 24, textAlign: "center" }}>
    <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
    {["Instagram", "TikTok", "Email"].map((label) => (
      <a key={label} href="#" style={{ color: "var(--text-dim)", fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "color 0.15s" }}
      onMouseEnter={e => e.target.style.color = "var(--text)"}
      onMouseLeave={e => e.target.style.color = "var(--text-dim)"}>{label}</a>
    ))}
    </div>
    <div style={{ fontSize: 12, color: "#5a5047", fontWeight: 300 }}>
    © {new Date().getFullYear()} Visual Frequencies Studios · All pieces are original handpainted works
    </div>
    </footer>
  );
}

// ==========================================
// PAGE: COMMISSIONS
// ==========================================

function CommissionsPage() {
  const [form, setForm] = useState({ name: "", email: "", description: "", size: "", timeline: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [errors, setErrors] = useState({});

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleSubmit = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!validateEmail(form.email)) errs.email = "Invalid email";
    if (!form.description.trim()) errs.description = "Tell us about your idea";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          form_type: "Commission Request",
            name: form.name,
            email: form.email,
            size_or_format: form.size || "Not specified",
            timeline: form.timeline || "Flexible",
            description: form.description,
        }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setSubmitError("Something went wrong. Please try again or email us directly.");
      }
    } catch {
      setSubmitError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className={`status ${COMMISSION_STATUS}`}>
    <span className="status-dot" />
    {COMMISSION_STATUS === "open" ? "Currently Accepting Work" : "On a Break"}
    </div>
    <div className="hero">
    <h1 className="hero-title">Visual Frequencies<br /><span className="flow">Studios</span></h1>
    <p className="hero-sub">
    Original handpainted mixed media art — made by a fan, for fans.
    From <em>gig posters</em> and <em>album art</em> to <em>prints
    and promotional pieces</em>, every commission is a one-of-a-kind original created from scratch.
    </p>
    </div>
    <section>
    <div className="section-label" style={{ color: "var(--lavender)" }}>~ the work</div>
    <div className="card">
    <p>Every piece is <strong>handpainted mixed media</strong> with a faded psychedelic aesthetic — soft washes, natural color bleeds, and muted tones with a tie-dye warmth. No two pieces come out the same, and that's by design.</p>
    <div className="tag-row">
    <span className="tag">Posters</span><span className="tag">Prints</span>
    <span className="tag">Promo Art</span><span className="tag">Album Covers</span>
    <span className="tag">Whatever You Have in Mind</span>
    </div>
    </div>
    </section>
    <section>
    <div className="section-label" style={{ color: "var(--sage)" }}>~ the process</div>
    <div className="steps">
    {[
      { t: "Reach Out", d: "Fill out the form below with your idea." },
      { t: "Brainstorming Sketch", d: "We'll explore directions and put together initial concepts." },
      { t: "Boring Business Stuff", d: "Timeline, sizing, usage — we get on the same page." },
      { t: "Sketch / Design Approval", d: "You see a refined sketch before final work begins." },
      { t: "Paint & Deliver", d: "Once approved, I bring it to life." },
    ].map((s, i) => (
      <div className="step" key={i}>
      <div className="step-num">{i + 1}</div>
      <div><div className="step-title">{s.t}</div><div className="step-desc">{s.d}</div></div>
      </div>
    ))}
    </div>
    </section>
    <section>
    <div className="section-label" style={{ color: "var(--dusty-rose)" }}>~ request a commission</div>
    {sent ? (
      <div className="form-wrap success">
      <div className="success-icon">🌿</div>
      <div className="success-title">Request received!</div>
      <div className="success-msg">I'll follow up soon. Keep an eye on your inbox.</div>
      </div>
    ) : (
      <div className="form-wrap">
      <div className="form-grid">
      <div className="field">
      <label>Name {errors.name && <span className="field-error">{errors.name}</span>}</label>
      <input className={errors.name ? "input-error" : ""} placeholder="Your name" value={form.name} onChange={update("name")} />
      </div>
      <div className="field">
      <label>Email {errors.email && <span className="field-error">{errors.email}</span>}</label>
      <input className={errors.email ? "input-error" : ""} type="email" placeholder="Where to reach you" value={form.email} onChange={update("email")} />
      </div>
      </div>
      <div className="form-grid">
      <div className="field"><label>Size or Format</label><input placeholder="e.g. 11x14 print, poster" value={form.size} onChange={update("size")} /></div>
      <div className="field"><label>Timeline</label><input placeholder="Any deadline, or flexible" value={form.timeline} onChange={update("timeline")} /></div>
      </div>
      <div className="field" style={{ marginBottom: 16 }}>
      <label>Describe Your Idea {errors.description && <span className="field-error">{errors.description}</span>}</label>
      <textarea className={errors.description ? "input-error" : ""} placeholder="Subject, colors, mood, intended use — the more detail the better." value={form.description} onChange={update("description")} />
      </div>
      {submitError && (
        <div style={{ color: "var(--dusty-rose)", fontSize: 13, marginBottom: 12, fontWeight: 500 }}>
        {submitError}
        </div>
      )}
      <button className="submit-btn" onClick={handleSubmit} disabled={submitting}
      style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
      {submitting ? "Sending..." : "Submit Request"}
      </button>
      </div>
    )}
    </section>
    <Footer />
    </>
  );
}


// ==========================================
// PAGE: WATER BOTTLES
// ==========================================

function WaterBottlePage() {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: "", email: "", notes: "" });
  const [checkoutErrors, setCheckoutErrors] = useState({});
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutSubmitError, setCheckoutSubmitError] = useState(null);
  const [toast, setToast] = useState(null);
  const [quickCounts, setQuickCounts] = useState({});
  const [pendingQuickAdd, setPendingQuickAdd] = useState(null);
  const [mobileActiveCard, setMobileActiveCard] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(null);
    setTimeout(() => setToast(msg), 30);
  }, []);

  const addToCart = (product, color, note, qty = 1) => {
    const item = {
      ...product, cartId: Date.now() + Math.random(),
      selectedColor: color, customNote: note, qty,
    };
    setCart((prev) => [...prev, item]);
    setSelectedProduct(null);
    showToast(`${product.name} × ${qty} added`);
  };

  const removeFromCart = (cartId) => setCart((prev) => prev.filter((i) => i.cartId !== cartId));

  const updateCartQty = (cartId, delta) => {
    setCart((prev) => prev.map((item) => {
      if (item.cartId !== cartId) return item;
      const newQty = item.qty + delta;
      return newQty < 1 ? item : { ...item, qty: newQty };
    }));
  };

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const getCartSummary = (productId) => {
    const items = cart.filter((i) => i.id === productId);
    if (items.length === 0) return null;
    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
    const byColor = {};
    items.forEach((i) => {
      byColor[i.selectedColor] = (byColor[i.selectedColor] || 0) + i.qty;
    });
    return { totalQty, byColor, items };
  };

  const quickIncrement = (productId) => {
    setQuickCounts((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };
  const quickDecrement = (productId) => {
    setQuickCounts((prev) => {
      const val = (prev[productId] || 0) - 1;
      if (val <= 0) { const copy = { ...prev }; delete copy[productId]; return copy; }
      return { ...prev, [productId]: val };
    });
  };
  const quickAddToCart = (product) => {
    const qty = quickCounts[product.id] || 1;
    setPendingQuickAdd({ product, qty });
  };
  const finalizePendingAdd = (color, note) => {
    if (!pendingQuickAdd) return;
    addToCart(pendingQuickAdd.product, color, note, pendingQuickAdd.qty);
    setQuickCounts((prev) => { const copy = { ...prev }; delete copy[pendingQuickAdd.product.id]; return copy; });
    setPendingQuickAdd(null);
    setCartOpen(true);
  };

  const handleCheckout = async () => {
    const errs = {};
    if (!checkoutForm.name.trim()) errs.name = "Required";
    if (!checkoutForm.email.trim()) errs.email = "Required";
    else if (!validateEmail(checkoutForm.email)) errs.email = "Invalid email";
    if (Object.keys(errs).length > 0) { setCheckoutErrors(errs); return; }

    setCheckoutSubmitting(true);
    setCheckoutSubmitError(null);

    const cartSummary = cart.map((item) =>
    `• ${item.name} (${item.size}) × ${item.qty} — ${item.selectedColor}${item.customNote ? ` — "${item.customNote}"` : ""} — $${item.price * item.qty}`
    ).join("\n");

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          form_type: "Bottle Order Request",
            name: checkoutForm.name,
            email: checkoutForm.email,
            order_total: `$${cartTotal}`,
            order_summary: cartSummary,
            notes: checkoutForm.notes || "None",
        }),
      });
      if (res.ok) {
        setOrderSent(true);
      } else {
        setCheckoutSubmitError("Something went wrong. Please try again.");
      }
    } catch {
      setCheckoutSubmitError("Network error — check your connection and try again.");
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handlePageClick = () => { if (mobileActiveCard) setMobileActiveCard(null); };

  return (
    <div onClick={handlePageClick}>
    <style>{`
      .shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
      @media (max-width: 480px) { .shop-grid { grid-template-columns: 1fr; } }

      .product-card {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 16px; overflow: hidden; cursor: pointer;
        transition: all 0.25s ease; position: relative;
      }
      .product-card:hover { border-color: var(--text-dim); transform: translateY(-2px); }
      .product-img-wrap {
        width: 100%; aspect-ratio: 1/1; position: relative; overflow: hidden;
        background: linear-gradient(145deg, #1e1b17, #141210);
      }
      .product-img-wrap::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(143,173,139,0.06) 0%, rgba(184,165,204,0.06) 50%, rgba(212,160,160,0.06) 100%);
        pointer-events: none;
      }
      .product-img-emoji {
        width: 100%; height: 100%; display: flex;
        align-items: center; justify-content: center;
        font-size: 40px; color: var(--border);
      }
      .product-info { padding: 16px; }
      .product-name { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
      .product-meta { display: flex; justify-content: space-between; align-items: center; }
      .product-size { font-size: 13px; color: var(--text-dim); }
      .product-price { font-size: 15px; font-weight: 700; color: var(--sage); }

      .in-cart-badge {
        position: absolute; top: 12px; left: 12px; z-index: 6;
        display: flex; flex-direction: column; gap: 4px;
      }
      .in-cart-pill {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px; border-radius: 8px;
        background: rgba(14,13,11,0.8); backdrop-filter: blur(8px);
        border: 1px solid rgba(143,173,139,0.3);
        font-size: 11px; font-weight: 600; color: var(--sage);
        font-family: 'Inter', sans-serif; white-space: nowrap;
      }
      .in-cart-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--sage); flex-shrink: 0;
      }

      .qa-wrap {
        position: absolute; bottom: 12px; right: 12px; z-index: 5;
        display: flex; align-items: center; gap: 6px;
        opacity: 0; transition: opacity 0.2s ease;
        pointer-events: none;
      }
      .product-card:hover .qa-wrap { opacity: 1; pointer-events: auto; }
      .qa-wrap.mobile-visible { opacity: 1; pointer-events: auto; }

      .qa-btn {
        width: 38px; height: 38px; border-radius: 10px;
        background: rgba(14,13,11,0.85); backdrop-filter: blur(8px);
        border: 1px solid var(--border); color: var(--text-dim);
        font-size: 18px; cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        transition: all 0.15s; font-family: 'Inter', sans-serif; font-weight: 600;
      }
      .qa-btn:hover { border-color: var(--sage); color: var(--text); }
      .qa-count {
        min-width: 24px; text-align: center; font-size: 15px;
        font-weight: 700; color: var(--text); font-family: 'Inter', sans-serif;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
      }
      .qa-cart-btn {
        height: 38px; padding: 0 16px; border-radius: 10px;
        background: var(--sage); border: none; color: var(--bg);
        font-size: 12px; font-weight: 700; cursor: pointer;
        display: flex; align-items: center; gap: 5px;
        font-family: 'Inter', sans-serif; letter-spacing: 0.5px;
        transition: all 0.15s;
      }
      .qa-cart-btn:hover { filter: brightness(1.1); }

      .mobile-add-btn {
        display: none; position: absolute; bottom: 12px; right: 12px; z-index: 5;
        width: 38px; height: 38px; border-radius: 10px;
        background: rgba(14,13,11,0.85); backdrop-filter: blur(8px);
        border: 1px solid var(--border); color: var(--text-dim);
        font-size: 20px; cursor: pointer; align-items: center;
        justify-content: center; font-family: 'Inter', sans-serif;
        font-weight: 600; transition: all 0.15s;
      }
      @media (hover: none) {
        .mobile-add-btn { display: flex; }
        .qa-wrap { opacity: 0; pointer-events: none; }
        .qa-wrap.mobile-visible { opacity: 1; pointer-events: auto; }
      }

      .cart-fab {
        position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
        border-radius: 16px; background: #0e0d0b;
        border: 1px solid rgba(255,255,255,0.1); cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; color: var(--text); box-shadow: 0 4px 24px rgba(0,0,0,0.6);
        z-index: 100; transition: transform 0.2s, filter 0.2s;
      }
      .cart-fab:hover { transform: scale(1.06); filter: brightness(1.3); }
      .cart-badge {
        position: absolute; top: -4px; right: -4px; min-width: 22px; height: 22px;
        border-radius: 99px; padding: 0 5px; background: var(--dusty-rose); color: white;
        font-size: 11px; font-weight: 700; display: flex; align-items: center;
        justify-content: center; font-family: 'Inter', sans-serif;
      }

      .overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        backdrop-filter: blur(4px); z-index: 200;
        display: flex; align-items: center; justify-content: center;
        animation: overlayIn 0.2s ease;
      }
      @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

      .product-modal {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 20px; width: 90%; max-width: 480px;
        max-height: 90vh; overflow-y: auto; animation: modalSlideUp 0.3s ease;
        scrollbar-width: thin; scrollbar-color: var(--border) transparent;
      }
      @keyframes modalSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      .modal-img-placeholder {
        width: 100%; aspect-ratio: 4/3;
        background: linear-gradient(145deg, #1e1b17, #141210);
        display: flex; align-items: center; justify-content: center;
        color: var(--border); font-size: 56px; border-radius: 20px 20px 0 0;
        position: relative; overflow: hidden;
      }
      .modal-img-placeholder::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(143,173,139,0.08) 0%, rgba(184,165,204,0.08) 50%, rgba(212,160,160,0.08) 100%);
      }
      .modal-body { padding: 24px; }
      .modal-close {
        position: absolute; top: 16px; right: 16px; width: 36px; height: 36px;
        border-radius: 10px; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.1); color: var(--text);
        font-size: 18px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; z-index: 10; transition: border-color 0.15s;
      }
      .modal-close:hover { border-color: rgba(255,255,255,0.3); }
      .modal-title { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
      .modal-size-price { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .modal-size { font-size: 14px; color: var(--text-dim); }
      .modal-price { font-size: 20px; font-weight: 800; color: var(--sage); }
      .modal-desc { font-size: 14px; line-height: 1.7; color: var(--text-dim); font-weight: 300; margin-bottom: 24px; }
      .modal-section-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px; }
      .color-options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
      .color-chip {
        padding: 8px 16px; border-radius: 99px; font-size: 13px; font-weight: 500;
        border: 1.5px solid var(--border); background: transparent; color: var(--text-dim);
        cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
      }
      .color-chip:hover { border-color: var(--text-dim); }
      .color-chip.selected { border-color: var(--sage); color: var(--text); background: rgba(143,173,139,0.1); }
      .modal-note-input {
        width: 100%; background: var(--bg); border: 1.5px solid var(--border);
        border-radius: 12px; padding: 12px 14px; color: var(--text);
        font-family: 'Inter', sans-serif; font-size: 14px; outline: none;
        min-height: 80px; resize: vertical; margin-bottom: 20px;
      }
      .modal-note-input:focus { border-color: var(--sage); }
      .modal-note-input::placeholder { color: #5a5047; }

      .qty-control {
        display: flex; align-items: center; gap: 2px;
        background: var(--bg); border: 1.5px solid var(--border);
        border-radius: 12px; padding: 4px; width: fit-content;
      }
      .qty-btn {
        width: 32px; height: 32px; border-radius: 8px; border: none;
        background: transparent; color: var(--text-dim); font-size: 16px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-family: 'Inter', sans-serif; font-weight: 600; transition: color 0.15s;
      }
      .qty-btn:hover { color: var(--text); }
      .qty-value {
        min-width: 32px; text-align: center; font-size: 15px;
        font-weight: 700; color: var(--text); font-family: 'Inter', sans-serif;
      }

      .add-to-cart-btn, .submit-btn, .checkout-btn {
        transition: filter 0.2s ease, transform 0.15s ease;
      }
      .add-to-cart-btn:not(:disabled):hover,
          .submit-btn:hover,
          .checkout-btn:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }
          .add-to-cart-btn:not(:disabled):active,
          .submit-btn:active,
          .checkout-btn:active {
            transform: translateY(0);
          }
          .add-to-cart-btn {
            width: 100%; padding: 16px; border: none; border-radius: 99px;
            font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px;
            color: var(--bg); background: linear-gradient(135deg, var(--sage), var(--soft-teal));
            cursor: pointer; letter-spacing: 1px; text-transform: uppercase;
          }
          .add-to-cart-btn:disabled { opacity: 0.4; cursor: not-allowed; filter: none; transform: none; }

          .cart-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 250; }
          .cart-drawer {
            position: fixed; top: 0; right: 0; width: 380px; max-width: 92vw;
            height: 100vh; background: var(--surface); border-left: 1px solid var(--border);
            z-index: 300; display: flex; flex-direction: column; animation: drawerSlide 0.3s ease;
          }
          @keyframes drawerSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .cart-header {
            padding: 24px; border-bottom: 1px solid var(--border);
            display: flex; justify-content: space-between; align-items: center;
          }
          .cart-header-title { font-size: 18px; font-weight: 700; }
          .cart-close {
            background: none; border: none; color: var(--text-dim);
            font-size: 24px; cursor: pointer; transition: color 0.15s;
          }
          .cart-close:hover { color: var(--text); }
          .cart-items { flex: 1; overflow-y: auto; padding: 16px 24px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
          .cart-empty { text-align: center; padding: 48px 20px; color: var(--text-dim); font-size: 14px; font-weight: 300; }
          .cart-item { display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--border); align-items: flex-start; }
          .cart-item:last-child { border-bottom: none; }
          .cart-item-thumb {
            width: 56px; height: 56px; border-radius: 10px;
            background: linear-gradient(145deg, #1e1b17, #141210); flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; color: var(--border);
          }
          .cart-item-info { flex: 1; min-width: 0; }
          .cart-item-name { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
          .cart-item-detail { font-size: 12px; color: var(--text-dim); font-weight: 300; }
          .cart-item-note { font-size: 11px; color: var(--text-dim); font-style: italic; margin-top: 4px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .cart-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
          .cart-item-price { font-weight: 700; font-size: 14px; color: var(--sage); }
          .cart-remove { background: none; border: none; color: var(--text-dim); font-size: 18px; cursor: pointer; padding: 2px; line-height: 1; opacity: 0.5; transition: opacity 0.15s, color 0.15s; }
          .cart-remove:hover { opacity: 1; color: var(--dusty-rose); }
          .cart-qty { display: flex; align-items: center; gap: 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 8px; }
          .cart-qty-btn {
            width: 26px; height: 24px; border: none; background: transparent;
            color: var(--text-dim); font-size: 14px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif; font-weight: 600; transition: color 0.15s;
          }
          .cart-qty-btn:hover { color: var(--text); }
          .cart-qty-val { min-width: 20px; text-align: center; font-size: 12px; font-weight: 700; color: var(--text); }
          .cart-footer { padding: 20px 24px; border-top: 1px solid var(--border); }
          .cart-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .cart-total-label { font-size: 14px; color: var(--text-dim); font-weight: 500; }
          .cart-total-price { font-size: 22px; font-weight: 800; }
          .checkout-btn {
            width: 100%; padding: 16px; border: none; border-radius: 99px;
            font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px;
            color: var(--bg); background: linear-gradient(135deg, var(--sage), var(--soft-teal), var(--lavender));
            cursor: pointer; letter-spacing: 1px; text-transform: uppercase;
          }
          .keep-shopping-btn {
            width: 100%; padding: 12px; border: 1.5px solid var(--border);
            border-radius: 99px; background: transparent; color: var(--text-dim);
            font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px;
            cursor: pointer; margin-top: 8px; transition: all 0.15s;
          }
          .keep-shopping-btn:hover { border-color: var(--text-dim); color: var(--text); }

          .checkout-modal {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 20px; width: 90%; max-width: 440px;
            padding: 32px 24px; animation: modalSlideUp 0.3s ease;
          }
          .checkout-title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
          .checkout-subtitle { font-size: 14px; color: var(--text-dim); font-weight: 300; margin-bottom: 24px; }
          .checkout-summary { background: var(--bg); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
          .checkout-summary-item { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-dim); padding: 4px 0; }
          .checkout-summary-total {
            display: flex; justify-content: space-between; font-size: 15px;
            font-weight: 700; color: var(--text); padding-top: 10px; margin-top: 8px;
            border-top: 1px solid var(--border);
          }
          .order-success {
            text-align: center; padding: 32px 24px; background: var(--surface);
            border: 1px solid var(--border); border-radius: 20px;
            max-width: 440px; width: 90%; animation: modalSlideUp 0.3s ease;
          }

          .quick-prompt {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 20px; width: 90%; max-width: 420px;
            padding: 28px 24px; animation: modalSlideUp 0.3s ease;
          }
          .quick-prompt-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
          .quick-prompt-sub { font-size: 13px; color: var(--text-dim); font-weight: 300; margin-bottom: 20px; }

          @keyframes toastIn {
            0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
            100% { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
          `}</style>

          <div className="hero">
          <h1 className="hero-title">Custom<br /><span className="flow">Water Bottles</span></h1>
          <p className="hero-sub">
          Handpainted, one-of-a-kind bottles with the same psychedelic mixed media
          style. Pick your size, tell us the vibe, and we'll make it yours.
          </p>
          </div>

          <section>
          <div className="section-label" style={{ color: "var(--soft-teal)" }}>~ choose your bottle</div>
          <div className="shop-grid">
          {PRODUCTS.map((product) => {
            const summary = getCartSummary(product.id);
            const qc = quickCounts[product.id] || 0;
            const isMobileActive = mobileActiveCard === product.id;

            return (
              <div className="product-card" key={product.id}>
              <div className="product-img-wrap" onClick={() => setSelectedProduct(product)}>
              <div className="product-img-emoji">🫗</div>

              {summary && (
                <div className="in-cart-badge">
                {Object.entries(summary.byColor).map(([color, qty]) => (
                  <span className="in-cart-pill" key={color}>
                  <span className="in-cart-dot" />
                  {qty} × {color}
                  </span>
                ))}
                </div>
              )}

              <button
              className="mobile-add-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (isMobileActive) {
                  setMobileActiveCard(null);
                } else {
                  setMobileActiveCard(product.id);
                  if (qc === 0) quickIncrement(product.id);
                }
              }}
              >+</button>

              <div className={`qa-wrap ${isMobileActive ? "mobile-visible" : ""}`}>
              {qc > 0 && (
                <button className="qa-btn" onClick={(e) => { e.stopPropagation(); quickDecrement(product.id); }}>−</button>
              )}
              {qc > 0 && <span className="qa-count">{qc}</span>}
              <button className="qa-btn" onClick={(e) => { e.stopPropagation(); quickIncrement(product.id); }}>+</button>
              {qc > 0 && (
                <button className="qa-cart-btn" onClick={(e) => { e.stopPropagation(); quickAddToCart(product); }}>
                🛒 Add
                </button>
              )}
              </div>
              </div>

              <div className="product-info" onClick={() => setSelectedProduct(product)}>
              <div className="product-name">{product.name}</div>
              <div className="product-meta">
              <span className="product-size">{product.size}</span>
              <span className="product-price">${product.price}</span>
              </div>
              </div>
              </div>
            );
          })}
          </div>
          </section>

          <section>
          <div className="section-label" style={{ color: "var(--warm-gold)" }}>~ how it works</div>
          <div className="card">
          <p>
          Add bottles to your cart, describe what you want on each one, and
          submit your order. We'll follow up with a quote and timeline. Each
          bottle is <strong>sealed and hand-finished</strong> so the art holds up to daily use.
          </p>
          </div>
          </section>

          <Footer />

          {cartCount > 0 && (
            <button className="cart-fab" onClick={() => setCartOpen(true)}>
            🛒<span className="cart-badge">{cartCount}</span>
            </button>
          )}

          {toast && <Toast message={toast} onDone={() => setToast(null)} />}

          {selectedProduct && (
            <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAdd={(product, color, note, qty) => { addToCart(product, color, note, qty); setCartOpen(true); }}
            />
          )}

          {pendingQuickAdd && (
            <QuickAddPrompt
            product={pendingQuickAdd.product}
            qty={pendingQuickAdd.qty}
            onClose={() => setPendingQuickAdd(null)}
            onConfirm={finalizePendingAdd}
            />
          )}

          {cartOpen && (
            <>
            <div className="cart-overlay" onClick={() => setCartOpen(false)} />
            <div className="cart-drawer">
            <div className="cart-header">
            <span className="cart-header-title">Your Cart ({cartCount})</span>
            <button className="cart-close" onClick={() => setCartOpen(false)}>✕</button>
            </div>
            <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">Your cart is empty.<br />Tap a bottle to get started.</div>
            ) : cart.map((item) => (
              <div className="cart-item" key={item.cartId}>
              <div className="cart-item-thumb">🫗</div>
              <div className="cart-item-info">
              <div className="cart-item-name">{item.name}</div>
              <div className="cart-item-detail">{item.size} · {item.selectedColor}</div>
              {item.customNote && <div className="cart-item-note">"{item.customNote}"</div>}
              <div className="cart-qty">
              <button className="cart-qty-btn" onClick={() => updateCartQty(item.cartId, -1)}>−</button>
              <span className="cart-qty-val">{item.qty}</span>
              <button className="cart-qty-btn" onClick={() => updateCartQty(item.cartId, 1)}>+</button>
              </div>
              </div>
              <div className="cart-item-right">
              <div className="cart-item-price">${item.price * item.qty}</div>
              <button className="cart-remove" onClick={() => removeFromCart(item.cartId)}>×</button>
              </div>
              </div>
            ))}
            </div>
            {cart.length > 0 && (
              <div className="cart-footer">
              <div className="cart-total">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-price">${cartTotal}</span>
              </div>
              <button className="checkout-btn" onClick={() => { setCartOpen(false); setCheckingOut(true); }}>Continue to Checkout</button>
              <button className="keep-shopping-btn" onClick={() => setCartOpen(false)}>Keep Shopping</button>
              </div>
            )}
            </div>
            </>
          )}

          {checkingOut && !orderSent && (
            <div className="overlay" onClick={() => setCheckingOut(false)}>
            <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-title">Almost there</div>
            <div className="checkout-subtitle">Tell us who you are and we'll send a quote.</div>
            <div className="checkout-summary">
            {cart.map((item) => (
              <div className="checkout-summary-item" key={item.cartId}>
              <span>{item.name} ({item.size}) × {item.qty}</span>
              <span>${item.price * item.qty}</span>
              </div>
            ))}
            <div className="checkout-summary-total"><span>Total</span><span>${cartTotal}</span></div>
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
            <label>Name {checkoutErrors.name && <span className="field-error">{checkoutErrors.name}</span>}</label>
            <input className={checkoutErrors.name ? "input-error" : ""} placeholder="Your name" value={checkoutForm.name}
            onChange={(e) => { setCheckoutForm({ ...checkoutForm, name: e.target.value }); setCheckoutErrors({ ...checkoutErrors, name: null }); }} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
            <label>Email {checkoutErrors.email && <span className="field-error">{checkoutErrors.email}</span>}</label>
            <input className={checkoutErrors.email ? "input-error" : ""} type="email" placeholder="Where to reach you" value={checkoutForm.email}
            onChange={(e) => { setCheckoutForm({ ...checkoutForm, email: e.target.value }); setCheckoutErrors({ ...checkoutErrors, email: null }); }} />
            </div>
            <div className="field" style={{ marginBottom: 20 }}>
            <label>Anything else?</label>
            <input placeholder="Optional — shipping notes, questions, etc." value={checkoutForm.notes}
            onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })} />
            </div>
            {checkoutSubmitError && (
              <div style={{ color: "var(--dusty-rose)", fontSize: 13, marginBottom: 12, fontWeight: 500 }}>
              {checkoutSubmitError}
              </div>
            )}
            <button className="checkout-btn" onClick={handleCheckout}
            disabled={checkoutSubmitting}
            style={{ opacity: checkoutSubmitting ? 0.6 : 1, cursor: checkoutSubmitting ? "not-allowed" : "pointer" }}>
            {checkoutSubmitting ? "Sending..." : "Submit Order Request"}
            </button>
            </div>
            </div>
          )}

          {orderSent && (
            <div className="overlay">
            <div className="order-success">
            <div className="success-icon">💧</div>
            <div className="success-title">Order request received!</div>
            <div className="success-msg">We'll review your bottles and follow up with a quote and timeline.<br />Keep an eye on your inbox.</div>
            <button className="checkout-btn" style={{ marginTop: 24 }}
            onClick={() => { setOrderSent(false); setCheckingOut(false); setCart([]); }}>Done</button>
            </div>
            </div>
          )}
          </div>
  );
}

// ==========================================
// PRODUCT MODAL
// ==========================================
function ProductModal({ product, onClose, onAdd }) {
  const [selectedColor, setSelectedColor] = useState("");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  return (
    <div className="overlay" onClick={onClose}>
    <div className="product-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
    <button className="modal-close" onClick={onClose}>✕</button>
    <div className="modal-img-placeholder">🫗</div>
    <div className="modal-body">
    <div className="modal-title">{product.name}</div>
    <div className="modal-size-price">
    <span className="modal-size">{product.size}</span>
    <span className="modal-price">${product.price * qty}</span>
    </div>
    <div className="modal-desc">{product.description}</div>
    <div className="modal-section-label">Base Palette</div>
    <div className="color-options">
    {product.colors.map((c) => (
      <button key={c} className={`color-chip ${selectedColor === c ? "selected" : ""}`}
      onClick={() => setSelectedColor(c)}>{c}</button>
    ))}
    </div>
    <div className="modal-section-label">Quantity</div>
    <div className="qty-control" style={{ marginBottom: 20 }}>
    <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
    <span className="qty-value">{qty}</span>
    <button className="qty-btn" onClick={() => setQty((q) => q + 1)}>+</button>
    </div>
    <div className="modal-section-label">Describe Your Vision</div>
    <textarea className="modal-note-input"
    placeholder="Bands, colors, themes, vibes — whatever you're feeling."
    value={note} onChange={(e) => setNote(e.target.value)} />
    <button className="add-to-cart-btn" disabled={!selectedColor}
    onClick={() => onAdd(product, selectedColor, note, qty)}>
    {selectedColor ? `Add ${qty > 1 ? qty + " " : ""}to Cart — $${product.price * qty}` : "Select a Palette"}
    </button>
    </div>
    </div>
    </div>
  );
}

// ==========================================
// QUICK-ADD PROMPT
// ==========================================
function QuickAddPrompt({ product, qty, onClose, onConfirm }) {
  const [color, setColor] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="overlay" onClick={onClose}>
    <div className="quick-prompt" onClick={(e) => e.stopPropagation()}>
    <div className="quick-prompt-title">{product.name} × {qty}</div>
    <div className="quick-prompt-sub">Just need a couple details before we add {qty > 1 ? "these" : "this"} to your cart.</div>
    <div className="modal-section-label">Base Palette</div>
    <div className="color-options">
    {product.colors.map((c) => (
      <button key={c} className={`color-chip ${color === c ? "selected" : ""}`}
      onClick={() => setColor(c)}>{c}</button>
    ))}
    </div>
    <div className="modal-section-label">Quick Description</div>
    <textarea className="modal-note-input" style={{ minHeight: 60 }}
    placeholder="Colors, bands, vibes — even a few words helps."
    value={note} onChange={(e) => setNote(e.target.value)} />
    <button className="add-to-cart-btn" disabled={!color}
    onClick={() => onConfirm(color, note)}>
    {color ? `Add to Cart — $${product.price * qty}` : "Select a Palette"}
    </button>
    </div>
    </div>
  );
}

// ==========================================
// PAGE: GALLERY
// ==========================================

const GALLERY_CATEGORIES = ["All", "Posters", "Prints", "Album Art", "Promo"];

const GALLERY_ITEMS = [
  { id: 1, title: "Piece Title", category: "Posters", img: null },
{ id: 2, title: "Piece Title", category: "Album Art", img: null },
{ id: 3, title: "Piece Title", category: "Prints", img: null },
{ id: 4, title: "Piece Title", category: "Posters", img: null },
{ id: 5, title: "Piece Title", category: "Promo", img: null },
{ id: 6, title: "Piece Title", category: "Prints", img: null },
{ id: 7, title: "Piece Title", category: "Album Art", img: null },
{ id: 8, title: "Piece Title", category: "Posters", img: null },
{ id: 9, title: "Piece Title", category: "Promo", img: null },
];

function GalleryPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [lightbox, setLightbox] = useState(null);

  const filtered = activeFilter === "All"
  ? GALLERY_ITEMS
  : GALLERY_ITEMS.filter((p) => p.category === activeFilter);

  return (
    <>
    <style>{`
      .gallery-filters {
        display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px;
      }
      .filter-btn {
        padding: 7px 18px; border-radius: 99px; font-size: 13px; font-weight: 600;
        border: 1.5px solid var(--border); background: transparent;
        color: var(--text-dim); cursor: pointer;
        font-family: 'Inter', sans-serif; transition: all 0.15s ease;
      }
      .filter-btn:hover { border-color: var(--text-dim); color: var(--text); }
      .filter-btn.active { background: var(--text); color: var(--bg); border-color: var(--text); }

      .gallery-grid {
        columns: 2; gap: 12px; margin-bottom: 20px;
      }
      @media (min-width: 560px) { .gallery-grid { columns: 3; } }

      .gallery-item {
        break-inside: avoid; margin-bottom: 12px;
        border-radius: 12px; overflow: hidden;
        cursor: pointer; position: relative;
        background: var(--surface); border: 1px solid var(--border);
        transition: transform 0.2s ease, border-color 0.2s ease;
      }
      .gallery-item:hover { transform: translateY(-2px); border-color: var(--text-dim); }

      .gallery-placeholder {
        width: 100%; background: linear-gradient(145deg, #1e1b17, #141210);
        display: flex; align-items: center; justify-content: center;
        color: var(--border); font-size: 28px; position: relative; overflow: hidden;
      }
      .gallery-placeholder::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(143,173,139,0.05) 0%, rgba(184,165,204,0.05) 100%);
      }
      .gallery-item:nth-child(odd) .gallery-placeholder { aspect-ratio: 3/4; }
      .gallery-item:nth-child(even) .gallery-placeholder { aspect-ratio: 4/5; }
      .gallery-item:nth-child(3n) .gallery-placeholder { aspect-ratio: 1/1; }

      .gallery-overlay {
        position: absolute; inset: 0; background: rgba(14,13,11,0.7);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px;
        opacity: 0; transition: opacity 0.2s ease;
      }
      .gallery-item:hover .gallery-overlay { opacity: 1; }
      .gallery-overlay-title {
        font-size: 13px; font-weight: 700; color: var(--text);
        font-family: 'Inter', sans-serif;
      }
      .gallery-overlay-cat {
        font-size: 11px; font-weight: 500; color: var(--text-dim);
        font-family: 'Inter', sans-serif; letter-spacing: 1px; text-transform: uppercase;
      }

      .lightbox {
        position: fixed; inset: 0; background: rgba(0,0,0,0.92);
        backdrop-filter: blur(8px); z-index: 400;
        display: flex; align-items: center; justify-content: center;
        animation: overlayIn 0.2s ease;
      }
      .lightbox-inner {
        position: relative; max-width: 680px; width: 90%;
      }
      .lightbox-img {
        width: 100%; border-radius: 16px;
        background: linear-gradient(145deg, #1e1b17, #141210);
        aspect-ratio: 3/4; display: flex; align-items: center;
        justify-content: center; font-size: 64px; color: var(--border);
      }
      .lightbox-info {
        margin-top: 16px; display: flex;
        justify-content: space-between; align-items: center;
      }
      .lightbox-title { font-size: 16px; font-weight: 700; }
      .lightbox-cat { font-size: 12px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; }
      .lightbox-close {
        position: absolute; top: -16px; right: -16px; width: 40px; height: 40px;
        border-radius: 50%; background: var(--surface); border: 1px solid var(--border);
        color: var(--text); font-size: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: border-color 0.15s;
      }
      .lightbox-close:hover { border-color: var(--text-dim); }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 48 }}>
      <img
      src={logo}
      alt="Visual Frequencies Studios"
      style={{ width: "min(280px, 70%)", height: "auto", marginBottom: 20 }}
      />
      <h1 className="hero-title" style={{ marginBottom: 12 }}>
      Visual Frequencies<br /><span className="flow">Studios</span>
      </h1>
      <p className="hero-sub" style={{ margin: "0 auto" }}>
      Original handpainted mixed media art — one of a kind, every time.
      </p>
      </div>

      <section>
      <div className="gallery-filters">
      {GALLERY_CATEGORIES.map((cat) => (
        <button
        key={cat}
        className={`filter-btn ${activeFilter === cat ? "active" : ""}`}
        onClick={() => setActiveFilter(cat)}
        >{cat}</button>
      ))}
      </div>

      <div className="gallery-grid">
      {filtered.map((item) => (
        <div className="gallery-item" key={item.id} onClick={() => setLightbox(item)}>
        <div className="gallery-placeholder">
        {item.img
          ? <img src={item.img} alt={item.title} style={{ width: "100%", display: "block" }} />
          : "🎨"
        }
        <div className="gallery-overlay">
        <div className="gallery-overlay-title">{item.title}</div>
        <div className="gallery-overlay-cat">{item.category}</div>
        </div>
        </div>
        </div>
      ))}
      </div>
      </section>

      <Footer />

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
        <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        <div className="lightbox-img">
        {lightbox.img
          ? <img src={lightbox.img} alt={lightbox.title} style={{ width: "100%", borderRadius: 16 }} />
          : "🎨"
        }
        </div>
        <div className="lightbox-info">
        <div>
        <div className="lightbox-title">{lightbox.title}</div>
        <div className="lightbox-cat">{lightbox.category}</div>
        </div>
        </div>
        </div>
        </div>
      )}
      </>
  );
}


// ==========================================
// PAGE: ABOUT
// ==========================================

const ABOUT_STATS = [
  { value: "100+", label: "Pieces Created" },
{ value: "5+", label: "Years Painting" },
{ value: "∞", label: "Vibes Given" },
];

function AboutPage() {
  return (
    <>
    <style>{`
      /* ---- ABOUT HERO (portrait + intro side by side) ---- */
      .about-hero {
        display: flex; gap: 24px; align-items: flex-start;
        margin-bottom: 48px; flex-wrap: wrap;
      }
      .about-portrait-wrap {
        flex: 0 0 220px; min-width: 140px;
        border-radius: 20px; overflow: hidden;
        border: 1px solid var(--border);
      }
      .about-portrait-wrap img {
        width: 100%; height: auto; display: block;
      }
      .about-hero-text {
        flex: 1; min-width: 200px; padding-top: 4px;
      }
      .about-hero-text h1 { margin-bottom: 16px; }

      /* ---- STATS ROW ---- */
      .about-stats {
        display: flex; gap: 0; margin-bottom: 48px;
        border: 1px solid var(--border); border-radius: 16px; overflow: hidden;
      }
      .about-stat {
        flex: 1; padding: 20px 12px; text-align: center;
        border-right: 1px solid var(--border);
      }
      .about-stat:last-child { border-right: none; }
      .about-stat-value {
        font-size: clamp(20px, 5vw, 28px); font-weight: 800; margin-bottom: 4px;
        background: linear-gradient(135deg, var(--lavender), var(--sage));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .about-stat-label {
        font-size: clamp(9px, 2vw, 11px); font-weight: 600; color: var(--text-dim);
        letter-spacing: 1px; text-transform: uppercase;
      }

      /* ---- PHOTO STRIP ---- */
      .about-photo-strip {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin-top: 20px;
      }
      .about-photo {
        border-radius: 14px; overflow: hidden;
        border: 1px solid var(--border);
        background: linear-gradient(145deg, #1e1b17, #141210);
      }
      .about-photo img {
        width: 100%; height: auto; display: block;
        transition: transform 0.4s ease;
      }
      .about-photo:hover img { transform: scale(1.04); }

      @media (max-width: 480px) {
        .about-portrait-wrap { flex: 0 0 130px; }
        .about-photo-strip { grid-template-columns: 1fr 1fr; }
        .about-photo:last-child { display: none; }
      }
      `}</style>

      {/* HERO: portrait left, title + intro right */}
      <div className="about-hero">
      <div className="about-portrait-wrap">
      <img src={artistPortrait} alt="The artist" />
      </div>
      <div className="about-hero-text">
      <h1 className="hero-title">The<br /><span className="flow">Artist</span></h1>
      <p className="hero-sub">
      Handpainted mixed media from someone who lives and breathes the music.
      </p>
      </div>
      </div>

      {/* STATS */}
      <div className="about-stats">
      {ABOUT_STATS.map((s) => (
        <div className="about-stat" key={s.label}>
        <div className="about-stat-value">{s.value}</div>
        <div className="about-stat-label">{s.label}</div>
        </div>
      ))}
      </div>

      {/* BIO */}
      <section>
      <div className="section-label" style={{ color: "var(--lavender)" }}>~ the story</div>
      <div className="card">
      <p>
      {/* Replace this with the real bio */}
      This is where the artist's story goes. Talk about how you got started,
      what drives the work, the connection to music and culture. Keep it personal —
      people commission art from <strong>people</strong>, not studios.
      </p>
      </div>
      </section>

      {/* APPROACH */}
      <section>
      <div className="section-label" style={{ color: "var(--sage)" }}>~ the approach</div>
      <div className="card">
      <p>
      {/* Replace this with a description of the artistic process/style */}
      Talk about your medium, your process, what makes your style distinct.
      The psychedelic mixed media aesthetic, the faded washes, the tie-dye warmth —
      what does it mean to you and where does it come from?
      </p>
      </div>
      </section>

      {/* PHOTO STRIP */}
      <section>
      <div className="section-label" style={{ color: "var(--dusty-rose)" }}>~ in the studio</div>
      <div className="about-photo-strip">
      <div className="about-photo">
      <img src={family1} alt="Family" />
      </div>
      <div className="about-photo">
      <img src={familybw} alt="Family" />
      </div>
      <div className="about-photo">
      <img src={studio1} alt="In the studio" />
      </div>
      </div>
      </section>

      <Footer />
      </>
  );
}


// ==========================================
// TABS
// ==========================================
const TABS = [
  { id: "gallery", label: "Gallery", component: GalleryPage },
{ id: "bottles", label: "Store", component: WaterBottlePage },
{ id: "commissions", label: "Commissions", component: CommissionsPage },
{ id: "about", label: "About", component: AboutPage },
];

// ==========================================
// MAIN APP
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState("gallery");
  const [scrolled, setScrolled] = useState(false);
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || TABS[0].component;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
      :root {
        --bg: #0e0d0b; --surface: #181613; --border: #2e2a24;
        --text: #e8dfd4; --text-dim: #9a8e82;
        --sage: #8fad8b; --lavender: #b8a5cc; --dusty-rose: #d4a0a0;
        --warm-gold: #dbc078; --soft-teal: #7fb5b0;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .page {
        font-family: 'Inter', sans-serif; background: var(--bg);
        color: var(--text); min-height: 100vh; padding: 40px 20px;
        max-width: 720px; margin: 0 auto;
      }

      .topnav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 150;
        background: transparent; border-bottom: 1px solid transparent;
        transition: background 0.3s ease, border-color 0.3s ease;
      }
      .topnav.scrolled {
        background: rgba(14,13,11,0.85);
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        border-bottom-color: var(--border);
      }
      .topnav-inner {
        max-width: 720px; margin: 0 auto; padding: 0 20px;
        height: 60px; display: flex; align-items: center; justify-content: space-between;
      }
      .topnav-logo { flex-shrink: 0; }
      .topnav-logo img { height: 28px; width: auto; display: block; }

      .topnav-links {
        display: flex; align-items: center; gap: 2px;
      }
      .nav-link {
        position: relative; padding: 8px 16px;
        background: none; border: none; font-family: 'Inter', sans-serif;
        font-size: 14px; font-weight: 500; color: var(--text-dim);
        cursor: pointer; transition: color 0.2s ease; white-space: nowrap;
      }
      .nav-link:hover { color: var(--text); }
      .nav-link.active { color: var(--text); font-weight: 600; }
      .nav-link::after {
        content: ''; position: absolute; bottom: 2px; left: 50%; right: 50%;
        height: 1.5px; border-radius: 99px; background: var(--text);
        transition: left 0.25s ease, right 0.25s ease;
      }
      .nav-link.active::after { left: 16px; right: 16px; }

      .bottomnav {
        display: none;
        position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
        background: rgba(14,13,11,0.92);
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid var(--border);
        padding-bottom: env(safe-area-inset-bottom);
      }
      .bottomnav-inner {
        display: flex; max-width: 720px; margin: 0 auto;
      }
      .bottomnav-btn {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 5px;
        padding: 10px 4px 10px; min-height: 60px;
        background: none; border: none; cursor: pointer;
        color: var(--text-dim); font-family: 'Inter', sans-serif;
        font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
        transition: color 0.15s ease; -webkit-tap-highlight-color: transparent;
      }
      .bottomnav-btn.active { color: var(--text); }
      .bottomnav-btn svg { width: 22px; height: 22px; transition: transform 0.15s ease; }
      .bottomnav-btn.active svg { transform: translateY(-1px); }

      .bottomnav-btn::before {
        content: ''; display: block; width: 4px; height: 4px;
        border-radius: 50%; background: var(--text);
        position: absolute; top: 6px;
        opacity: 0; transition: opacity 0.15s ease;
      }
      .bottomnav-btn { position: relative; }
      .bottomnav-btn.active::before { opacity: 1; }

      @media (max-width: 640px) {
        .topnav-links { display: none; }
        .bottomnav { display: block; }
        .page { padding-bottom: 80px; }
      }
      @media (min-width: 641px) {
        .page { padding-top: 80px; }
      }
      @media (max-width: 640px) {
        .page { padding-top: 72px; }
      }
      .status {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px;
        border-radius: 99px; font-size: 12px; font-weight: 600;
        letter-spacing: 2px; text-transform: uppercase; margin-bottom: 28px;
      }
      .status.open { background: rgba(143,173,139,0.12); color: #a3c9a0; border: 1px solid rgba(143,173,139,0.3); }
      .status.closed { background: rgba(212,160,160,0.15); color: var(--dusty-rose); border: 1px solid rgba(212,160,160,0.35); }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
      .hero { margin-bottom: 48px; }
      .hero-title { font-size: clamp(36px, 9vw, 64px); font-weight: 800; line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 20px; }
      .hero-title .flow {
        background: linear-gradient(135deg, var(--lavender), var(--dusty-rose), var(--warm-gold), var(--sage));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .hero-sub { color: var(--text-dim); font-size: 16px; line-height: 1.8; font-weight: 300; max-width: 500px; }
      .hero-sub em { font-style: italic; color: var(--text); font-weight: 400; }
      .section-label { font-size: 13px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 20px; }
      section { margin-bottom: 56px; }
      .card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 28px 24px; }
      .card p { font-size: 15px; line-height: 1.8; color: var(--text-dim); font-weight: 300; }
      .card p strong { color: var(--text); font-weight: 600; }
      .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
      .tag { padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 600; border: 1px solid var(--border); color: var(--text-dim); }
      .tag:nth-child(1) { border-color: var(--lavender); color: #c9b8da; }
      .tag:nth-child(2) { border-color: var(--sage); color: #a3c9a0; }
      .tag:nth-child(3) { border-color: var(--dusty-rose); color: #ddb5b5; }
      .tag:nth-child(4) { border-color: var(--warm-gold); color: #e0cc8a; }
      .tag:nth-child(5) { border-color: var(--soft-teal); color: #99ccc7; }
      .steps { display: flex; flex-direction: column; }
      .step { display: flex; gap: 16px; padding: 20px 0; border-bottom: 1px solid var(--border); }
      .step:last-child { border-bottom: none; }
      .step-num { font-size: 28px; font-weight: 800; color: var(--border); width: 44px; line-height: 1; flex-shrink: 0; }
      .step-title { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
      .step-desc { font-size: 14px; color: var(--text-dim); line-height: 1.7; font-weight: 300; }
      .form-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 28px 24px; }
      .form-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
      @media (min-width: 520px) { .form-grid { grid-template-columns: 1fr 1fr; } }
      .field label { display: block; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 6px; }
      .field input, .field select, .field textarea {
        width: 100%; background: var(--bg); border: 1.5px solid var(--border);
        border-radius: 12px; padding: 12px 14px; color: var(--text);
        font-family: 'Inter', sans-serif; font-size: 14px; outline: none;
      }
      .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--sage); }
      .field textarea { min-height: 100px; resize: vertical; }
      .field input::placeholder, .field textarea::placeholder { color: #5a5047; }
      .submit-btn {
        width: 100%; padding: 16px; border: none; border-radius: 99px;
        font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px;
        color: #0e0d0b; background: linear-gradient(135deg, var(--sage), var(--soft-teal), var(--lavender));
        cursor: pointer; margin-top: 8px; letter-spacing: 1px; text-transform: uppercase;
      }
      .success { text-align: center; padding: 48px 20px; }
      .success-icon { font-size: 48px; margin-bottom: 12px; }
      .success-title { font-weight: 700; font-size: 24px; margin-bottom: 8px; }
      .success-msg { color: var(--text-dim); font-size: 15px; line-height: 1.7; font-weight: 300; }
      .tab-content { animation: fadeUp 0.3s ease; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      .field-error { color: var(--dusty-rose); font-size: 11px; font-weight: 500; margin-left: 8px; letter-spacing: 0; }
      .input-error { border-color: var(--dusty-rose) !important; }
      `}</style>

      {/* STICKY TOP NAV */}
      <nav className={`topnav${scrolled ? " scrolled" : ""}`}>
      <div className="topnav-inner">
      <div className="topnav-logo">
      {activeTab !== "gallery" && (
        <img src={logo} alt="Visual Frequencies Studios" />
      )}
      </div>
      <div className="topnav-links">
      {TABS.map((tab) => (
        <button key={tab.id} className={`nav-link${activeTab === tab.id ? " active" : ""}`}
        onClick={() => switchTab(tab.id)}>{tab.label}</button>
      ))}
      </div>
      </div>
      </nav>

      {/* BOTTOM TAB BAR — mobile only */}
      <nav className="bottomnav">
      <div className="bottomnav-inner">
      {TABS.map((tab) => (
        <button key={tab.id} className={`bottomnav-btn${activeTab === tab.id ? " active" : ""}`}
        onClick={() => switchTab(tab.id)}>
        {tab.id === "gallery" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        )}
        {tab.id === "bottles" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M8 6h8l1 3v9a2 2 0 01-2 2H7a2 2 0 01-2-2V9l1-3z"/><path d="M8 11h8"/>
          </svg>
        )}
        {tab.id === "commissions" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        )}
        {tab.id === "about" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        )}
        {tab.label}
        </button>
      ))}
      </div>
      </nav>

      <div className="tab-content" key={activeTab}>
      <ActiveComponent />
      </div>
      </div>
  );
}
