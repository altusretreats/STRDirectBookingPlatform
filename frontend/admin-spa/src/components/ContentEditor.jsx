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
  const [heroHeadline,    setHeroHeadline]    = useState(content.heroHeadline    ?? '');
  const [heroSubtitle,    setHeroSubtitle]    = useState(content.heroSubtitle    ?? '');
  const [heroRating,      setHeroRating]      = useState(content.heroRating      ?? '');
  const [heroReviewCount, setHeroReviewCount] = useState(content.heroReviewCount ?? '');
  const [heroEyebrow,     setHeroEyebrow]     = useState(content.heroEyebrow     ?? '');
  const [heroTitleLine1,  setHeroTitleLine1]  = useState(content.heroTitleLine1  ?? '');
  const [heroAccentWord,  setHeroAccentWord]  = useState(content.heroAccentWord  ?? '');
  const [heroAccentColor, setHeroAccentColor] = useState(content.heroAccentColor ?? '#C9B87A');
  const [heroTitleSuffix, setHeroTitleSuffix] = useState(content.heroTitleSuffix ?? '');
  const [heroLandingPills, setHeroLandingPills] = useState(
    content.heroLandingPills?.length ? content.heroLandingPills : ['', '', '', '', '']
  );

  // About
  const [aboutShow,  setAboutShow]  = useState(content.aboutShow  ?? true);
  const [aboutTitle, setAboutTitle] = useState(content.aboutTitle ?? '');
  const [aboutBody,  setAboutBody]  = useState(content.aboutBody  ?? '');

  // Editorial homepage sections (admin-owned; Hospitable has no equivalent fields)
  const [editorial, setEditorial] = useState({
    overviewKicker: content.overviewKicker ?? '',
    overviewTitle: content.overviewTitle ?? '',
    amenitiesTitle: content.amenitiesTitle ?? '',
    experienceKicker: content.experienceKicker ?? '',
    experienceTitle: content.experienceTitle ?? '',
    experiencePrimaryTitle: content.experiencePrimaryTitle ?? '',
    experiencePrimaryBody: content.experiencePrimaryBody ?? '',
    experienceSecondaryTitle: content.experienceSecondaryTitle ?? '',
    experienceSecondaryBody: content.experienceSecondaryBody ?? '',
    reviewsKicker: content.reviewsKicker ?? '',
    reviewsTitle: content.reviewsTitle ?? '',
    locationKicker: content.locationKicker ?? '',
    locationTitle: content.locationTitle ?? '',
    promiseKicker: content.promiseKicker ?? '',
    promiseTitle: content.promiseTitle ?? '',
    promiseIntro: content.promiseIntro ?? '',
  });

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
          ...content,
          heroHeadline,
          heroSubtitle,
          heroEyebrow,
          heroTitleLine1,
          heroRating,
          heroReviewCount,
          heroAccentWord,
          heroAccentColor,
          heroTitleSuffix,
          heroLandingPills: heroLandingPills.filter(Boolean),
          aboutShow,
          aboutTitle,
          aboutBody,
          ...editorial,
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
  const setEditorialField = (key, value) => setEditorial(prev => ({ ...prev, [key]: value }));

  return (
    <div>
      <div className="admin-editor-intro">
        <div>
          <h2>Property story</h2>
          <p>Shape the guest-facing page while keeping synced listing details intact.</p>
        </div>
        <div className="admin-source-note"><strong>Hospitable stays in control.</strong> Blank override fields continue to use synced listing content. Fields marked as page copy are Altus-owned and are not replaced during sync.</div>
      </div>

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Star Rating" hint='Shown bottom-right of hero. e.g. "4.9". Leave blank to hide.'>
            <input
              style={s.input}
              placeholder="4.9"
              value={heroRating}
              onChange={e => setHeroRating(e.target.value)}
            />
          </FormField>
          <FormField label="Review Count" hint='e.g. "120+" — shown as "from 120+ reviews"'>
            <input
              style={s.input}
              placeholder="120+"
              value={heroReviewCount}
              onChange={e => setHeroReviewCount(e.target.value)}
            />
          </FormField>
        </div>

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
            placeholder="Leave blank to fall back to Hospitable data"
            rows={3}
          />
        </FieldRow>
      </Card>

      <Card>
        <CardHeader
          title="Editorial Overview & Amenities"
          subtitle="Headings introduced in the new homepage design. Leave any field blank to keep the current wording."
        />
        <div style={s.twoColumn}>
          <FormField label="Overview Eyebrow"><input style={s.input} value={editorial.overviewKicker} onChange={e => setEditorialField('overviewKicker', e.target.value)} placeholder="Your private escape" /></FormField>
          <FormField label="Overview Heading"><input style={s.input} value={editorial.overviewTitle} onChange={e => setEditorialField('overviewTitle', e.target.value)} placeholder="Adventure outside. Restoration within." /></FormField>
        </div>
        <FormField label="Amenities Heading"><input style={s.input} value={editorial.amenitiesTitle} onChange={e => setEditorialField('amenitiesTitle', e.target.value)} placeholder="What this home offers" /></FormField>
      </Card>

      <Card>
        <CardHeader
          title="Experience Highlights"
          subtitle="Control the introduction and the copy layered over the two editorial photos. Photos continue to come from the property gallery."
        />
        <div style={s.twoColumn}>
          <FormField label="Section Eyebrow"><input style={s.input} value={editorial.experienceKicker} onChange={e => setEditorialField('experienceKicker', e.target.value)} placeholder="Designed around the way you stay" /></FormField>
          <FormField label="Section Heading"><input style={s.input} value={editorial.experienceTitle} onChange={e => setEditorialField('experienceTitle', e.target.value)} placeholder="The best parts aren't extras." /></FormField>
          <FormField label="First Card Title"><input style={s.input} value={editorial.experiencePrimaryTitle} onChange={e => setEditorialField('experiencePrimaryTitle', e.target.value)} placeholder="Slow evenings outside" /></FormField>
          <FormField label="First Card Copy"><textarea style={{ ...s.input, minHeight: 88, resize: 'vertical' }} value={editorial.experiencePrimaryBody} onChange={e => setEditorialField('experiencePrimaryBody', e.target.value)} placeholder="Leave blank for an amenities-based description" /></FormField>
          <FormField label="Second Card Title"><input style={s.input} value={editorial.experienceSecondaryTitle} onChange={e => setEditorialField('experienceSecondaryTitle', e.target.value)} placeholder="Rest deeply" /></FormField>
          <FormField label="Second Card Copy"><textarea style={{ ...s.input, minHeight: 88, resize: 'vertical' }} value={editorial.experienceSecondaryBody} onChange={e => setEditorialField('experienceSecondaryBody', e.target.value)} placeholder="Comfortable private bedrooms designed for a restorative night away." /></FormField>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Reviews, Location & Altus Standard"
          subtitle="Edit the supporting copy around live guest reviews, location details, and the direct-booking promise."
        />
        <div style={s.twoColumn}>
          <FormField label="Reviews Eyebrow"><input style={s.input} value={editorial.reviewsKicker} onChange={e => setEditorialField('reviewsKicker', e.target.value)} placeholder="What our guests are saying" /></FormField>
          <FormField label="Reviews Heading"><input style={s.input} value={editorial.reviewsTitle} onChange={e => setEditorialField('reviewsTitle', e.target.value)} placeholder="Trusted by travelers like you." /></FormField>
          <FormField label="Location Eyebrow"><input style={s.input} value={editorial.locationKicker} onChange={e => setEditorialField('locationKicker', e.target.value)} placeholder="Find your way" /></FormField>
          <FormField label="Location Heading"><input style={s.input} value={editorial.locationTitle} onChange={e => setEditorialField('locationTitle', e.target.value)} placeholder="In the heart of it all." /></FormField>
          <FormField label="Promise Eyebrow"><input style={s.input} value={editorial.promiseKicker} onChange={e => setEditorialField('promiseKicker', e.target.value)} placeholder="The Altus standard" /></FormField>
          <FormField label="Promise Heading"><input style={s.input} value={editorial.promiseTitle} onChange={e => setEditorialField('promiseTitle', e.target.value)} placeholder="A stay that lives up to the photos." /></FormField>
        </div>
        <FormField label="Promise Introduction"><textarea style={{ ...s.input, minHeight: 96, resize: 'vertical' }} value={editorial.promiseIntro} onChange={e => setEditorialField('promiseIntro', e.target.value)} placeholder="Booking directly should feel simpler, clearer, and more personal…" /></FormField>
      </Card>

      {/* ── Hero Title Block ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Hero Title Block"
          subtitle='Controls the large 3-part title: "[Line 1]" "[Accent Word]" "[Suffix]". Leave blank to use defaults.'
        />
        <FormField label="Eyebrow Text" hint='Small text above the title. e.g. "Daniel Boone National Forest · Kentucky"'>
          <input
            style={s.input}
            placeholder="e.g. Daniel Boone National Forest · Kentucky"
            value={heroEyebrow}
            onChange={e => setHeroEyebrow(e.target.value)}
          />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FormField label="Title Line 1" hint='White text. e.g. "Your Kentucky"'>
            <input
              style={s.input}
              placeholder="Your Kentucky"
              value={heroTitleLine1}
              onChange={e => setHeroTitleLine1(e.target.value)}
            />
          </FormField>
          <FormField label="Accent Word" hint='Gold text. e.g. "Red River Gorge"'>
            <input
              style={s.input}
              placeholder="Red River Gorge"
              value={heroAccentWord}
              onChange={e => setHeroAccentWord(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <input
                type="color"
                value={heroAccentColor}
                onChange={e => setHeroAccentColor(e.target.value)}
                style={{ width: 32, height: 32, border: '1px solid #D1D5DB', borderRadius: 6, padding: 2, cursor: 'pointer', background: 'none' }}
                title="Accent color"
              />
              <span style={{ fontSize: 12, color: '#6B7280' }}>Accent color</span>
              <code style={{ fontSize: 11, color: '#9CA3AF' }}>{heroAccentColor}</code>
              <button
                type="button"
                onClick={() => setHeroAccentColor('#C9B87A')}
                style={{ fontSize: 11, color: '#6B7280', background: 'none', border: '1px solid #E5E7EB', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit' }}
              >Reset</button>
            </div>
          </FormField>
          <FormField label="Title Suffix" hint='Faded text. e.g. "Awaits."'>
            <input
              style={s.input}
              placeholder="Awaits."
              value={heroTitleSuffix}
              onChange={e => setHeroTitleSuffix(e.target.value)}
            />
          </FormField>
        </div>
        <div style={{ marginTop: 12, padding: '12px 16px', background: '#F9FAFB', borderRadius: 8, fontSize: 13, color: '#6B7280' }}>
          Preview: <strong style={{ color: '#111' }}>{heroTitleLine1 || 'Your'}</strong>{' '}
          <strong style={{ color: heroAccentColor }}>{heroAccentWord || 'Red River Gorge'}</strong>{' '}
          <span style={{ color: '#9CA3AF' }}>{heroTitleSuffix || 'escape awaits.'}</span>
        </div>
      </Card>

      {/* ── Landing Page Pills ────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Landing Page Pills"
          subtitle="Up to 5 feature highlights shown as pills at the bottom of the hero. These are completely independent of your amenities list."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {heroLandingPills.slice(0, 5).map((pill, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF', width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder={['Hot Tub', 'Fire Pit', 'Self Check-in', 'Sleeps 8', 'Pet Friendly'][i] || `Pill ${i + 1}`}
                value={pill}
                onChange={e => {
                  const next = [...heroLandingPills];
                  next[i] = e.target.value;
                  setHeroLandingPills(next);
                }}
              />
              {pill && (
                <span style={{ fontSize: 12, background: 'rgba(0,0,0,0.06)', padding: '4px 10px', borderRadius: 100, color: '#374151', whiteSpace: 'nowrap' }}>
                  {pill}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: '#9CA3AF' }}>
          Empty slots are skipped. Drag-to-reorder not yet supported — order is top to bottom.
        </div>
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
            placeholder="Leave blank to fall back to Hospitable data"
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
  twoColumn:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 18px' },
};
