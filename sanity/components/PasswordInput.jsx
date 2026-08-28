import { useCallback } from 'react';
import { set, useFormValue } from 'sanity';

// ==========================================
// PASSWORD FIELD
//
// The normal text box, plus a Suggest button that builds something
// like "spafford26" from the link address and the current year.
// The suggestion is only a starting point — type over it freely.
// ==========================================

export default function PasswordInput(props) {
  const { onChange, renderDefault } = props;

  const slug = useFormValue(['slug', 'current']);
  const clientName = useFormValue(['clientName']);

  const suggest = useCallback(() => {
    const base = (slug || clientName || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!base) return;
    const year = String(new Date().getFullYear()).slice(-2);
    onChange(set(`${base}${year}`));
  }, [slug, clientName, onChange]);

  const ready = Boolean(slug || clientName);

  return (
    <div>
      {renderDefault(props)}
      <button
        type="button"
        onClick={suggest}
        disabled={!ready}
        style={{
          appearance: 'none',
          marginTop: 8,
          border: '1px solid var(--card-border-color, #d6d6d6)',
          borderRadius: 4,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'inherit',
          color: 'inherit',
          background: 'transparent',
          cursor: ready ? 'pointer' : 'not-allowed',
          opacity: ready ? 1 : 0.5,
        }}
      >
        Suggest a password
      </button>
    </div>
  );
}
