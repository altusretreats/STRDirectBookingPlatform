/**
 * Content tab — admin-managed content with:
 *   - Override toggles: lock a field so Hospitable sync never overwrites it
 *   - Markdown toolbar on all body text fields
 *   - About section with show/hide on guest site
 *   - House rules: Hospitable default + optional override
 *   - Custom content sections (title + body, for future frontend assignment)
 */
import { useState, useCallback } from 'react';
import { adminApi } from '../lib/api';
import MarkdownEditor from './MarkdownEditor';

// ── Sub-components ────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return <div style={{ ...s.card, ...style }}>{children}</div>;
}
function CardHeader({ title, subtitle }) {
  return (
    <div style={s.cardHeader}>
      <h3 style={s.cardTitle}>{title}</h3>
      {subtitle && <p style={s.cardSub}>{subtitle}</p>}
    </div>
  );
}
function FormField({ label, hint, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {hint && <div style={s.hint}>{hint}</div>}
      {children}
    </div>
  );
}

// Override lock pill — shown next to field label
function OverrideBadge({ locked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={locked ? 'Locked — sync will not overwrite this field. Click to unlock.' : 'Unlocked — sync may overwrite this field. Click to lock.'}
      style={{
        ...s.overrideBadge,
        background: locked ? '#FEF3C7' : '#F3F4F6',
        color:      locked ? '#92400E' : '#6B7280',
        borderColor:locked ? '#FCD34D' : '#E5E7EB',
      }}
    >
      {locked ? '🔒 Locked from sync' : '🔓 Lock from sync'}
    </button>
  );
}

// Field label row with optional override badge
function FieldRow({ label, hint, overrideKey, overrides, onOverrideToggle, children }) {
  return (
    <div style={s.field}>
      <div style={s.fieldLabelRow}>
        <label style={s.label}>{label}</label>
        {overrideKey && (
          <OverrideBadge
            locked={!!overrides[overrideKey]}
            onToggle={() => onOverrideToggle(overrideKey)}
          />
        )}
      </div>
      {hint && <div style={s.hint}>{hint}</div>}
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ContentEditor({ property, onSaved }) {
  const content    = property?.content     ?? {};
  const hospCached = property?.hospitable?.cached ?? {};

  // Hero
  const [heroHeadline, setHeroHeadline] = useState(content.heroHeadline ?? '');
  const [heroSubtitle, setHeroSubtitle] = useState(content.heroSubtitle ?? '');

  // About
  const [aboutShow,  setAboutShow]  = useState(content.aboutShow  ?? true);
  const [aboutTitle, setAboutTitle] = useState(content.aboutTitle ?? '');
  const [aboutBody,  setAboutBody]  = useState(content.aboutBody  ?? '');

  // House rules
  const [rulesOverride, setRulesOverride] = useState(content.houseRulesOverride ?? false);
  const [rulesCustom,   setRulesCustom]   = useState(
    content.houseRules ?? (hospCached.houseRules ?? []).join('\n')
  );

  // Custom content sections
  const [customSections, setCustomSections] = useState(content.customSections ?? []);

  // Override flags for lockable fields
  const [overrides, setOverrides] = useState(content.overrides ?? {});

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState(null);

  function toggleOverride(key) {
    setOverrides(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Custom sections
  function addSection() {
    setCustomSections(prev => [...prev, { id: `sec_${Date.now()}`, title: '', body: '' }]);
  }
  function updateSection(idx, field, val) {
    setCustomSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  }
  function removeSection(idx) {
    setCustomSections(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await adminApi.updateProperty(property.slug, {
        content: {
          heroHeadline,
          heroSubtitle,
          aboutShow,
          aboutTitle,
          aboutBody,
          houseRulesOverride: rulesOverride,
          houseRules: rulesOverride ? rulesCustom : undefined,
          customSections,
          overrides,
        },
      });
      const updated = await adminApi.getProperty(property.slug);
      onSaved?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const hospRules = hospCached.houseRules ?? [];

  return (
    <div>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Hero Section"
          subtitle="Text shown in the hero banner. Leave blank to fall back to Hospitable data."
        />

        <FieldRow
          label="Hero Headline"
          overrideKey="heroHeadline"
          overrides={overrides}
          onOverrideToggle={toggleOverride}
          hint={hospCached.name ? `Hospitable: "${hospCached.name}"` : undefined}
        >
          <input
            style={s.input}
            placeholder={hospCached.name ?? 'e.g. The Overhang'}
            value={heroHeadline}
            onChange={e => setHeroHeadline(e.target.value)}
          />
        </FieldRow>

        <FieldRow
          label="Hero Subtitle"
          overrideKey="heroSubtitle"
          overrides={overrides}
          onOverrideToggle={toggleOverride}
          hint={hospCached.summary ? `Hospitable: "${hospCached.summary.slice(0, 80)}…"` : undefined}
        >
          <MarkdownEditor
            value={heroSubtitle}
            onChange={setHeroSubtitle}
            placeholder={hospCached.summary ?? 'A short tagline for the hero…'}
            rows={3}
          />
        </FieldRow>
      </Card>

      {/* ── About Section ─────────────────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <CardHeader
            title="About Section"
            subtitle="Custom 'About this property' copy. Leave blank to use Hospitable description."
          />
          <label style={s.checkboxLabel}>
            <input
              type="checkbox"
              checked={aboutShow}
              onChange={e => setAboutShow(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Show on guest site
          </label>
        </div>

        <FormField label="Section Title">
          <input
            style={s.input}
            placeholder="e.g. Your perfect Kentucky escape"
            value={aboutTitle}
            onChange={e => setAboutTitle(e.target.value)}
          />
        </FormField>

        <FieldRow
          label="Body Text"
          overrideKey="aboutBody"
          overrides={overrides}
          onOverrideToggle={toggleOverride}
          hint={hospCached.description ? `Hospitable: "${hospCached.description.slice(0, 80)}…"` : undefined}
        >
          <MarkdownEditor
            value={aboutBody}
            onChange={setAboutBody}
            placeholder={hospCached.description ?? 'Describe the property in your own words…'}
            rows={6}
          />
        </FieldRow>
      </Card>

      {/* ── House Rules ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="House Rules"
          subtitle="By default, rules come from Hospitable. Enable the override to write your own."
        />

        {/* Hospitable rules preview */}
        {!rulesOverride && (
          <div style={s.rulesPreview}>
            {hospRules.length === 0
              ? <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>No rules synced yet — run a sync first.</p>
              : hospRules.map((r, i) => (
                  <div key={i} style={s.ruleRow}>
                    <span style={s.ruleBullet}>•</span> {r}
                  </div>
                ))
            }
          </div>
        )}

        {/* Override toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: rulesOverride ? 16 : 0 }}>
          <label style={s.checkboxLabel}>
            <input
              type="checkbox"
              checked={rulesOverride}
              onChange={e => {
                setRulesOverride(e.target.checked);
                // Pre-fill with Hospitable rules when first enabling
                if (e.target.checked && !rulesCustom && hospRules.length) {
                  setRulesCustom(hospRules.join('\n'));
                }
                // Keep override flag in sync
                setOverrides(prev => ({ ...prev, houseRules: e.target.checked }));
              }}
              style={{ marginRight: 6 }}
            />
            Override with custom rules (sync won't overwrite)
          </label>
        </div>

        {rulesOverride && (
          <MarkdownEditor
            value={rulesCustom}
            onChange={setRulesCustom}
            placeholder={'- No smoking\n- No parties\n- Pets allowed with approval'}
            rows={8}
          />
        )}
      </Card>

      {/* ── Custom Content Sections ───────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <CardHeader
            title="Custom Sections"
            subtitle="Extra content blocks (e.g. 'Getting There', 'Nearby Activities'). Assign to the guest site later."
          />
          <button type="button" style={s.addBtn} onClick={addSection}>+ Add Section</button>
        </div>

        {customSections.length === 0 && (
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>No custom sections yet.</p>
        )}

        {customSections.map((sec, idx) => (
          <div key={sec.id} style={s.customSection}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input
                style={{ ...s.input, flex: 1, marginBottom: 0 }}
                placeholder="Section title (e.g. The Surrounding Area)"
                value={sec.title}
                onChange={e => updateSection(idx, 'title', e.target.value)}
              />
              <button
                type="button"
                style={s.removeBtn}
                onClick={() => removeSection(idx)}
                title="Remove section"
              >✕</button>
            </div>
            <MarkdownEditor
              value={sec.body}
              onChange={val => updateSection(idx, 'body', val)}
              placeholder="Section body…"
              rows={4}
            />
          </div>
        ))}
      </Card>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <div style={s.actions}>
        {error && <div style={s.errorMsg}>{error}</div>}
        {saved && <div style={s.successMsg}>✓ Saved</div>}
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  card:          { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 16 },
  cardHeader:    { marginBottom: 20 },
  cardTitle:     { fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, marginBottom: 4 },
  cardSub:       { fontSize: 13, color: '#6B7280', margin: 0 },
  field:         { marginBottom: 20 },
  fieldLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  label:         { fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 },
  hint:          { fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontStyle: 'italic' },
  input:         { width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fff' },
  overrideBadge: { fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, border: '1px solid', cursor: 'pointer', background: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  checkboxLabel: { fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' },
  rulesPreview:  { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 16px' },
  ruleRow:       { fontSize: 13, color: '#374151', padding: '3px 0', lineHeight: 1.5 },
  ruleBullet:    { color: '#9CA3AF', marginRight: 6 },
  customSection: { border: '1px solid #E5E7EB', borderRadius: 8, padding: 16, marginBottom: 12 },
  addBtn:        { background: '#1C2E26', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  removeBtn:     { background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  actions:       { display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' },
  saveBtn:       { background: '#1C2E26', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  successMsg:    { fontSize: 13, color: '#16A34A', fontWeight: 500 },
  errorMsg:      { fontSize: 13, color: '#DC2626', flex: 1 },
};
