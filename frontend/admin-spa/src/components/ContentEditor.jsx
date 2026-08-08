/**
 * Content tab — admin-managed overrides for property content.
 * Fields here take precedence over Hospitable-synced data on the booking site.
 */
import { useState } from 'react';
import { adminApi } from '../lib/api';

export default function ContentEditor({ property, onSaved }) {
  const content = property?.content ?? {};
  const hospCached = property?.hospitable?.cached ?? {};

  const [heroHeadline, setHeroHeadline] = useState(content.heroHeadline ?? '');
  const [heroSubtitle, setHeroSubtitle] = useState(content.heroSubtitle ?? '');
  const [aboutTitle,   setAboutTitle]   = useState(content.aboutTitle   ?? '');
  const [aboutBody,    setAboutBody]    = useState(content.aboutBody    ?? '');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState(null);

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await adminApi.updateProperty(property.slug, {
        content: { heroHeadline, heroSubtitle, aboutTitle, aboutBody },
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

  return (
    <div>
      {/* Hero content */}
      <Card>
        <CardHeader
          title="Hero Section"
          subtitle="Text shown in the hero banner on the booking site. Leave blank to use the Hospitable property name / summary."
        />
        <FormField label="Hero Headline" hint={`Hospitable: "${hospCached.name ?? '—'}"`}>
          <input
            style={s.input}
            placeholder={hospCached.name ?? 'e.g. The Overhang'}
            value={heroHeadline}
            onChange={e => setHeroHeadline(e.target.value)}
          />
        </FormField>
        <FormField label="Hero Subtitle" hint={`Hospitable: "${hospCached.summary?.slice(0, 60) ?? '—'}…"`}>
          <textarea
            style={{ ...s.input, ...s.textarea }}
            placeholder={hospCached.summary ?? 'A short tagline for the hero…'}
            value={heroSubtitle}
            onChange={e => setHeroSubtitle(e.target.value)}
            rows={2}
          />
        </FormField>
      </Card>

      {/* About section */}
      <Card>
        <CardHeader
          title="About Section"
          subtitle="Custom copy for the 'About this property' section. Leave blank to use the Hospitable description."
        />
        <FormField label="Section Title">
          <input
            style={s.input}
            placeholder="e.g. Your perfect Kentucky escape"
            value={aboutTitle}
            onChange={e => setAboutTitle(e.target.value)}
          />
        </FormField>
        <FormField label="Body Text" hint={`Hospitable: "${hospCached.description?.slice(0, 80) ?? '—'}…"`}>
          <textarea
            style={{ ...s.input, ...s.textarea }}
            placeholder={hospCached.description ?? 'Describe the property in your own words…'}
            value={aboutBody}
            onChange={e => setAboutBody(e.target.value)}
            rows={5}
          />
        </FormField>
      </Card>

      {/* Actions */}
      <div style={s.actions}>
        {error && <div style={s.errorMsg}>{error}</div>}
        {saved && <div style={s.successMsg}>Saved!</div>}
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div style={s.card}>{children}</div>;
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

const s = {
  card:       { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'24px', marginBottom:16 },
  cardHeader: { marginBottom:20 },
  cardTitle:  { fontSize:15, fontWeight:600, color:'#111827', margin:0, marginBottom:4 },
  cardSub:    { fontSize:13, color:'#6B7280', margin:0 },
  field:      { marginBottom:20 },
  label:      { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:4 },
  hint:       { fontSize:12, color:'#9CA3AF', marginBottom:6, fontStyle:'italic' },
  input:      { width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#111827', outline:'none', boxSizing:'border-box', background:'#fff' },
  textarea:   { resize:'vertical', lineHeight:1.6 },
  actions:    { display:'flex', alignItems:'center', gap:16, justifyContent:'flex-end' },
  saveBtn:    { background:'#1C2E26', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  successMsg: { fontSize:13, color:'#16A34A', fontWeight:500 },
  errorMsg:   { fontSize:13, color:'#DC2626', flex:1 },
};
