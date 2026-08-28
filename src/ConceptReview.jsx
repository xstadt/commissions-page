import { useState, useEffect, useCallback } from "react";
import { client, urlFor } from "./sanityClient";
import { CONCEPT_FORMSPREE_ENDPOINT } from "./lib";

/*
 * ========================================
 * CONCEPT REVIEW — /concepts/<slug>
 * ========================================
 *
 * A private page for showing concept directions to one prospective
 * client. Everything on it is managed in Sanity Studio under
 * "Concept Reviews" — no code changes are needed to add a client.
 *
 * How the lock works, plainly: the password is checked here in the
 * browser. That stops a forwarded link from working and keeps the
 * page out of search results, which is what it is actually for. It
 * is not proof against someone determined who knows how to read a
 * website's data directly. That was a deliberate trade to keep the
 * whole thing free and self-serve, and the watermark is the real
 * protection on the artwork itself.
 *
 * This page mounts on its own from main.jsx, so it does not inherit
 * any styling from App.jsx. Everything it needs is below.
 */

// Published edits should show up right away rather than sitting in
// the CDN cache for a few minutes, so the artist doesn't think the
// page is broken after hitting Publish.
const liveClient = client.withConfig({ useCdn: false });

// Asked first, and on its own. The artwork isn't requested at all
// until the password matches.
const GATE_QUERY = `*[_type == "conceptReview" && slug.current == $slug][0]{
  clientName, status, password
}`;

const CONTENT_QUERY = `{
  "review": *[_type == "conceptReview" && slug.current == $slug][0]{
    clientName, direction, watermark, clientLogo,
    concepts[]{ title, description, image }
  },
  "settings": *[_type == "siteSettings"][0]{
    artistName, contactEmail, contactPhone
  }
}`;

// A repeating diagonal mark laid over each mockup. Drawn in the page
// rather than burned into the file, so the artist can upload clean
// artwork and still have it marked. Turn it off per review in Sanity
// if the files were watermarked before upload.
const WATERMARK = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220">
    <text x="170" y="110" text-anchor="middle"
      transform="rotate(-30 170 110)"
      font-family="Inter, Helvetica, Arial, sans-serif"
      font-size="17" font-weight="700" letter-spacing="1.5"
      fill="rgba(255,255,255,0.30)">VISUAL FREQUENCIES</text>
  </svg>`.replace(/\s+/g, " ")
);

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  .cr-root {
    --bg: #0e0d0b; --surface: #181613; --border: #2e2a24;
    --text: #e8dfd4; --text-dim: #9a8e82;
    --sage: #8fad8b; --lavender: #b8a5cc; --dusty-rose: #d4a0a0;
    --warm-gold: #dbc078; --soft-teal: #7fb5b0;

    font-family: 'Inter', sans-serif;
    background: var(--bg); color: var(--text);
    min-height: 100vh; padding: 48px 20px 64px;
    max-width: 760px; margin: 0 auto;
  }
  .cr-root * { margin: 0; padding: 0; box-sizing: border-box; }

  /* ---------- lock screen ---------- */
  .cr-lock {
    min-height: 80vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
  }
  .cr-lock-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 36px 28px; width: 100%; max-width: 400px;
  }
  .cr-lock-eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: 3px;
    text-transform: uppercase; color: var(--text-dim); margin-bottom: 14px;
  }
  .cr-lock-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px; }
  .cr-lock-sub { font-size: 14px; line-height: 1.7; color: var(--text-dim); font-weight: 300; margin-bottom: 24px; }
  .cr-input {
    width: 100%; background: var(--bg); border: 1.5px solid var(--border);
    border-radius: 12px; padding: 13px 15px; color: var(--text);
    font-family: 'Inter', sans-serif; font-size: 15px; outline: none;
    text-align: center; letter-spacing: 1px;
  }
  .cr-input:focus { border-color: var(--sage); }
  .cr-input::placeholder { color: #5a5047; letter-spacing: 0; }
  .cr-btn {
    width: 100%; padding: 15px; border: none; border-radius: 99px;
    font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14px;
    color: #0e0d0b; letter-spacing: 1px; text-transform: uppercase;
    background: linear-gradient(135deg, var(--sage), var(--soft-teal), var(--lavender));
    cursor: pointer; margin-top: 14px;
  }
  .cr-btn[disabled] { opacity: 0.55; cursor: not-allowed; }
  .cr-error { color: var(--dusty-rose); font-size: 13px; font-weight: 500; margin-top: 14px; }

  /* ---------- header ---------- */
  .cr-header { text-align: center; margin-bottom: 44px; }
  .cr-client-logo { max-width: min(260px, 70%); height: auto; margin-bottom: 24px; }
  .cr-eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: 3px;
    text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px;
  }
  .cr-title {
    font-size: clamp(32px, 8vw, 52px); font-weight: 800;
    line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 8px;
  }
  .cr-title .flow {
    background: linear-gradient(135deg, var(--lavender), var(--dusty-rose), var(--warm-gold), var(--sage));
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }

  /* ---------- direction ---------- */
  .cr-label { font-size: 12px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 18px; }
  .cr-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 26px 24px; }
  .cr-card p { font-size: 15px; line-height: 1.85; color: var(--text-dim); font-weight: 300; white-space: pre-line; }
  .cr-section { margin-bottom: 52px; }

  /* ---------- concepts ---------- */
  .cr-concept { margin-bottom: 44px; }
  .cr-concept-num {
    font-size: 11px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px;
  }
  .cr-concept-title { font-size: 21px; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.3px; }
  .cr-frame {
    position: relative; border-radius: 16px; overflow: hidden;
    border: 1px solid var(--border);
    background: linear-gradient(145deg, #1e1b17, #141210);
    margin-bottom: 16px;
  }
  .cr-frame img {
    width: 100%; height: auto; display: block;
    -webkit-user-drag: none; user-select: none; -webkit-user-select: none;
  }
  .cr-frame.marked::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background-image: url("data:image/svg+xml,${WATERMARK}");
    background-repeat: repeat;
  }
  .cr-concept-desc { font-size: 15px; line-height: 1.85; color: var(--text-dim); font-weight: 300; white-space: pre-line; }

  /* ---------- feedback ---------- */
  .cr-choices { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
  .cr-choice {
    text-align: left; padding: 15px 18px; border-radius: 14px;
    border: 1.5px solid var(--border); background: var(--bg);
    color: var(--text-dim); font-family: 'Inter', sans-serif;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .cr-choice:hover { border-color: var(--text-dim); color: var(--text); }
  .cr-choice.on { border-color: var(--sage); color: var(--text); background: rgba(143,173,139,0.09); }
  .cr-note {
    width: 100%; background: var(--bg); border: 1.5px solid var(--border);
    border-radius: 12px; padding: 13px 15px; color: var(--text);
    font-family: 'Inter', sans-serif; font-size: 14px; outline: none;
    min-height: 96px; resize: vertical;
  }
  .cr-note:focus { border-color: var(--sage); }
  .cr-note::placeholder { color: #5a5047; }

  /* ---------- contact + states ---------- */
  .cr-contact { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 32px; text-align: center; }
  .cr-contact-name { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
  .cr-contact a { color: var(--text-dim); font-size: 14px; text-decoration: none; font-weight: 500; }
  .cr-contact a:hover { color: var(--text); }
  .cr-contact-row { display: flex; justify-content: center; gap: 22px; flex-wrap: wrap; }
  .cr-foot { text-align: center; font-size: 12px; color: #5a5047; font-weight: 300; margin-top: 40px; line-height: 1.7; }
  .cr-msg { min-height: 70vh; display: flex; align-items: center; justify-content: center; text-align: center; }
  .cr-msg-inner { max-width: 380px; }
  .cr-msg-title { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
  .cr-msg-body { font-size: 14px; line-height: 1.75; color: var(--text-dim); font-weight: 300; }
  .cr-skel { background: var(--border); border-radius: 12px; animation: crPulse 1.5s ease-in-out infinite; }
  @keyframes crPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }
  @media (prefers-reduced-motion: reduce) { .cr-skel { animation: none; } }
`;

// Remembers the unlock for this browser tab only. Closing the tab
// means typing the password again, which is the behaviour you want
// on a shared or borrowed machine.
const unlockKey = (slug) => `vfs-concept:${slug}`;

function readUnlocked(slug) {
  try {
    return window.sessionStorage.getItem(unlockKey(slug)) === "1";
  } catch {
    return false; // private browsing, storage disabled — just ask again
  }
}

function writeUnlocked(slug) {
  try {
    window.sessionStorage.setItem(unlockKey(slug), "1");
  } catch {
    /* not being able to remember is survivable */
  }
}

function Message({ title, body }) {
  return (
    <div className="cr-root">
      <style>{STYLES}</style>
      <div className="cr-msg">
        <div className="cr-msg-inner">
          <div className="cr-msg-title">{title}</div>
          <div className="cr-msg-body">{body}</div>
        </div>
      </div>
    </div>
  );
}

export default function ConceptReview({ slug }) {
  // "checking" -> "locked" -> "loading" -> "ready"
  // with "missing", "archived" and "error" as dead ends.
  const [phase, setPhase] = useState("checking");
  const [gate, setGate] = useState(null);
  const [data, setData] = useState(null);

  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(false);

  const [choice, setChoice] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Belt and braces alongside robots.txt and the header set in
  // vercel.json — this one also covers crawlers that run JavaScript.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive, nosnippet, noimageindex";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  // Step one: does this page exist, and is it still active?
  useEffect(() => {
    let cancelled = false;
    liveClient
      .fetch(GATE_QUERY, { slug })
      .then((found) => {
        if (cancelled) return;
        if (!found) { setPhase("missing"); return; }
        if (found.status === "archived") { setPhase("archived"); return; }
        setGate(found);
        document.title = `${found.clientName} — Concepts`;
        setPhase(readUnlocked(slug) ? "loading" : "locked");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Concept review lookup failed:", err);
        setPhase("error");
      });
    return () => { cancelled = true; };
  }, [slug]);

  // Step two: the artwork, fetched only once we're past the password.
  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;
    liveClient
      .fetch(CONTENT_QUERY, { slug })
      .then((result) => {
        if (cancelled) return;
        if (!result?.review) { setPhase("missing"); return; }
        setData(result);
        setPhase("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Concept content fetch failed:", err);
        setPhase("error");
      });
    return () => { cancelled = true; };
  }, [phase, slug]);

  const tryUnlock = useCallback(() => {
    const given = entry.trim().toLowerCase();
    const real = (gate?.password || "").trim().toLowerCase();
    if (!given) return;
    if (given === real) {
      writeUnlocked(slug);
      setWrong(false);
      setPhase("loading");
    } else {
      setWrong(true);
      setEntry("");
    }
  }, [entry, gate, slug]);

  const sendFeedback = useCallback(async () => {
    if (!choice) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(CONCEPT_FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          form_type: "Concept Feedback",
          client: data?.review?.clientName || slug,
          response: choice,
          notes: note.trim() || "None",
          page: window.location.href,
        }),
      });
      if (res.ok) setSent(true);
      else setSendError("That didn't go through. Please try again, or email me directly.");
    } catch {
      setSendError("Network error — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }, [choice, note, data, slug]);

  if (phase === "checking") {
    return (
      <div className="cr-root">
        <style>{STYLES}</style>
        <div style={{ maxWidth: 400, margin: "20vh auto 0" }}>
          <div className="cr-skel" style={{ height: 14, width: "40%", marginBottom: 14 }} />
          <div className="cr-skel" style={{ height: 40, marginBottom: 10 }} />
          <div className="cr-skel" style={{ height: 14, width: "70%" }} />
        </div>
      </div>
    );
  }

  if (phase === "missing") {
    return (
      <Message
        title="Nothing here"
        body="This link isn't valid. Double-check it against the one you were sent — it may have a typo, or it may have been taken down."
      />
    );
  }

  if (phase === "archived") {
    return (
      <Message
        title="No longer available"
        body="This concept review has been closed out. Get in touch with Visual Frequencies Studios if you need access again."
      />
    );
  }

  if (phase === "error") {
    return (
      <Message
        title="Couldn't load this page"
        body="Something went wrong on our end. Please refresh and try again in a moment."
      />
    );
  }

  if (phase === "locked") {
    return (
      <div className="cr-root">
        <style>{STYLES}</style>
        <div className="cr-lock">
          <div className="cr-lock-card">
            <div className="cr-lock-eyebrow">Visual Frequencies Studios</div>
            <div className="cr-lock-title">Concepts for {gate.clientName}</div>
            <div className="cr-lock-sub">
              This page is private. Enter the password you were sent to view it.
            </div>
            <input
              className="cr-input"
              type="password"
              placeholder="Password"
              value={entry}
              autoFocus
              autoComplete="off"
              onChange={(e) => { setEntry(e.target.value); setWrong(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
            />
            <button className="cr-btn" onClick={tryUnlock} disabled={!entry.trim()}>
              View Concepts
            </button>
            {wrong && (
              <div className="cr-error">
                That password didn't match. Check the message you were sent.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="cr-root">
        <style>{STYLES}</style>
        <div className="cr-skel" style={{ height: 42, width: "60%", margin: "0 auto 32px" }} />
        <div className="cr-skel" style={{ height: 120, marginBottom: 44 }} />
        <div className="cr-skel" style={{ height: 300, marginBottom: 20 }} />
        <div className="cr-skel" style={{ height: 300 }} />
      </div>
    );
  }

  const review = data.review;
  const settings = data.settings || {};
  const concepts = review.concepts || [];
  const marked = review.watermark !== false;

  const options = [
    ...concepts.map((c, i) => `Interested in Concept ${i + 1}${c.title ? ` — ${c.title}` : ""}`),
    "Request adjustments",
  ];

  return (
    <div className="cr-root">
      <style>{STYLES}</style>

      <header className="cr-header">
        {review.clientLogo && (
          <img
            className="cr-client-logo"
            src={urlFor(review.clientLogo).width(640).quality(85).auto("format").url()}
            alt={review.clientName}
          />
        )}
        <div className="cr-eyebrow">Visual Frequencies Studios</div>
        <h1 className="cr-title">
          {review.clientName}<br /><span className="flow">Concepts</span>
        </h1>
      </header>

      <section className="cr-section">
        <div className="cr-label" style={{ color: "var(--lavender)" }}>~ the direction</div>
        <div className="cr-card"><p>{review.direction}</p></div>
      </section>

      <section className="cr-section">
        <div className="cr-label" style={{ color: "var(--sage)" }}>~ the concepts</div>
        {concepts.map((c, i) => (
          <article className="cr-concept" key={i}>
            <div className="cr-concept-num">Concept {i + 1}</div>
            <h2 className="cr-concept-title">{c.title}</h2>
            <div className={`cr-frame${marked ? " marked" : ""}`}>
              {c.image && (
                <img
                  src={urlFor(c.image).width(1400).quality(80).auto("format").url()}
                  alt={c.title}
                  loading="lazy"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
            </div>
            <p className="cr-concept-desc">{c.description}</p>
          </article>
        ))}
      </section>

      <section className="cr-section">
        <div className="cr-label" style={{ color: "var(--dusty-rose)" }}>~ your thoughts</div>
        {sent ? (
          <div className="cr-card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Thanks — got it</div>
            <p style={{ fontSize: 14 }}>
              {settings.artistName || "I"} will be in touch shortly to talk through next steps.
            </p>
          </div>
        ) : (
          <div className="cr-card">
            <div className="cr-choices">
              {options.map((label) => (
                <button
                  key={label}
                  className={`cr-choice${choice === label ? " on" : ""}`}
                  onClick={() => setChoice(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              className="cr-note"
              placeholder="Anything you'd change, or anything you want more of? Optional, but helpful."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {sendError && <div className="cr-error">{sendError}</div>}
            <button
              className="cr-btn"
              onClick={sendFeedback}
              disabled={!choice || sending}
            >
              {sending ? "Sending..." : "Send Feedback"}
            </button>
          </div>
        )}
      </section>

      <div className="cr-contact">
        {settings.artistName && <div className="cr-contact-name">{settings.artistName}</div>}
        <div className="cr-contact-row">
          {settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
          )}
          {settings.contactPhone && (
            <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}>
              {settings.contactPhone}
            </a>
          )}
        </div>
      </div>

      <div className="cr-foot">
        These concepts are unreleased work shared in confidence for {review.clientName}.<br />
        © {new Date().getFullYear()} Visual Frequencies Studios
      </div>
    </div>
  );
}
