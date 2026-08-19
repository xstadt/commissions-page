import { useState, useEffect } from "react";
import logo from "./logo.png";
import { client, urlFor } from "./sanityClient";
import { Footer } from "./shared";
import { SKELETON_CSS, validateEmail, FORMSPREE_ENDPOINT } from "./lib";
import StorePage from "./StorePage";
import OrderSuccess from "./OrderSuccess";

/*
 * ========================================
 * VISUAL FREQUENCIES STUDIOS — V9
 * ========================================
 *
 * CHANGES FROM V8:
 * - The shop is no longer bottles-only. Products carry a category,
 *   optional size/materials, extra photos, and a compare-at price,
 *   all managed in Sanity.
 * - Store moved to StorePage.jsx and grew search, category filters,
 *   and sorting.
 * - Products can be set to "Ask me first" in Sanity, which holds the
 *   customer's card instead of charging it until the artist approves.
 * - The old success toast is now a real confirmation page
 *   (OrderSuccess.jsx) that reads the actual order back from Stripe.
 * - Shared helpers live in shared.jsx so every page uses the same ones.
 *
 * NOTE: sanityClient.js must exist at src/sanityClient.js
 */

// ==========================================
// GROQ QUERIES
// (product queries live in StorePage.jsx)
// ==========================================
const GALLERY_QUERY = `*[_type == "galleryItem"] | order(order asc) {
  "id": _id, title, category, medium, year, image
}`;

const SETTINGS_QUERY = `*[_type == "siteSettings"][0]{
  commissionStatus, storeIntro, portrait, aboutIntro, stats, story, approach,
  studioPhotos, instagramUrl, tiktokUrl, contactEmail
}`;

// ==========================================
// PAGE: COMMISSIONS
// ==========================================

function CommissionsPage({ settings }) {
  const [form, setForm] = useState({ name: "", email: "", description: "", size: "", timeline: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [errors, setErrors] = useState({});

  const status = settings?.commissionStatus || "open";

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
    <div className={`status ${status}`}>
    <span className="status-dot" />
    {status === "open" ? "Currently Accepting Work" : "On a Break"}
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
    <Footer settings={settings} />
    </>
  );
}


// ==========================================
// PAGE: GALLERY
// ==========================================

const GALLERY_CATEGORIES = ["All", "Posters", "Prints", "Album Art", "Promo"];

function GalleryPage({ settings }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let cancelled = false;
    client.fetch(GALLERY_QUERY)
    .then((data) => {
      if (cancelled) return;
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    })
    .catch((err) => {
      if (cancelled) return;
      console.error("Sanity gallery fetch failed:", err);
      setLoadError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const filtered = activeFilter === "All"
  ? items
  : items.filter((p) => p.category === activeFilter);

  // Only show filter buttons for categories that actually have work in them
  const visibleCategories = GALLERY_CATEGORIES.filter(
    (cat) => cat === "All" || items.some((i) => i.category === cat)
  );

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
      .gallery-item.is-skeleton { pointer-events: none; }
      .gallery-item.is-skeleton:hover { transform: none; border-color: var(--border); }

      .gallery-placeholder {
        width: 100%; background: linear-gradient(145deg, #1e1b17, #141210);
        display: flex; align-items: center; justify-content: center;
        color: var(--border); font-size: 28px; position: relative; overflow: hidden;
      }
      .gallery-placeholder::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(143,173,139,0.05) 0%, rgba(184,165,204,0.05) 100%);
        pointer-events: none;
      }
      .gallery-placeholder img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .gallery-item:nth-child(odd) .gallery-placeholder { aspect-ratio: 3/4; }
      .gallery-item:nth-child(even) .gallery-placeholder { aspect-ratio: 4/5; }
      .gallery-item:nth-child(3n) .gallery-placeholder { aspect-ratio: 1/1; }

      .gallery-overlay {
        position: absolute; inset: 0; background: rgba(14,13,11,0.7);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px;
        opacity: 0; transition: opacity 0.2s ease; z-index: 2;
        text-align: center; padding: 12px;
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
        animation: overlayIn 0.2s ease; padding: 24px;
      }
      @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
      .lightbox-inner {
        position: relative; max-width: 680px; width: 100%;
      }
      .lightbox-img {
        width: 100%; border-radius: 16px; overflow: hidden;
        background: linear-gradient(145deg, #1e1b17, #141210);
        display: flex; align-items: center;
        justify-content: center; font-size: 64px; color: var(--border);
        max-height: 72vh;
      }
      .lightbox-img img {
        width: 100%; height: auto; display: block;
        max-height: 72vh; object-fit: contain;
      }
      .lightbox-info {
        margin-top: 16px; display: flex;
        justify-content: space-between; align-items: center; gap: 16px;
      }
      .lightbox-title { font-size: 16px; font-weight: 700; }
      .lightbox-cat { font-size: 12px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; }
      .lightbox-meta { font-size: 12px; color: var(--text-dim); text-align: right; font-weight: 300; }
      .lightbox-close {
        position: absolute; top: -16px; right: -16px; width: 40px; height: 40px;
        border-radius: 50%; background: var(--surface); border: 1px solid var(--border);
        color: var(--text); font-size: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: border-color 0.15s; z-index: 2;
      }
      .lightbox-close:hover { border-color: var(--text-dim); }
      @media (max-width: 560px) {
        .lightbox-close { top: 8px; right: 8px; background: rgba(0,0,0,0.6); }
      }
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
      Illustration, design, and ideas made visual. Original artwork for gig posters, album covers, merchandise, and limited edition prints
      </p>
      </div>

      <section>
      {!loading && !loadError && items.length > 0 && (
        <div className="gallery-filters">
        {visibleCategories.map((cat) => (
          <button
          key={cat}
          className={`filter-btn ${activeFilter === cat ? "active" : ""}`}
          onClick={() => setActiveFilter(cat)}
          >{cat}</button>
        ))}
        </div>
      )}

      {loading ? (
        <div className="gallery-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div className="gallery-item is-skeleton" key={i}>
          <div className="gallery-placeholder skel-shimmer" />
          </div>
        ))}
        </div>
      ) : loadError ? (
        <div className="card">
        <p>Couldn't load the gallery right now. Please refresh and try again.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
        <p>New work coming soon.</p>
        </div>
      ) : (
        <div className="gallery-grid">
        {filtered.map((item) => (
          <div className="gallery-item" key={item.id} onClick={() => setLightbox(item)}>
          <div className="gallery-placeholder">
          {item.image
            ? <img
            src={urlFor(item.image).width(600).quality(75).auto("format").url()}
            alt={item.title}
            loading="lazy"
            />
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
      )}
      </section>

      <Footer settings={settings} />

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
        <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        <div className="lightbox-img">
        {lightbox.image
          ? <img
          src={urlFor(lightbox.image).width(1400).quality(85).auto("format").url()}
          alt={lightbox.title}
          />
          : "🎨"
        }
        </div>
        <div className="lightbox-info">
        <div>
        <div className="lightbox-title">{lightbox.title}</div>
        <div className="lightbox-cat">{lightbox.category}</div>
        </div>
        {(lightbox.medium || lightbox.year) && (
          <div className="lightbox-meta">
          {lightbox.medium}
          {lightbox.medium && lightbox.year ? " · " : ""}
          {lightbox.year}
          </div>
        )}
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

function AboutPage({ settings }) {
  const stats = settings?.stats?.length ? settings.stats : [];
  const studioPhotos = settings?.studioPhotos || [];

  return (
    <>
    <style>{`
      .about-hero {
        display: flex; gap: 24px; align-items: flex-start;
        margin-bottom: 48px; flex-wrap: wrap;
      }
      .about-portrait-wrap {
        flex: 0 0 220px; min-width: 140px;
        border-radius: 20px; overflow: hidden;
        border: 1px solid var(--border);
        background: linear-gradient(145deg, #1e1b17, #141210);
        aspect-ratio: 3/4;
      }
      .about-portrait-wrap img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .about-hero-text {
        flex: 1; min-width: 200px; padding-top: 4px;
      }
      .about-hero-text h1 { margin-bottom: 16px; }

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

      .about-photo-strip {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 20px;
      }
      .about-photo {
        border-radius: 14px; overflow: hidden;
        border: 1px solid var(--border);
        background: linear-gradient(145deg, #1e1b17, #141210);
        aspect-ratio: 1/1;
      }
      .about-photo img {
        width: 100%; height: 100%; object-fit: cover; display: block;
        transition: transform 0.4s ease;
      }
      .about-photo:hover img { transform: scale(1.04); }

      .about-body { white-space: pre-line; }

      @media (max-width: 480px) {
        .about-portrait-wrap { flex: 0 0 130px; }
        .about-photo-strip { grid-template-columns: 1fr 1fr; }
        .about-photo:nth-child(n+3) { display: none; }
      }
      `}</style>

      <div className="about-hero">
      {settings?.portrait && (
        <div className="about-portrait-wrap">
        <img
        src={urlFor(settings.portrait).width(600).height(800).quality(80).auto("format").url()}
        alt="The artist"
        />
        </div>
      )}
      <div className="about-hero-text">
      <h1 className="hero-title">The<br /><span className="flow">Artist</span></h1>
      <p className="hero-sub">
      {settings?.aboutIntro || "Handpainted mixed media from someone who lives and breathes the music."}
      </p>
      </div>
      </div>

      {stats.length > 0 && (
        <div className="about-stats">
        {stats.map((s, i) => (
          <div className="about-stat" key={i}>
          <div className="about-stat-value">{s.value}</div>
          <div className="about-stat-label">{s.label}</div>
          </div>
        ))}
        </div>
      )}

      {settings?.story && (
        <section>
        <div className="section-label" style={{ color: "var(--lavender)" }}>~ the story</div>
        <div className="card">
        <p className="about-body">{settings.story}</p>
        </div>
        </section>
      )}

      {settings?.approach && (
        <section>
        <div className="section-label" style={{ color: "var(--sage)" }}>~ the approach</div>
        <div className="card">
        <p className="about-body">{settings.approach}</p>
        </div>
        </section>
      )}

      {studioPhotos.length > 0 && (
        <section>
        <div className="section-label" style={{ color: "var(--dusty-rose)" }}>~ in the studio</div>
        <div className="about-photo-strip">
        {studioPhotos.map((photo, i) => (
          <div className="about-photo" key={photo._key || i}>
          <img
          src={urlFor(photo).width(500).height(500).quality(78).auto("format").url()}
          alt={photo.alt || "In the studio"}
          loading="lazy"
          />
          </div>
        ))}
        </div>
        </section>
      )}

      <Footer settings={settings} />
      </>
  );
}

// ==========================================
// TABS
// ==========================================
const TABS = [
  { id: "gallery", label: "Gallery", component: GalleryPage },
  { id: "store", label: "Store", component: StorePage },
  { id: "commissions", label: "Commissions", component: CommissionsPage },
  { id: "about", label: "About", component: AboutPage },
];

// ==========================================
// MAIN APP
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState("gallery");
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState(null);

  // Stripe sends people back to "/?order=success&session_id=...".
  // Read it once on mount, before the tabs render, so the confirmation
  // page takes over the whole screen instead of flashing behind a modal.
  // The URL is left alone until the customer dismisses it, because the
  // session id is what the confirmation page looks the order up with.
  const [orderResult, setOrderResult] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("order");
    if (result !== "success" && result !== "cancelled") return null;
    return { result, sessionId: params.get("session_id") };
  });

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || TABS[0].component;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    client.fetch(SETTINGS_QUERY)
    .then((data) => setSettings(data || {}))
    .catch((err) => {
      console.error("Sanity settings fetch failed:", err);
      setSettings({});
    });
  }, []);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setOrderResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Leaving the confirmation page also scrubs the order params, so a
  // refresh doesn't drop them back onto it.
  const leaveOrderPage = (tabId) => {
    window.history.replaceState({}, "", window.location.pathname);
    setOrderResult(null);
    setActiveTab(tabId === "gallery" ? "gallery" : "store");
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

      ${SKELETON_CSS}

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
        position: relative;
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
      .bottomnav-btn.active::before { opacity: 1; }

      @media (max-width: 640px) {
        .topnav-links { display: none; }
        .bottomnav { display: block; }
        .page { padding-bottom: 80px; padding-top: 72px; }
      }
      @media (min-width: 641px) {
        .page { padding-top: 80px; }
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
      {(orderResult || activeTab !== "gallery") && (
        <img src={logo} alt="Visual Frequencies Studios" />
      )}
      </div>
      <div className="topnav-links">
      {TABS.map((tab) => (
        <button key={tab.id} className={`nav-link${!orderResult && activeTab === tab.id ? " active" : ""}`}
        onClick={() => switchTab(tab.id)}>{tab.label}</button>
      ))}
      </div>
      </div>
      </nav>

      {/* BOTTOM TAB BAR — mobile only */}
      <nav className="bottomnav">
      <div className="bottomnav-inner">
      {TABS.map((tab) => (
        <button key={tab.id} className={`bottomnav-btn${!orderResult && activeTab === tab.id ? " active" : ""}`}
        onClick={() => switchTab(tab.id)}>
        {tab.id === "gallery" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        )}
        {tab.id === "store" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h16l-1.2 11a2 2 0 01-2 1.8H7.2a2 2 0 01-2-1.8L4 8z"/><path d="M9 11V6.5a3 3 0 016 0V11"/>
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

      {orderResult ? (
        <div className="tab-content" key="order-result">
        <OrderSuccess
        result={orderResult.result}
        sessionId={orderResult.sessionId}
        settings={settings}
        onDone={leaveOrderPage}
        />
        </div>
      ) : (
        <div className="tab-content" key={activeTab}>
        <ActiveComponent settings={settings} />
        </div>
      )}
      </div>
  );
}
