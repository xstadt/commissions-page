import { useEffect } from "react";

// ==========================================
// SHARED COMPONENTS
//
// Small pieces used by more than one page. Pulled out of App.jsx so
// the Store and the order confirmation page can reach them without
// importing the whole app.
// ==========================================

export function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 88,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 99,
        padding: "10px 22px",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--sage)",
        zIndex: 999,
        animation: "toastIn 0.25s ease",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {message}
    </div>
  );
}

export function Footer({ settings }) {
  const links = [
    { label: "Instagram", href: settings?.instagramUrl },
    { label: "TikTok", href: settings?.tiktokUrl },
    { label: "Email", href: settings?.contactEmail ? `mailto:${settings.contactEmail}` : null },
  ].filter((l) => l.href);

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: 64,
        paddingTop: 32,
        paddingBottom: 24,
        textAlign: "center",
      }}
    >
      {links.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--text-dim)",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-dim)")}
            >
              {label}
            </a>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, color: "#5a5047", fontWeight: 300 }}>
        © {new Date().getFullYear()} Visual Frequencies Studios · All pieces are original
        handpainted works
      </div>
    </footer>
  );
}
