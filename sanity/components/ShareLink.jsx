import { useState, useCallback } from 'react';
import { useFormValue } from 'sanity';

// ==========================================
// CLIENT LINK PANEL
//
// A display-only field. It shows the finished web address and
// password for this concept review, with buttons to copy either
// the plain link or a ready-to-send invite message.
//
// Deliberately written with plain HTML and inline styles rather
// than Sanity's component library, so there is nothing extra to
// install and nothing to break when Studio updates.
// ==========================================

const SITE_ORIGIN = 'https://visualfrequenciesstudios.com';

const box = {
  border: '1px solid var(--card-border-color, #d6d6d6)',
  borderRadius: 6,
  padding: 14,
  background: 'var(--card-bg-color, #fff)',
};

const label = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  opacity: 0.6,
  marginBottom: 4,
};

const value = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
  wordBreak: 'break-all',
  marginBottom: 12,
};

const button = {
  appearance: 'none',
  border: '1px solid var(--card-border-color, #d6d6d6)',
  borderRadius: 4,
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  background: 'transparent',
  color: 'inherit',
  fontFamily: 'inherit',
};

export default function ShareLink() {
  const slug = useFormValue(['slug', 'current']);
  const password = useFormValue(['password']);
  const clientName = useFormValue(['clientName']);
  const status = useFormValue(['status']);

  const [copied, setCopied] = useState(null);

  const url = slug ? `${SITE_ORIGIN}/concepts/${slug}` : null;

  const invite = url
    ? `Here are the concepts for ${clientName || 'your project'}:\n\n` +
      `${url}\nPassword: ${password || '(not set yet)'}\n\n` +
      `The page will ask for the password before it shows anything. ` +
      `Have a look and let me know which direction feels right.`
    : null;

  const copy = useCallback((text, which) => {
    const done = () => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {});
      return;
    }
    // Older browsers, and any context where the clipboard API is blocked.
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      done();
    } catch {
      /* nothing sensible to do here */
    }
    document.body.removeChild(el);
  }, []);

  if (!slug) {
    return (
      <div style={{ ...box, opacity: 0.75 }}>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          Fill in the client name above and click <strong>Generate</strong> next to
          Link Address. The shareable link will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={label}>Link</div>
      <div style={value}>{url}</div>

      <div style={label}>Password</div>
      <div style={value}>{password || '— not set yet —'}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={button} onClick={() => copy(url, 'link')}>
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </button>
        <button type="button" style={button} onClick={() => copy(invite, 'invite')}>
          {copied === 'invite' ? 'Copied' : 'Copy invite message'}
        </button>
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 12, opacity: 0.7 }}>
        {status === 'archived'
          ? 'This review is archived, so the link currently shows a "no longer available" message.'
          : 'The link only works once this document is published.'}
      </div>
    </div>
  );
}
