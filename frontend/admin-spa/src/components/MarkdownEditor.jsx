/**
 * MarkdownEditor — uncontrolled textarea that preserves cursor position.
 * Uses imperative DOM management to avoid React's cursor-reset behavior.
 */
import { useRef, useLayoutEffect } from 'react';

export default function MarkdownEditor({ value, onChange, placeholder, rows = 5, disabled }) {
  const ref = useRef(null);

  // On mount: set initial value
  useLayoutEffect(() => {
    if (ref.current) ref.current.value = value ?? '';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When parent changes value externally (e.g. loading saved data),
  // update the DOM only if the textarea isn't currently focused.
  // Never touch it while the user is typing — that would reset the cursor.
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (document.activeElement !== ref.current) {
      ref.current.value = value ?? '';
    }
  }, [value]);

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
