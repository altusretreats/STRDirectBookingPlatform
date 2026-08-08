/**
 * Media tab — hero photo upload + Hospitable photo gallery preview.
 */
import { useState, useRef } from 'react';
import { adminApi } from '../lib/api';

export default function MediaPanel({ property, cached, onSaved }) {
  const heroPhoto = property?.content?.heroPhoto ?? null;
  const hospPhotos = cached?.photos ?? [];

  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState(null);
  const [uploadedUrl,  setUploadedUrl]  = useState(heroPhoto);
  const [savingHero,   setSavingHero]   = useState(false);
  const [heroSaved,    setHeroSaved]    = useState(false);
  const fileInputRef = useRef(null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true); setUploadError(null);
    try {
      // 1. Get presigned URL
      const { uploadUrl, fileUrl } = await adminApi.signUpload(
        property.slug, file.name, file.type
      );
      // 2. Upload directly to S3
      await adminApi.uploadFile(uploadUrl, file);
      setUploadedUrl(fileUrl);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSaveHero() {
    if (!uploadedUrl) return;
    setSavingHero(true);
    try {
      await adminApi.updateProperty(property.slug, {
        content: { ...(property.content ?? {}), heroPhoto: uploadedUrl },
      });
      const updated = await adminApi.getProperty(property.slug);
      onSaved?.(updated);
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 3000);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setSavingHero(false);
    }
  }

  return (
    <div>
      {/* Hero photo */}
      <Card>
        <CardHeader
          title="Hero Photo"
          subtitle="The main photo shown behind the booking widget in the hero section. You manage this — it's not pulled from Hospitable."
        />

        {uploadedUrl && (
          <div style={s.heroPreview}>
            <img src={uploadedUrl} alt="Hero preview" style={s.heroImg} />
            <div style={s.heroOverlay}>
              <span style={s.heroLabel}>Current hero photo</span>
            </div>
          </div>
        )}

        <div style={s.uploadArea} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileSelect} />
          {uploading ? (
            <div style={s.uploadMsg}>Uploading…</div>
          ) : (
            <>
              <div style={s.uploadIcon}>📷</div>
              <div style={s.uploadMsg}>Click to upload a photo</div>
              <div style={s.uploadHint}>JPG, PNG, WebP · Recommended: 2400×1600px or wider</div>
            </>
          )}
        </div>

        {uploadError && <div style={s.error}>{uploadError}</div>}

        {uploadedUrl && uploadedUrl !== heroPhoto && (
          <div style={s.saveRow}>
            <span style={s.pendingNote}>New photo uploaded — save to apply it</span>
            <button style={s.saveBtn} onClick={handleSaveHero} disabled={savingHero}>
              {savingHero ? 'Saving…' : 'Save Hero Photo'}
            </button>
          </div>
        )}
        {heroSaved && <div style={s.successMsg}>Hero photo saved!</div>}
      </Card>

      {/* Hospitable photos */}
      <Card>
        <CardHeader
          title={`Hospitable Photos (${hospPhotos.length})`}
          subtitle="These photos are synced from Hospitable and shown in the photo gallery on the booking site. Manage them in Hospitable; click Sync to refresh."
        />

        {hospPhotos.length === 0 && (
          <div style={s.empty}>No photos synced yet. Run a sync to import photos from Hospitable.</div>
        )}

        <div style={s.photoGrid}>
          {hospPhotos.slice(0, 12).map((photo, i) => (
            <div key={i} style={s.photoItem}>
              <img
                src={photo.url}
                alt={photo.caption || `Photo ${i + 1}`}
                style={s.photoImg}
                loading="lazy"
              />
              {photo.caption && <div style={s.photoCaption}>{photo.caption}</div>}
            </div>
          ))}
          {hospPhotos.length > 12 && (
            <div style={{ ...s.photoItem, ...s.photoMore }}>
              +{hospPhotos.length - 12} more
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Card({ children }) { return <div style={s.card}>{children}</div>; }
function CardHeader({ title, subtitle }) {
  return (
    <div style={s.cardHeader}>
      <h3 style={s.cardTitle}>{title}</h3>
      {subtitle && <p style={s.cardSub}>{subtitle}</p>}
    </div>
  );
}

const s = {
  card:         { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'24px', marginBottom:16 },
  cardHeader:   { marginBottom:20 },
  cardTitle:    { fontSize:15, fontWeight:600, color:'#111827', margin:0, marginBottom:4 },
  cardSub:      { fontSize:13, color:'#6B7280', margin:0 },
  heroPreview:  { position:'relative', borderRadius:10, overflow:'hidden', marginBottom:16, height:220 },
  heroImg:      { width:'100%', height:'100%', objectFit:'cover' },
  heroOverlay:  { position:'absolute', bottom:0, left:0, right:0, padding:'8px 12px', background:'rgba(0,0,0,0.5)' },
  heroLabel:    { fontSize:12, color:'rgba(255,255,255,0.8)', fontWeight:500 },
  uploadArea:   { border:'2px dashed #D1D5DB', borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', transition:'border-color 0.2s', marginBottom:16 },
  uploadIcon:   { fontSize:28, marginBottom:8 },
  uploadMsg:    { fontSize:14, fontWeight:500, color:'#374151', marginBottom:4 },
  uploadHint:   { fontSize:12, color:'#9CA3AF' },
  error:        { fontSize:13, color:'#DC2626', marginBottom:12 },
  saveRow:      { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginTop:8 },
  pendingNote:  { fontSize:13, color:'#D97706' },
  saveBtn:      { background:'#1C2E26', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', flexShrink:0 },
  successMsg:   { fontSize:13, color:'#16A34A', fontWeight:500, marginTop:8 },
  empty:        { color:'#9CA3AF', fontSize:13, textAlign:'center', padding:'24px 0' },
  photoGrid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12 },
  photoItem:    { borderRadius:8, overflow:'hidden', background:'#F3F4F6', position:'relative' },
  photoImg:     { width:'100%', height:120, objectFit:'cover', display:'block' },
  photoCaption: { fontSize:11, color:'#6B7280', padding:'6px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  photoMore:    { display:'flex', alignItems:'center', justifyContent:'center', height:132, color:'#9CA3AF', fontSize:13, fontWeight:500 },
};
