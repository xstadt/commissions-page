import { useState } from "react";

/*
  ========================================
  COMMISSIONS PAGE — EDIT YOUR INFO HERE
  ========================================
*/

// Change this to "closed" when you're not taking requests
const COMMISSION_STATUS = "open";

// Your terms — edit these to match your vibe
const TERMS = [
  "50% deposit to reserve your spot, the rest on completion.",
  "Minor adjustments during the sketch phase are included — larger changes after painting starts may have an additional cost.",
  "Finished work may be featured in the portfolio unless otherwise agreed.",
  "Turnaround times are estimates — I'll keep you updated along the way.",
  "Commercial use licensing is available, just let me know upfront.",
  "Refunds are available anytime before painting begins.",
];

/*
  ========================================
  PAGE COMPONENT
  ========================================
*/

export default function Commissions() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    description: "",
    size: "",
    timeline: "",
  });
  const [sent, setSent] = useState(false);

  const update = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <div className="page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Nunito:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&display=swap');

        :root {
          --bg: #1a1714;
          --surface: #242019;
          --border: #3a342b;
          --text: #e8dfd4;
          --text-dim: #9a8e82;
          --sage: #8fad8b;
          --lavender: #b8a5cc;
          --dusty-rose: #d4a0a0;
          --warm-gold: #dbc078;
          --soft-teal: #7fb5b0;
          --blush: #e8c9b8;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .page {
          font-family: 'Nunito', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          padding: 24px 20px 40px;
          max-width: 720px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }

        /* ---- WATERCOLOR BLOBS ---- */
        .blob {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
        }

        /* ---- STATUS BADGE ---- */
        .status {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 28px;
        }
        .status.open {
          background: rgba(143, 173, 139, 0.12);
          color: #a3c9a0;
          border: 1px solid rgba(143, 173, 139, 0.3);
        }
        .status.closed {
          background: rgba(212, 160, 160, 0.15);
          color: var(--dusty-rose);
          border: 1px solid rgba(212, 160, 160, 0.35);
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          animation: breathe 3s ease-in-out infinite;
        }
        @keyframes breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }

        /* ---- HERO ---- */
        .hero { position: relative; z-index: 1; margin-bottom: 48px; }
        .hero-title {
          font-family: 'Caveat', cursive;
          font-size: clamp(42px, 10vw, 72px);
          font-weight: 700;
          line-height: 1.05;
          margin-bottom: 20px;
          color: var(--text);
        }
        .hero-title .flow {
          background: linear-gradient(135deg, var(--lavender), var(--dusty-rose), var(--warm-gold), var(--sage));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          color: var(--text-dim);
          font-size: 16px;
          line-height: 1.8;
          font-weight: 300;
          max-width: 500px;
        }
        .hero-sub em {
          font-style: italic;
          color: var(--text);
          font-weight: 400;
        }

        /* ---- SECTIONS ---- */
        .section-label {
          font-family: 'Caveat', cursive;
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        section {
          margin-bottom: 56px;
          position: relative;
          z-index: 1;
        }

        /* ---- WHAT YOU GET BLURB ---- */
        .offerings {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 28px 24px;
        }
        .offerings p {
          font-size: 15px;
          line-height: 1.8;
          color: var(--text-dim);
          font-weight: 300;
        }
        .offerings p strong {
          color: var(--text);
          font-weight: 600;
        }
        .tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }
        .tag {
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid var(--border);
          color: var(--text-dim);
          transition: all 0.25s ease;
        }
        .tag:nth-child(1) { border-color: var(--lavender); color: #c9b8da; }
        .tag:nth-child(2) { border-color: var(--sage); color: #a3c9a0; }
        .tag:nth-child(3) { border-color: var(--dusty-rose); color: #ddb5b5; }
        .tag:nth-child(4) { border-color: var(--warm-gold); color: #e0cc8a; }
        .tag:nth-child(5) { border-color: var(--soft-teal); color: #99ccc7; }

        /* ---- PROCESS STEPS ---- */
        .steps { display: flex; flex-direction: column; }
        .step {
          display: flex;
          gap: 16px;
          padding: 20px 0;
          border-bottom: 1px solid var(--border);
          align-items: flex-start;
          transition: padding-left 0.25s ease;
        }
        .step:last-child { border-bottom: none; }
        .step:hover { padding-left: 6px; }
        .step-num {
          font-family: 'Caveat', cursive;
          font-size: 36px;
          font-weight: 700;
          color: var(--border);
          flex-shrink: 0;
          width: 44px;
          line-height: 1;
        }
        .step-title {
          font-weight: 700;
          font-size: 16px;
          color: var(--text);
          margin-bottom: 4px;
        }
        .step-desc {
          font-size: 14px;
          color: var(--text-dim);
          line-height: 1.7;
          font-weight: 300;
        }

        /* ---- FORM ---- */
        .form-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 28px 24px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (min-width: 520px) {
          .form-grid { grid-template-columns: 1fr 1fr; }
        }
        .field label {
          display: block;
          font-family: 'Caveat', cursive;
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 6px;
        }
        .field input,
        .field textarea {
          width: 100%;
          background: var(--bg);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          color: var(--text);
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .field input:focus,
        .field textarea:focus {
          border-color: var(--sage);
          box-shadow: 0 0 0 3px rgba(143, 173, 139, 0.12);
        }
        .field textarea {
          min-height: 130px;
          resize: vertical;
        }
        .field input::placeholder,
        .field textarea::placeholder { color: #5a5047; }

        .submit-btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 99px;
          font-family: 'Caveat', cursive;
          font-weight: 700;
          font-size: 22px;
          color: #1a1714;
          background: linear-gradient(135deg, var(--sage), var(--soft-teal), var(--lavender));
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          margin-top: 8px;
          letter-spacing: 0.5px;
        }
        .submit-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 28px rgba(143, 173, 139, 0.3);
        }
        .submit-btn:active { transform: scale(0.98); }

        /* ---- SUCCESS STATE ---- */
        .success {
          text-align: center;
          padding: 48px 20px;
        }
        .success-icon { font-size: 48px; margin-bottom: 12px; }
        .success-title {
          font-family: 'Caveat', cursive;
          font-weight: 700;
          font-size: 32px;
          margin-bottom: 8px;
          color: var(--text);
        }
        .success-msg {
          color: var(--text-dim);
          font-size: 15px;
          line-height: 1.7;
          font-weight: 300;
        }

        /* ---- TERMS ---- */
        .term {
          display: flex;
          gap: 10px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.7;
          font-weight: 300;
          transition: color 0.2s, padding-left 0.2s;
        }
        .term:last-child { border-bottom: none; }
        .term:hover { color: var(--text); padding-left: 6px; }
        .term-dot { color: var(--lavender); flex-shrink: 0; margin-top: 2px; }

        /* ---- FOOTER ---- */
        .footer {
          text-align: center;
          padding-top: 32px;
          border-top: 1px solid var(--border);
          font-family: 'Caveat', cursive;
          font-size: 18px;
          color: var(--border);
          position: relative;
          z-index: 1;
        }
      `}</style>

      {/* WATERCOLOR BACKGROUND BLOBS */}
      <div className="blob" style={{ width: 300, height: 300, background: "var(--lavender)", top: -60, right: -80 }} />
      <div className="blob" style={{ width: 250, height: 250, background: "var(--sage)", top: 300, left: -100 }} />
      <div className="blob" style={{ width: 280, height: 280, background: "var(--dusty-rose)", top: 700, right: -60 }} />
      <div className="blob" style={{ width: 220, height: 220, background: "var(--warm-gold)", top: 1100, left: -40 }} />
      <div className="blob" style={{ width: 260, height: 260, background: "var(--soft-teal)", top: 1500, right: -90 }} />

      {/* STATUS */}
      <div className={`status ${COMMISSION_STATUS}`}>
        <span className="status-dot" />
        {COMMISSION_STATUS === "open" ? "Currently Accepting Work" : "On a Break"}
      </div>

      {/* HERO */}
      <div className="hero">
        <h1 className="hero-title">
          Visual Frequencies<br />
          <span className="flow">Studios</span>
        </h1>
        <p className="hero-sub">
          Original handpainted watercolor — made by a fan, for fans.
          From <em>gig posters</em> and <em>album art</em> to <em>prints
          and promotional pieces</em>, every commission is a one-of-a-kind
          original painted from scratch.
        </p>
      </div>

      {/* WHAT YOU GET */}
      <section>
        <div className="section-label" style={{ color: "var(--lavender)" }}>
          ~ the work
        </div>
        <div className="offerings">
          <p>
            Every piece is <strong>handpainted watercolor</strong> with a
            faded psychedelic aesthetic — soft washes, natural color bleeds,
            and muted tones with a tie-dye warmth. No two paintings come
            out the same, and that's by design.
          </p>
          <div className="tag-row">
            <span className="tag">Posters</span>
            <span className="tag">Prints</span>
            <span className="tag">Promo Art</span>
            <span className="tag">Album Covers</span>
            <span className="tag">Whatever You Have in Mind</span>
          </div>
        </div>
      </section>

      {/* THE PROCESS */}
      <section>
        <div className="section-label" style={{ color: "var(--sage)" }}>
          ~ the process
        </div>
        <div className="steps">
          {[
            { t: "Reach Out", d: "Fill out the form below with your idea. A detailed brief is great, but a rough concept works too." },
            { t: "Get a Quote", d: "I'll follow up within a couple of days with a custom quote and we'll work out the details." },
            { t: "Sketch Approval", d: "You'll receive a pencil sketch before any paint goes down. Revisions happen at this stage." },
            { t: "Paint & Deliver", d: "Once the sketch is approved, I'll bring it to life in watercolor and get the finished piece to you." },
          ].map((s, i) => (
            <div className="step" key={i}>
              <div className="step-num">{i + 1}</div>
              <div>
                <div className="step-title">{s.t}</div>
                <div className="step-desc">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REQUEST FORM */}
      <section>
        <div className="section-label" style={{ color: "var(--dusty-rose)" }}>
          ~ request a commission
        </div>

        {sent ? (
          <div className="form-wrap success">
            <div className="success-icon">🌿</div>
            <div className="success-title">Request received!</div>
            <div className="success-msg">
              I'll review your submission and follow up soon.<br />
              Keep an eye on your inbox.
            </div>
          </div>
        ) : (
          <div className="form-wrap">
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input placeholder="Your name" value={form.name} onChange={update("name")} />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="Where to send your quote" value={form.email} onChange={update("email")} />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Size or Format</label>
                <input placeholder="e.g. 11x14 print, poster, digital scan" value={form.size} onChange={update("size")} />
              </div>
              <div className="field">
                <label>Timeline</label>
                <input placeholder="Any deadline, or flexible" value={form.timeline} onChange={update("timeline")} />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Describe Your Idea</label>
              <textarea
                placeholder="Subject, colors, mood, intended use — the more detail the better, but a rough idea works too. Reference images are always helpful."
                value={form.description}
                onChange={update("description")}
              />
            </div>

            <button className="submit-btn" onClick={() => setSent(true)}>
              Submit Request
            </button>
          </div>
        )}
      </section>

      {/* THE FINE PRINT */}
      <section>
        <div className="section-label" style={{ color: "var(--warm-gold)" }}>
          ~ the ground rules
        </div>
        {TERMS.map((t, i) => (
          <div className="term" key={i}>
            <span className="term-dot">~</span>
            {t}
          </div>
        ))}
      </section>

      {/* FOOTER */}
      <div className="footer">Visual Frequencies Studios ~</div>
    </div>
  );
}
