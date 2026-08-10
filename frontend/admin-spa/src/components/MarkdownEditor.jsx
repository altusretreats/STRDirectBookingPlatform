/**
 * MarkdownEditor — uncontrolled textarea with safe cursor preservation.
 * Only updates the DOM value when content actually differs AND textarea is not focused.
 * This prevents Windows Chrome from resetting cursor/selection on re-render.
 */
import { useRef, useLayoutEffect } from 'react';

export default function MarkdownEditor({ value, onChange, placeholder, rows = 5, disabled }) {
  const ref = useRef(null);

  // After every render: sync DOM ← prop only when the content actually changed
  // AND the textarea is not focused. Never touch the DOM while the user is typing.
  useLayoutEffect(() => {
    if (!ref.current) return;
    const propValue = value ?? '';
    if (document.activeElement !== ref.current && ref.current.value !== propValue) {
      ref.current.value = propValue;
    }
  });

  return (
    <textarea
      ref={ref}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: 8,
        outline: 'none',
        fontSize: 14,
        fontFamily: 'inherit',
        color: '#111827',
        resize: 'vertical',
        lineHeight: 1.6,
        boxSizing: 'border-box',
        display: 'block',
        opacity: disabled ? 0.6 : 1,
      }}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
    />
  );
}
