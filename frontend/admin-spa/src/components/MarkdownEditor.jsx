import { useRef } from 'react';

const TOOLS = [
  { label: 'B',      title: 'Bold',         before: '**', after: '**' },
  { label: 'I',      title: 'Italic',       before: '_',  after: '_'  },
  { label: 'H2',     title: 'Heading 2',    before: '## ', after: ''  },
  { label: 'H3',     title: 'Heading 3',    before: '### ', after: '' },
  { label: '• List', title: 'Bullet list',  before: '- ', after: ''   },
  { label: '—',      title: 'Divider',      before: '\n---\n', after: '' },
];

export default function MarkdownEditor({ value, onChange, placeholder, rows = 5, disabled }) {
  const ref = useRef(null);

  function applyFormat(before, after) {
    const ta = ref.current;
    if (!ta || disabled) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = ta.value.substring(start, end);
    const replacement = before + sel + after;
    ta.value = ta.value.substring(0, start) + replacement + ta.value.substring(end);
    // Restore cursor inside the inserted text
    ta.focus();
    ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    onChange(ta.value);
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap',
      }}>
        {TOOLS.map(t => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            disabled={disabled}
            onMouseDown={e => {
              e.preventDefault(); // keep textarea focused
              applyFormat(t.before, t.after);
            }}
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px',
              border: '1px solid #D1D5DB', borderRadius: 4,
              background: '#F9FAFB', color: '#374151',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', lineHeight: 1.4,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        ref={ref}
        defaultValue={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
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
      />
    </div>
  );
}
