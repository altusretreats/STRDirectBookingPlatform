/**
 * MarkdownEditor — textarea with formatting toolbar and preview toggle.
 * No external dependencies — uses a lightweight inline markdown renderer.
 */
import { useState, useRef, useEffect } from 'react';

// ── Lightweight markdown → HTML ────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:700;margin:12px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:1.1rem;font-weight:700;margin:14px 0 6px">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:1.25rem;font-weight:700;margin:16px 0 8px">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li style="margin:2px 0">$1</li>')
    // Line breaks → paragraphs
    .replace(/\n\n+/g, '</p><p style="margin:0 0 10px">')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>)(\s*<li[^>]*>.*?<\/li>)*/gs, m => `<ul style="margin:6px 0;padding-left:20px">${m}</ul>`);

  return `<p style="margin:0 0 10px">${html}</p>`;
}

// ── Toolbar action: wrap selection or insert snippet ───────────────────────────
function applyFormat(textarea, format) {
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  const sel   = textarea.value.slice(start, end);
  const before = textarea.value.slice(0, start);
  const after  = textarea.value.slice(end);

  let insertion = '';
  let cursorOffset = 0;

  switch (format) {
    case 'bold':
      insertion   = `**${sel || 'bold text'}**`;
      cursorOffset = sel ? insertion.length : 2;
      break;
    case 'italic':
      insertion   = `*${sel || 'italic text'}*`;
      cursorOffset = sel ? insertion.length : 1;
      break;
    case 'h2':
      insertion   = `\n## ${sel || 'Heading'}\n`;
      cursorOffset = insertion.length;
      break;
    case 'h3':
      insertion   = `\n### ${sel || 'Sub-heading'}\n`;
      cursorOffset = insertion.length;
      break;
    case 'bullet':
      insertion   = sel
        ? sel.split('\n').map(l => `- ${l}`).join('\n')
        : `- list item`;
      cursorOffset = insertion.length;
      break;
    case 'rule':
      insertion   = `\n---\n`;
      cursorOffset = insertion.length;
      break;
    default:
      return;
  }

  const newValue = before + insertion + after;
  const newCursor = start + cursorOffset;

  // React-friendly value update via native input setter
  const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  nativeInputSetter.call(textarea, newValue);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.setSelectionRange(newCursor, newCursor);
  textarea.focus();
}

const TOOLS = [
  { id: 'bold',   label: 'B',   title: 'Bold (Ctrl+B)',   style: { fontWeight: 700 } },
  { id: 'italic', label: 'I',   title: 'Italic (Ctrl+I)', style: { fontStyle: 'italic' } },
  { id: 'h2',     label: 'H2',  title: 'Heading 2' },
  { id: 'h3',     label: 'H3',  title: 'Heading 3' },
  { id: 'bullet', label: '≡',   title: 'Bullet list' },
  { id: 'rule',   label: '—',   title: 'Horizontal rule' },
];

export default function MarkdownEditor({ value, onChange, placeholder, rows = 5, disabled }) {
  const [preview, setPreview] = useState(false);
  const ref = useRef(null);

  // Sync external value changes without resetting cursor (only when textarea not focused)
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.value = value ?? '';
    }
  }, [value]);

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); applyFormat(ref.current, 'bold'); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); applyFormat(ref.current, 'italic'); }
  }

  return (
    <div style={s.wrapper}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.toolGroup}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              type="button"
              style={{ ...s.toolBtn, ...t.style }}
              title={t.title}
              onMouseDown={e => { e.preventDefault(); applyFormat(ref.current, t.id); }}
              disabled={disabled || preview}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          style={{ ...s.previewBtn, ...(preview ? s.previewBtnActive : {}) }}
          onClick={() => setPreview(p => !p)}
        >
          {preview ? '✏️ Edit' : '👁 Preview'}
        </button>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div
          style={s.preview}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || '<p style="color:#9CA3AF">Nothing to preview</p>' }}
        />
      ) : (
        <textarea
          ref={ref}
          style={{ ...s.textarea, opacity: disabled ? 0.6 : 1 }}
          defaultValue={value}
          onInput={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
        />
      )}
    </div>
  );
}

const s = {
  wrapper:        { border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff' },
  toolbar:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', gap: 8 },
  toolGroup:      { display: 'flex', gap: 2 },
  toolBtn:        { background: 'none', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 13, cursor: 'pointer', color: '#374151', fontFamily: 'inherit', lineHeight: 1.4 },
  previewBtn:     { background: 'none', border: '1px solid #E5E7EB', borderRadius: 5, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: '#6B7280', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  previewBtnActive:{ background: '#F3F4F6', color: '#111827' },
  textarea:       { width: '100%', padding: '10px 12px', border: 'none', borderTop: '1px solid #E5E7EB', outline: 'none', fontSize: 14, fontFamily: 'inherit', color: '#111827', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', display: 'block', userSelect: 'text', pointerEvents: 'auto', cursor: 'text' },
  preview:        { padding: '12px 14px', minHeight: 80, fontSize: 14, lineHeight: 1.6, color: '#111827', background: '#fff' },
};
