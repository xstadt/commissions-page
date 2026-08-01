import { useState, useEffect, useMemo, useCallback } from "react";
import { client, urlFor } from "./sanityClient";
import { Footer, Toast } from "./shared";
import { validateEmail } from "./lib";

/*
 * ========================================
 * THE STORE
 * ========================================
 *
 * Everything sold here is one-of-one, so there is no quantity
 * anywhere in this file — a piece is either in the cart or it isn't.
 *
 * Two things drive the whole page:
 *
 *   availabilityOf()  decides whether a piece reads as for sale,
 *                     on hold for someone else, or gone.
 *
 *   paymentMode       comes from Sanity per product. "immediate"
 *                     charges at checkout; "approval" only puts a
 *                     hold on the card until the artist says yes.
 *                     The browser never decides this — the server
 *                     re-reads it from Sanity at checkout time.
 */

const PRODUCTS_QUERY = `*[_type == "product"] | order(coalesce(order, 999) asc, _createdAt desc) {
  "id": slug.current,
  name, price, compareAtPrice, size, medium, description,
  image, gallery, sold, orderState, paymentMode, featured, _createdAt,
  "category": category->title,
  "categoryOrder": coalesce(category->order, 999)
}`;

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest first" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name: A to Z" },
];

// A piece with a card hold against it is still "sold" as far as the
// shop is concerned — it must not be buyable twice — but the artist
// hasn't been paid yet, so it gets its own label.
function availabilityOf(p) {
  if (!p.sold) return "available";
  return p.orderState === "pending" ? "onhold" : "sold";
}

function needsApproval(p) {
  return p.paymentMode === "approval";
}

// ==========================================
// STORE PAGE
// ==========================================

export default function StorePage({ settings }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // ---- filters ----
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("vfs_cart");
      const parsed = saved ? JSON.parse(saved) : [];
      // Guard against a corrupted or outdated saved value - without this
      // a bad entry would crash the whole page on load.
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (i) => i && typeof i.id === "string" && typeof i.price === "number"
      );
    } catch {
      return [];
    }
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: "", email: "", notes: "" });
  const [checkoutErrors, setCheckoutErrors] = useState({});
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutSubmitError, setCheckoutSubmitError] = useState(null);
  const [toast, setToast] = useState(null);

  // Keep the cart alive across the redirect out to Stripe and back.
  useEffect(() => {
    try {
      localStorage.setItem("vfs_cart", JSON.stringify(cart));
    } catch {
      /* private mode */
    }
  }, [cart]);

  useEffect(() => {
    let cancelled = false;
    client
      .fetch(PRODUCTS_QUERY)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setProducts(list);
        setLoading(false);

        // A saved cart can be hours or days old. Drop anything that has
        // since sold, gone on hold, or been deleted, and re-sync prices
        // from Sanity so the cart total always matches what Stripe will
        // actually charge.
        setCart((prev) => {
          if (prev.length === 0) return prev;
          const live = Object.fromEntries(list.map((p) => [p.id, p]));
          const next = prev
            .filter((i) => live[i.id] && availabilityOf(live[i.id]) === "available")
            .map((i) => ({ ...i, ...live[i.id], cartId: i.cartId }));
          const changed =
            next.length !== prev.length || next.some((i, n) => i.price !== prev[n].price);
          return changed ? next : prev;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Sanity products fetch failed:", err);
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the product view on Escape
  useEffect(() => {
    if (!selectedProduct) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedProduct(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedProduct]);

  const showToast = useCallback((msg) => {
    setToast(null);
    setTimeout(() => setToast(msg), 30);
  }, []);

  // ---- categories present in the actual catalogue ----
  const categories = useMemo(() => {
    const seen = new Map();
    products.forEach((p) => {
      if (p.category && !seen.has(p.category)) {
        seen.set(p.category, p.categoryOrder ?? 999);
      }
    });
    return [...seen.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [products]);

  // A category can empty out while you're looking at it — if the artist
  // sells the last piece in it, quietly fall back to showing everything
  // rather than leaving the shopper staring at a blank grid.
  const activeCategory =
    category !== "All" && !categories.includes(category) ? "All" : category;

  // ---- filter, then sort ----
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = products.filter((p) => {
      if (activeCategory !== "All" && p.category !== activeCategory) return false;
      if (availableOnly && availabilityOf(p) !== "available") return false;
      if (!q) return true;
      return [p.name, p.category, p.size, p.medium, p.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const byName = (a, b) => (a.name || "").localeCompare(b.name || "");

    list = [...list].sort((a, b) => {
      // Whatever the sort, things you can actually buy come first.
      const aGone = availabilityOf(a) !== "available";
      const bGone = availabilityOf(b) !== "available";
      if (aGone !== bGone) return aGone ? 1 : -1;

      switch (sort) {
        case "newest":
          return new Date(b._createdAt || 0) - new Date(a._createdAt || 0);
        case "price-asc":
          return (a.price ?? 0) - (b.price ?? 0) || byName(a, b);
        case "price-desc":
          return (b.price ?? 0) - (a.price ?? 0) || byName(a, b);
        case "name":
          return byName(a, b);
        default:
          // "Featured" — the artist's picks, then their chosen order.
          if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
          return 0;
      }
    });

    return list;
  }, [products, activeCategory, sort, query, availableOnly]);

  const filtersActive =
    activeCategory !== "All" || query.trim() !== "" || availableOnly || sort !== "featured";

  const clearFilters = () => {
    setCategory("All");
    setQuery("");
    setAvailableOnly(false);
    setSort("featured");
  };

  // ---- cart ----
  const isInCart = (productId) => cart.some((i) => i.id === productId);

  const addToCart = (product) => {
    if (isInCart(product.id) || availabilityOf(product) !== "available") return;
    setCart((prev) => [...prev, { ...product, cartId: Date.now() + Math.random() }]);
    setSelectedProduct(null);
    showToast(`${product.name} added`);
  };

  const removeFromCart = (cartId) =>
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));

  const cartCount = cart.length;
  const cartTotal = cart.reduce((sum, i) => sum + i.price, 0);
  const cartNeedsApproval = cart.some(needsApproval);

  const handleCheckout = async () => {
    const errs = {};
    if (!checkoutForm.name.trim()) errs.name = "Required";
    if (!checkoutForm.email.trim()) errs.email = "Required";
    else if (!validateEmail(checkoutForm.email)) errs.email = "Invalid email";
    if (Object.keys(errs).length > 0) {
      setCheckoutErrors(errs);
      return;
    }

    setCheckoutSubmitting(true);
    setCheckoutSubmitError(null);

    try {
      // The server rebuilds this order from Sanity prices.
      // We deliberately send NO price information.
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ id: i.id })),
          customer: {
            name: checkoutForm.name,
            email: checkoutForm.email,
            notes: checkoutForm.notes,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        setCheckoutSubmitError(data.error || "Something went wrong. Please try again.");
        setCheckoutSubmitting(false);
        return;
      }

      // Hand off to Stripe's hosted payment page.
      // Note: no setCheckoutSubmitting(false) here on purpose - we want the
      // button to stay disabled while the browser navigates away.
      window.location.href = data.url;
    } catch {
      setCheckoutSubmitError("Network error — check your connection and try again.");
      setCheckoutSubmitting(false);
    }
  };

  const introLine =
    settings?.storeIntro ||
    "Finished, one-of-one pieces looking for a home. What you see is what ships — there is no second copy of anything on this page.";

  return (
    <div>
      <style>{STORE_CSS}</style>

      <div className="hero">
        <h1 className="hero-title">
          The<br />
          <span className="flow">Store</span>
        </h1>
        <p className="hero-sub">{introLine}</p>
      </div>

      <section>
        {/* ---------- TOOLBAR ---------- */}
        {!loading && !loadError && products.length > 0 && (
          <div className="store-toolbar">
            <div className="store-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the shop"
                aria-label="Search the shop"
              />
              {query && (
                <button className="store-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>

            <label className="store-sort">
              <span>Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* ---------- CATEGORY CHIPS ---------- */}
        {!loading && !loadError && categories.length > 0 && (
          <div className="store-chips">
            <button
              className={`store-chip ${activeCategory === "All" ? "active" : ""}`}
              onClick={() => setCategory("All")}
            >
              Everything
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`store-chip ${activeCategory === c ? "active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
            <button
              className={`store-chip toggle ${availableOnly ? "active" : ""}`}
              onClick={() => setAvailableOnly((v) => !v)}
              aria-pressed={availableOnly}
            >
              {availableOnly ? "✓ " : ""}Available only
            </button>
          </div>
        )}

        {/* ---------- RESULT COUNT ---------- */}
        {!loading && !loadError && products.length > 0 && (
          <div className="store-count">
            <span>
              {visible.length} {visible.length === 1 ? "piece" : "pieces"}
              {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
            </span>
            {filtersActive && (
              <button className="store-reset" onClick={clearFilters}>
                Reset
              </button>
            )}
          </div>
        )}

        {/* ---------- GRID ---------- */}
        {loading ? (
          <div className="shop-grid">
            {[1, 2, 3, 4].map((i) => (
              <div className="product-card is-skeleton" key={i}>
                <div className="product-img-wrap skel-shimmer" />
                <div className="product-info">
                  <div className="skel-line skel-shimmer" style={{ width: "60%" }} />
                  <div className="skel-line skel-shimmer" style={{ width: "35%", marginTop: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="card">
            <p>
              The shop didn't load. Refresh the page — if it still won't come up, send a note
              through the Commissions page and we'll sort it out.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="card">
            <p>Nothing in the shop right now. New pieces go up as they come off the table.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="card store-empty">
            <p>
              No pieces match what you're looking for. Try a different category, or clear the
              filters to see everything.
            </p>
            <button className="store-reset inline" onClick={clearFilters}>
              Show everything
            </button>
          </div>
        ) : (
          <div className="shop-grid">
            {visible.map((product) => {
              const inCart = isInCart(product.id);
              const state = availabilityOf(product);
              const gone = state !== "available";

              return (
                <div className={`product-card ${gone ? "is-gone" : ""}`} key={product.id}>
                  <div className="product-img-wrap" onClick={() => setSelectedProduct(product)}>
                    {product.image ? (
                      <img
                        src={urlFor(product.image).width(600).height(600).quality(75).auto("format").url()}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-img-emoji">🎨</div>
                    )}

                    {state === "sold" && <div className="state-badge sold">Sold</div>}
                    {state === "onhold" && <div className="state-badge onhold">On hold</div>}

                    {!gone && (
                      <button
                        className={`quick-add-btn ${inCart ? "is-added" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                          setCartOpen(true);
                        }}
                        disabled={inCart}
                      >
                        {inCart ? "✓ Added" : "+ Add"}
                      </button>
                    )}
                  </div>

                  <div className="product-info" onClick={() => setSelectedProduct(product)}>
                    <div className="product-name">{product.name}</div>
                    <div className="product-meta">
                      <span className="product-size">
                        {[product.category, product.size].filter(Boolean).join(" · ")}
                      </span>
                      <span className="product-price">
                        {product.compareAtPrice > product.price && (
                          <s className="product-was">${product.compareAtPrice}</s>
                        )}
                        ${product.price}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="section-label" style={{ color: "var(--warm-gold)" }}>~ how it works</div>
        <div className="card">
          <p>
            Every piece here is <strong>already finished</strong> — a real, one-of-one object,
            not a preview or a print run. Add what you want to your cart and check out securely
            through Stripe. Once something sells, it's gone for good.
          </p>
          <p style={{ marginTop: 14 }}>
            A few pieces need the artist's go-ahead before they're sold. Those go through the
            same checkout, but your card is only held — nothing is charged until he approves the
            order. You'll see a note in your cart before you pay, and if it doesn't work out the
            hold drops off and you're never billed.
          </p>
        </div>
      </section>

      <Footer settings={settings} />

      {cartCount > 0 && (
        <button className="cart-fab" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${cartCount} items`}>
          🛒<span className="cart-badge">{cartCount}</span>
        </button>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          inCart={isInCart(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onAdd={(product) => {
            addToCart(product);
            setCartOpen(true);
          }}
        />
      )}

      {/* ---------- CART DRAWER ---------- */}
      {cartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-drawer">
            <div className="cart-header">
              <span className="cart-header-title">Your Cart ({cartCount})</span>
              <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart">
                ✕
              </button>
            </div>
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="cart-empty">
                  Nothing in the cart yet.
                  <br />
                  Pick something from the shop to get started.
                </div>
              ) : (
                cart.map((item) => (
                  <div className="cart-item" key={item.cartId}>
                    <div className="cart-item-thumb">
                      {item.image ? (
                        <img
                          src={urlFor(item.image).width(112).height(112).quality(70).auto("format").url()}
                          alt=""
                        />
                      ) : (
                        "🎨"
                      )}
                    </div>
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-detail">
                        {[item.category, item.size].filter(Boolean).join(" · ") || "One of one"}
                      </div>
                      {needsApproval(item) && <div className="cart-item-flag">Needs approval</div>}
                    </div>
                    <div className="cart-item-right">
                      <div className="cart-item-price">${item.price}</div>
                      <button
                        className="cart-remove"
                        onClick={() => removeFromCart(item.cartId)}
                        aria-label={`Remove ${item.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="cart-footer">
                {cartNeedsApproval && <HoldNotice compact />}
                <div className="cart-total">
                  <span className="cart-total-label">Total</span>
                  <span className="cart-total-price">${cartTotal}</span>
                </div>
                <button
                  className="checkout-btn"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckingOut(true);
                  }}
                >
                  Continue to Checkout
                </button>
                <button className="keep-shopping-btn" onClick={() => setCartOpen(false)}>
                  Keep Shopping
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------- CHECKOUT DETAILS ---------- */}
      {checkingOut && (
        <div className="overlay" onClick={() => setCheckingOut(false)}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-title">Almost there</div>
            <div className="checkout-subtitle">
              Payment is handled securely by Stripe. Shipping is picked on the next screen.
            </div>

            <div className="checkout-summary">
              {cart.map((item) => (
                <div className="checkout-summary-item" key={item.cartId}>
                  <span>
                    {item.name}
                    {item.size ? ` (${item.size})` : ""}
                  </span>
                  <span>${item.price}</span>
                </div>
              ))}
              <div className="checkout-summary-total">
                <span>Total</span>
                <span>${cartTotal}</span>
              </div>
            </div>

            {cartNeedsApproval && <HoldNotice />}

            <div className="field" style={{ marginBottom: 14 }}>
              <label>
                Name {checkoutErrors.name && <span className="field-error">{checkoutErrors.name}</span>}
              </label>
              <input
                className={checkoutErrors.name ? "input-error" : ""}
                placeholder="Your name"
                value={checkoutForm.name}
                onChange={(e) => {
                  setCheckoutForm({ ...checkoutForm, name: e.target.value });
                  setCheckoutErrors({ ...checkoutErrors, name: null });
                }}
              />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>
                Email {checkoutErrors.email && <span className="field-error">{checkoutErrors.email}</span>}
              </label>
              <input
                className={checkoutErrors.email ? "input-error" : ""}
                type="email"
                placeholder="Where to reach you"
                value={checkoutForm.email}
                onChange={(e) => {
                  setCheckoutForm({ ...checkoutForm, email: e.target.value });
                  setCheckoutErrors({ ...checkoutErrors, email: null });
                }}
              />
            </div>
            <div className="field" style={{ marginBottom: 20 }}>
              <label>Anything else?</label>
              <input
                placeholder="Optional — shipping notes, questions, etc."
                value={checkoutForm.notes}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
              />
            </div>

            {checkoutSubmitError && (
              <div
                style={{
                  color: "var(--dusty-rose)",
                  fontSize: 13,
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                {checkoutSubmitError}
              </div>
            )}

            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={checkoutSubmitting}
              style={{
                opacity: checkoutSubmitting ? 0.6 : 1,
                cursor: checkoutSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {checkoutSubmitting
                ? "Redirecting to Stripe..."
                : cartNeedsApproval
                  ? `Place a hold — $${cartTotal}`
                  : `Continue to Payment — $${cartTotal}`}
            </button>

            <div
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                textAlign: "center",
                marginTop: 12,
                lineHeight: 1.6,
              }}
            >
              Every piece is one-of-one and sold exactly as pictured.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// HOLD NOTICE
// Shown wherever an "ask first" piece is in play, so the wording a
// shopper reads in the cart matches what they read at checkout and
// again on the confirmation page.
// ==========================================
function HoldNotice({ compact = false }) {
  return (
    <div className={`hold-notice ${compact ? "compact" : ""}`}>
      <span className="hold-dot" />
      <div>
        <strong>This order needs approval first.</strong>{" "}
        Your card is authorized at checkout but <em>not charged</em>. The artist confirms the
        order, then the payment goes through. If it's declined, the hold drops off and you're
        never billed.
      </div>
    </div>
  );
}

// ==========================================
// PRODUCT DETAIL
// ==========================================
function ProductModal({ product, inCart, onClose, onAdd }) {
  const state = availabilityOf(product);
  const gone = state !== "available";
  const hold = needsApproval(product);

  const photos = useMemo(
    () => [product.image, ...(product.gallery || [])].filter(Boolean),
    [product]
  );
  const [active, setActive] = useState(0);

  const details = [
    product.category && { label: "Category", value: product.category },
    product.size && { label: "Size", value: product.size },
    product.medium && { label: "Materials", value: product.medium },
  ].filter(Boolean);

  let buttonLabel;
  if (state === "sold") buttonLabel = "Sold";
  else if (state === "onhold") buttonLabel = "On hold for another buyer";
  else if (inCart) buttonLabel = "Already in Cart";
  else if (hold) buttonLabel = `Request this piece — $${product.price}`;
  else buttonLabel = `Add to Cart — $${product.price}`;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="modal-img-placeholder">
          {photos[active] ? (
            <img
              src={urlFor(photos[active]).width(900).height(700).quality(80).auto("format").url()}
              alt={product.name}
            />
          ) : (
            "🎨"
          )}
          {state === "sold" && <div className="state-badge sold modal-badge">Sold</div>}
          {state === "onhold" && <div className="state-badge onhold modal-badge">On hold</div>}
        </div>

        {photos.length > 1 && (
          <div className="modal-thumbs">
            {photos.map((photo, i) => (
              <button
                key={i}
                className={`modal-thumb ${i === active ? "active" : ""}`}
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1}`}
              >
                <img
                  src={urlFor(photo).width(160).height(160).quality(65).auto("format").url()}
                  alt=""
                />
              </button>
            ))}
          </div>
        )}

        <div className="modal-body">
          <div className="modal-title">{product.name}</div>
          <div className="modal-size-price">
            <span className="modal-size">
              {[product.category, product.size].filter(Boolean).join(" · ")}
            </span>
            <span className="modal-price">
              {product.compareAtPrice > product.price && (
                <s className="product-was">${product.compareAtPrice}</s>
              )}
              ${product.price}
            </span>
          </div>

          {product.description && <div className="modal-desc">{product.description}</div>}

          {details.length > 0 && (
            <div className="modal-specs">
              {details.map((d) => (
                <div className="modal-spec" key={d.label}>
                  <span>{d.label}</span>
                  <span>{d.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="modal-section-label">One of One</div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-dim)",
              lineHeight: 1.7,
              marginBottom: 20,
              fontWeight: 300,
            }}
          >
            This exact piece, pictured above, is what ships. There is no other one like it.
          </p>

          <button className="add-to-cart-btn" disabled={gone || inCart} onClick={() => onAdd(product)}>
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STYLES
// Class names are prefixed so they can't collide with the Gallery
// page's filter buttons, which use a different visual language.
// ==========================================
const STORE_CSS = `
.shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
@media (max-width: 480px) { .shop-grid { grid-template-columns: 1fr; } }

/* ---- TOOLBAR ---- */
.store-toolbar {
  display: flex; gap: 10px; align-items: center;
  margin-bottom: 14px; flex-wrap: wrap;
}
.store-search {
  flex: 1 1 200px; min-width: 0; position: relative;
  display: flex; align-items: center;
}
.store-search svg {
  position: absolute; left: 14px; width: 15px; height: 15px;
  color: var(--text-dim); pointer-events: none;
}
.store-search input {
  width: 100%; background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 99px; padding: 11px 38px 11px 38px; color: var(--text);
  font-family: 'Inter', sans-serif; font-size: 14px; outline: none;
  transition: border-color 0.15s;
  -webkit-appearance: none; appearance: none;
}
.store-search input::-webkit-search-cancel-button { display: none; }
.store-search input:focus { border-color: var(--sage); }
.store-search input::placeholder { color: #5a5047; }
.store-search-clear {
  position: absolute; right: 12px; background: none; border: none;
  color: var(--text-dim); font-size: 13px; cursor: pointer; padding: 4px;
  line-height: 1;
}
.store-search-clear:hover { color: var(--text); }

.store-sort {
  display: flex; align-items: center; gap: 8px; flex: 0 0 auto;
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 99px; padding: 4px 8px 4px 16px;
}
.store-sort span {
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--text-dim);
}
.store-sort select {
  background: transparent; border: none; color: var(--text);
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
  padding: 8px 6px; outline: none; cursor: pointer;
}
.store-sort select option { background: var(--surface); color: var(--text); }

/* ---- CATEGORY CHIPS ---- */
.store-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.store-chip {
  padding: 7px 16px; border-radius: 99px; font-size: 13px; font-weight: 600;
  border: 1.5px solid var(--border); background: transparent;
  color: var(--text-dim); cursor: pointer;
  font-family: 'Inter', sans-serif; transition: all 0.15s ease;
}
.store-chip:hover { border-color: var(--text-dim); color: var(--text); }
.store-chip.active { background: var(--text); color: var(--bg); border-color: var(--text); }
.store-chip.toggle { margin-left: auto; }
.store-chip.toggle.active {
  background: rgba(143,173,139,0.14); color: #a3c9a0;
  border-color: rgba(143,173,139,0.45);
}
@media (max-width: 520px) { .store-chip.toggle { margin-left: 0; } }

.store-count {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 18px;
  font-size: 12px; font-weight: 500; color: var(--text-dim);
  letter-spacing: 0.4px;
}
.store-reset {
  background: none; border: none; color: var(--text-dim); cursor: pointer;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  text-decoration: underline; text-underline-offset: 3px; padding: 2px;
}
.store-reset:hover { color: var(--text); }
.store-reset.inline { margin-top: 14px; text-decoration: none; color: var(--sage); }
.store-empty { text-align: center; }

/* ---- CARDS ---- */
.product-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden; cursor: pointer;
  transition: all 0.25s ease; position: relative;
}
.product-card:hover { border-color: var(--text-dim); transform: translateY(-2px); }
.product-card.is-skeleton { pointer-events: none; }
.product-card.is-skeleton:hover { transform: none; border-color: var(--border); }
.product-img-wrap {
  width: 100%; aspect-ratio: 1/1; position: relative; overflow: hidden;
  background: linear-gradient(145deg, #1e1b17, #141210);
}
.product-img-wrap::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(143,173,139,0.06) 0%, rgba(184,165,204,0.06) 50%, rgba(212,160,160,0.06) 100%);
  pointer-events: none;
}
.product-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.product-img-emoji {
  width: 100%; height: 100%; display: flex;
  align-items: center; justify-content: center;
  font-size: 40px; color: var(--border);
}
.product-info { padding: 16px; }
.product-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.product-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.product-size { font-size: 12px; color: var(--text-dim); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.product-price { font-size: 15px; font-weight: 700; color: var(--sage); flex-shrink: 0; }
.product-was { color: var(--text-dim); font-weight: 500; font-size: 12px; margin-right: 6px; }

/* ---- STATE BADGES ---- */
.state-badge {
  position: absolute; top: 12px; left: 12px; z-index: 6;
  padding: 5px 12px; border-radius: 8px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase;
  font-family: 'Inter', sans-serif;
}
.state-badge.sold { background: rgba(212,160,160,0.85); color: #1a1512; }
.state-badge.onhold { background: rgba(219,192,120,0.85); color: #1a1512; }
.modal-badge { top: 16px; left: 16px; }
.product-card.is-gone .product-img-wrap { filter: grayscale(0.5) brightness(0.6); }
.product-card.is-gone .product-price { color: var(--text-dim); }

/* ---- QUICK ADD (one tap, no quantity - each piece is unique) ---- */
.quick-add-btn {
  position: absolute; bottom: 12px; right: 12px; z-index: 5;
  height: 38px; padding: 0 16px; border-radius: 10px;
  background: rgba(14,13,11,0.85); backdrop-filter: blur(8px);
  border: 1px solid var(--border); color: var(--text);
  font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: 'Inter', sans-serif; letter-spacing: 0.5px;
  opacity: 0; transition: all 0.2s ease; pointer-events: none;
}
.product-card:hover .quick-add-btn { opacity: 1; pointer-events: auto; }
.quick-add-btn:hover { border-color: var(--sage); background: var(--sage); color: var(--bg); }
.quick-add-btn.is-added {
  background: var(--sage); border-color: var(--sage); color: var(--bg);
  opacity: 1; pointer-events: none;
}
/* Touch devices don't get hover, so always show the button */
@media (hover: none) { .quick-add-btn { opacity: 1; pointer-events: auto; } }

/* ---- HOLD NOTICE ---- */
.hold-notice {
  display: flex; gap: 10px; align-items: flex-start;
  background: rgba(219,192,120,0.08);
  border: 1px solid rgba(219,192,120,0.28);
  border-radius: 14px; padding: 14px 16px; margin-bottom: 20px;
  font-size: 12.5px; line-height: 1.65; color: var(--text-dim); font-weight: 300;
}
.hold-notice strong { color: var(--warm-gold); font-weight: 600; }
.hold-notice em { color: var(--text); font-style: normal; font-weight: 600; }
.hold-notice.compact { padding: 12px 14px; font-size: 11.5px; margin-bottom: 14px; }
.hold-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  background: var(--warm-gold); margin-top: 6px;
}

/* ---- CART ---- */
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
@media (max-width: 640px) { .cart-fab { bottom: 84px; } }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px); z-index: 200;
  display: flex; align-items: center; justify-content: center;
  animation: overlayIn 0.2s ease; padding: 20px;
}
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

.product-modal {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; width: 100%; max-width: 480px;
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
  pointer-events: none;
}
.modal-img-placeholder img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  border-radius: 20px 20px 0 0;
}
.modal-thumbs {
  display: flex; gap: 8px; padding: 12px 24px 0; flex-wrap: wrap;
}
.modal-thumb {
  width: 52px; height: 52px; border-radius: 10px; overflow: hidden;
  border: 1.5px solid var(--border); background: var(--bg);
  padding: 0; cursor: pointer; transition: border-color 0.15s, opacity 0.15s;
  opacity: 0.6;
}
.modal-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.modal-thumb:hover { opacity: 1; }
.modal-thumb.active { border-color: var(--sage); opacity: 1; }

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
.modal-size-price { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 16px; }
.modal-size { font-size: 13px; color: var(--text-dim); }
.modal-price { font-size: 20px; font-weight: 800; color: var(--sage); flex-shrink: 0; }
.modal-desc { font-size: 14px; line-height: 1.7; color: var(--text-dim); font-weight: 300; margin-bottom: 20px; }
.modal-specs {
  border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
  padding: 4px 0; margin-bottom: 20px;
}
.modal-spec {
  display: flex; justify-content: space-between; gap: 16px; padding: 9px 0;
  font-size: 13px;
}
.modal-spec span:first-child {
  color: var(--text-dim); font-weight: 500;
  letter-spacing: 0.5px; font-size: 11px; text-transform: uppercase;
  align-self: center;
}
.modal-spec span:last-child { color: var(--text); font-weight: 400; text-align: right; }
.modal-section-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px; }

.add-to-cart-btn, .checkout-btn { transition: filter 0.2s ease, transform 0.15s ease; }
.add-to-cart-btn:not(:disabled):hover, .checkout-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.add-to-cart-btn:not(:disabled):active, .checkout-btn:active { transform: translateY(0); }
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
.cart-close { background: none; border: none; color: var(--text-dim); font-size: 24px; cursor: pointer; transition: color 0.15s; }
.cart-close:hover { color: var(--text); }
.cart-items { flex: 1; overflow-y: auto; padding: 16px 24px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
.cart-empty { text-align: center; padding: 48px 20px; color: var(--text-dim); font-size: 14px; font-weight: 300; line-height: 1.7; }
.cart-item { display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--border); align-items: flex-start; }
.cart-item:last-child { border-bottom: none; }
.cart-item-thumb {
  width: 56px; height: 56px; border-radius: 10px;
  background: linear-gradient(145deg, #1e1b17, #141210); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: var(--border); overflow: hidden;
}
.cart-item-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cart-item-info { flex: 1; min-width: 0; }
.cart-item-name { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
.cart-item-detail { font-size: 12px; color: var(--text-dim); font-weight: 300; }
.cart-item-flag {
  display: inline-block; margin-top: 6px; padding: 3px 8px; border-radius: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--warm-gold); border: 1px solid rgba(219,192,120,0.35);
}
.cart-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.cart-item-price { font-weight: 700; font-size: 14px; color: var(--sage); }
.cart-remove { background: none; border: none; color: var(--text-dim); font-size: 18px; cursor: pointer; padding: 2px; line-height: 1; opacity: 0.5; transition: opacity 0.15s, color 0.15s; }
.cart-remove:hover { opacity: 1; color: var(--dusty-rose); }
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
  border-radius: 20px; width: 100%; max-width: 440px;
  padding: 32px 24px; animation: modalSlideUp 0.3s ease;
  max-height: 90vh; overflow-y: auto;
}
.checkout-title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
.checkout-subtitle { font-size: 14px; color: var(--text-dim); font-weight: 300; margin-bottom: 24px; }
.checkout-summary { background: var(--bg); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.checkout-summary-item { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--text-dim); padding: 4px 0; }
.checkout-summary-total {
  display: flex; justify-content: space-between; font-size: 15px;
  font-weight: 700; color: var(--text); padding-top: 10px; margin-top: 8px;
  border-top: 1px solid var(--border);
}

@keyframes toastIn {
  0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .product-card, .cart-fab, .add-to-cart-btn, .checkout-btn { transition: none; }
  .product-card:hover { transform: none; }
  .product-modal, .cart-drawer, .checkout-modal, .overlay { animation: none; }
}
`;
