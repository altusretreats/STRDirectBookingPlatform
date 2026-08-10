/**
 * MarkdownEditor — simple textarea wrapper (toolbar temporarily removed for debugging)
 */

export default function MarkdownEditor({ value, onChange, placeholder, rows = 5, disabled }) {
  return (
    <textarea
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
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
    />
  );
}
