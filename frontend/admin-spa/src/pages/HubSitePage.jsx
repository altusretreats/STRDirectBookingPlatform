/**
 * Hub Site management page — altusretreats.net content
 * Tabs: Content | Media
 */
import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../lib/api';
import { navigate } from '../App';

const TABS = [
  { id: 'content', label: 'Content', icon: '✏️' },
  { id: 'media',   label: 'Media',   icon: '🖼️' },
];

export default function HubSitePage({ tab }) {
  const [hub,     setHub]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getHub()
      .then(h => setHub(h))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeTab = TABS.find(t => t.id === tab)?.id ?? 'content';

  if (loading) return <div style={{ padding:'40px 48px', color:'#6B7280' }}>Loading hub content…</div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Altus Retreats Site</h1>
          <p style={s.sub}>Manage content for altusretreats.net</p>
        </div>
      </div>

      <div style={s.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
            onClick={() => navigate(`/hub/${t.id}`)}
          >
            <span style={s.tabIcon}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {activeTab === 'content' && <HubContentEditor hub={hub} onSaved={setHub} />}
        {activeTab === 'media'   && <HubMediaEditor   hub={hub} onSaved={setHub} />}
      </div>
    </div>
  );
}

// ─── Content editor ────────────────────────────────────────────────────────────
function HubContentEditor({ hub, onSaved }) {
  const c = hub?.content ?? {};
  const [heroHeadline, setHeroHeadline] = useState(c.heroHeadline ?? 'Altus Retreats');
  const [heroSubtitle, setHeroSubtitle] = useState(c.heroSubtitle ?? '');
  const [aboutTitle,   setAboutTitle]   = useState(c.aboutTitle   ?? '');
  const [aboutBody,    setAboutBody]    = useState(c.aboutBody    ?? '');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState(null);

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const updated = await adminApi.updateHub({ content: { heroHeadline, heroSubtitle, aboutTitle, aboutBody, heroPhoto: c.heroPhoto } });
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
      <Card>
        <CardHeader title="Hero Section" subtitle="Main headline and subtitle shown on the altusretreats.net home page" />
        <FormField label="Headline">
          <input style={s.input} placeholder="Altus Retreats" value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} />
        </FormField>
        <FormField label="Subtitle">
          <textarea style={{ ...s.input, ...s.textarea }} rows={2} placeholder="Discover our handpicked collection of luxury retreats…" value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} />
        </FormField>
      </Card>

      <Card>
        <CardHeader title="About Section" />
        <FormField label="Section Title">
          <input style={s.input} placeholder="About Altus Retreats" value={aboutTitle} onChange={e => setAboutTitle(e.target.value)} />
        </FormField>
        <FormField label="Body">
          <textarea style={{ ...s.input, ...s.textarea }} rows={5} placeholder="Tell your story…" value={aboutBody} onChange={e => setAboutBody(e.target.value)} />
        </FormField>
      </Card>

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

// ─── Media editor ──────────────────────────────────────────────────────────────
function HubMediaEditor({ hub, onSaved }) {
  const heroPhoto = hub?.content?.heroPhoto ?? null;
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(heroPhoto);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const fileInputRef = useRef(null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError(null);
    try {
      const { uploadUrl, fileUrl } = await adminApi.signUpload('hub', file.name, file.type);
      await adminApi.uploadFile(uploadUrl, file);
      setUploadedUrl(fileUrl);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSave() {
    if (!uploadedUrl) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateHub({ content: { ...(hub?.content ?? {}), heroPhoto: uploadedUrl } });
      onSaved?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Card>
        <CardHeader title="Hub Site Hero Photo" subtitle="The background photo shown on the altusretreats.net home page" />
        {uploadedUrl && (
          <div style={s.heroPreview}>
            <img src={uploadedUrl} alt="Hub hero" style={s.heroImg} />
          </div>
        )}
        <div style={s.uploadArea} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileSelect} />
          {uploading ? <div style={s.uploadMsg}>Uploading…</div> : (
            <>
              <div style={s.uploadIcon}>📷</div>
              <div style={s.uploadMsg}>Click to upload</div>
              <div style={s.uploadHint}>JPG, PNG, WebP · Recommended: 2400×1600px or wider</div>
            </>
          )}
        </div>
        {uploadError && <div style={s.errorMsg}>{uploadError}</div>}
        {uploadedUrl && uploadedUrl !== heroPhoto && (
          <div style={s.saveRow}>
            <span style={s.pendingNote}>New photo uploaded — save to apply</span>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Hero Photo'}
            </button>
          </div>
        )}
        {saved && <div style={s.successMsg}>Saved!</div>}
      </Card>
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────
function Card({ children }) { return <div style={s.card}>{children}</div>; }
function CardHeader({ title, subtitle }) {
  return (
    <div style={s.cardHeader}>
      <h3 style={s.cardTitle}>{title}</h3>
      {subtitle && <p style={s.cardSub}>{subtitle}</p>}
    </div>
  );
}
function FormField({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  page:       { display:'flex', flexDirection:'column', height:'100%' },
  header:     { padding:'32px 40px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 },
  title:      { fontSize:26, fontWeight:700, color:'#111827', margin:0, marginBottom:4 },
  sub:        { color:'#6B7280', fontSize:14, margin:0 },
  tabs:       { display:'flex', gap:0, padding:'24px 40px 0', borderBottom:'1px solid #E5E7EB', background:'#F9FAFB' },
  tab:        { display:'flex', alignItems:'center', gap:6, padding:'10px 16px', border:'none', borderBottom:'2px solid transparent', background:'none', cursor:'pointer', fontSize:13, fontWeight:500, color:'#6B7280', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1 },
  tabActive:  { color:'#111827', borderBottomColor:'#2D3A2E', fontWeight:600 },
  tabIcon:    { fontSize:14 },
  content:    { padding:'32px 40px', overflowY:'auto', flex:1 },
  card:       { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'24px', marginBottom:16 },
  cardHeader: { marginBottom:20 },
  cardTitle:  { fontSize:15, fontWeight:600, color:'#111827', margin:0, marginBottom:4 },
  cardSub:    { fontSize:13, color:'#6B7280', margin:0 },
  field:      { marginBottom:20 },
  label:      { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:4 },
  input:      { width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#111827', outline:'none', boxSizing:'border-box', background:'#fff' },
  textarea:   { resize:'vertical', lineHeight:1.6 },
  actions:    { display:'flex', alignItems:'center', gap:16, justifyContent:'flex-end' },
  saveBtn:    { background:'#1C2E26', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  successMsg: { fontSize:13, color:'#16A34A', fontWeight:500 },
  errorMsg:   { fontSize:13, color:'#DC2626', flex:1 },
  heroPreview:{ borderRadius:10, overflow:'hidden', marginBottom:16, height:200 },
  heroImg:    { width:'100%', height:'100%', objectFit:'cover' },
  uploadArea: { border:'2px dashed #D1D5DB', borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', marginBottom:16 },
  uploadIcon: { fontSize:28, marginBottom:8 },
  uploadMsg:  { fontSize:14, fontWeight:500, color:'#374151', marginBottom:4 },
  uploadHint: { fontSize:12, color:'#9CA3AF' },
  saveRow:    { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  pendingNote:{ fontSize:13, color:'#D97706' },
};
