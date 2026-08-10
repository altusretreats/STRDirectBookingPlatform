/**
 * Media tab — hero photo management + Hospitable photo gallery.
 * You can upload a custom hero photo OR click any Hospitable photo to use it.
 * The active hero photo is highlighted with a HERO badge.
 */
import { useState, useRef } from 'react';
import { adminApi } from '../lib/api';

export default function MediaPanel({ property, cached, onSaved }) {
  const heroPhoto   = property?.content?.heroPhoto ?? null;
  const hospPhotos  = cached?.photos ?? [];

  // The "live" hero: what's saved in the database
  const savedHero = heroPhoto;

  const [pendingHero, setPendingHero] = useState(null); // unsaved selection
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const fileInputRef = useRef(null);

  // The currently previewed hero (pending takes priority over saved)
  const previewHero = pendingHero ?? savedHero;

  // First Hospitable photo is used as fallback if no hero is set
  const fallbackPhoto = hospPhotos[0] ?? null;
  const effectiveHero = previewHero ?? fallbackPhoto?.url ?? null;

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError(null);
    try {
      const { uploadUrl, fileUrl } = await adminApi.signUpload(property.slug, file.name, file.type);
      await adminApi.uploadFile(uploadUrl, file);
      setPendingHero(fileUrl);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function selectHospitablePhoto(url) {
    setPendingHero(url === savedHero ? null : url); // clicking current saved hero clears pending
    if (url !== savedHero) setPendingHero(url);
  }

  async function handleSave() {
    if (!pendingHero) return;
    setSaving(true); setUploadError(null);
    try {
      await adminApi.updateProperty(property.slug, {
        content: { ...(property.content ?? {}), heroPhoto: pendingHero },
      });
      const updated = await adminApi.getProperty(property.slug);
      onSaved?.(updated);
      setPendingHero(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function isActiveHero(url) {
    // A photo is the active hero if it matches the saved hero,
    // OR if no hero is saved and it's the first Hospitable photo (fallback)
    if (savedHero) return url === savedHero;
    return url === fallbackPhoto?.url;
  }

  return (
    <div>
      {/* ── Hero preview ──────────────────────────────── */}
      <Card>
        <CardHeader
          title="Hero Photo"
          subtitle="Shown behind the booking widget. Upload a custom photo or click any Hospitable photo below to use it as the hero."
        />

        {/* Live preview */}
        <div style={s.heroPreview}>
          {effectiveHero ? (
            <img src={effectiveHero} alt="Hero preview" style={s.heroImg} />
          ) : (
            <div style={s.heroEmpty}>No hero photo set — upload one or select from Hospitable photos</div>
          )}
          <div style={s.heroOverlay}>
            <span style={s.heroLabel}>
              {pendingHero ? '⚠️ Unsaved — click Save to apply' : savedHero ? '✓ Current hero photo' : '← Using first Hospitable photo (fallback)'}
            </span>
          </div>
        </div>

        {/* Upload area */}
        <div style={s.uploadArea} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
          {uploading ? (
            <div style={s.uploadMsg}>Uploading…</div>
          ) : (
            <>
              <div style={s.uploadIcon}>📷</div>
              <div style={s.uploadMsg}>Upload a custom photo</div>
              <div style={s.uploadHint}>JPG, PNG, WebP · Recommended: 2400×1600px or wider</div>
            </>
          )}
        </div>

        {uploadError && <div style={s.error}>{uploadError}</div>}

        {pendingHero && (
          <div style={s.saveRow}>
            <span style={s.pendingNote}>Hero changed — save to apply</span>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Hero Photo'}
            </button>
          </div>
        )}
        {saved && <div style={s.successMsg}>✓ Hero photo saved</div>}
      </Card>

      {/* ── Hospitable photos ─────────────────────────── */}
      <Card>
        <CardHeader
          title={`Hospitable Photos (${hospPhotos.length})`}
          subtitle="Synced from Hospitable. Click a photo to use it as the hero. Manage the full gallery in Hospitable."
        />

        {hospPhotos.length === 0 && (
          <div style={s.empty}>No photos synced yet. Run a sync to import photos from Hospitable.</div>
        )}

        <div style={s.photoGrid}>
          {hospPhotos.map((photo, i) => {
            const active   = isActiveHero(photo.url);
            const selected = pendingHero === photo.url;
            return (
              <div
                key={i}
                style={{
                  ...s.photoItem,
                  ...(active   ? s.photoItemActive   : {}),
                  ...(selected ? s.photoItemSelected : {}),
                }}
                onClick={() => setPendingHero(photo.url === savedHero ? null : photo.url)}
                title="Click to set as hero photo"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo ${i + 1}`}
                  style={s.photoImg}
                  loading="lazy"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                {active && !selected && (
                  <div style={s.heroBadge}>HERO</div>
                )}
                {selected && (
                  <div style={{ ...s.heroBadge, background: '#D97706' }}>PENDING</div>
                )}
                {photo.caption && <div style={s.photoCaption}>{photo.caption}</div>}
              </div>
            );
          })}
        </div>

        {hospPhotos.length > 0 && (
          <p style={s.hint}>
            {savedHero
              ? savedHero.includes('altus-retreats-media') ? '✓ Custom uploaded photo is set as hero.' : '✓ A Hospitable photo is set as hero.'
              : 'No hero set — first photo is used as fallback on the booking site.'}
          </p>
        )}
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
  card:              { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 16 },
  cardHeader:        { marginBottom: 20 },
  cardTitle:         { fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, marginBottom: 4 },
  cardSub:           { fontSize: 13, color: '#6B7280', margin: 0 },
  heroPreview:       { position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 16, height: 240, background: '#F3F4F6' },
  heroImg:           { width: '100%', height: '100%', objectFit: 'cover' },
  heroEmpty:         { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: 13, padding: 20, textAlign: 'center' },
  heroOverlay:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' },
  heroLabel:         { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500 },
  uploadArea:        { border: '2px dashed #D1D5DB', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16 },
  uploadIcon:        { fontSize: 28, marginBottom: 8 },
  uploadMsg:         { fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 },
  uploadHint:        { fontSize: 12, color: '#9CA3AF' },
  error:             { fontSize: 13, color: '#DC2626', marginBottom: 12 },
  saveRow:           { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  pendingNote:       { fontSize: 13, color: '#D97706' },
  saveBtn:           { background: '#1C2E26', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  successMsg:        { fontSize: 13, color: '#16A34A', fontWeight: 500, marginTop: 8 },
  empty:             { color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0' },
  photoGrid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  photoItem:         { borderRadius: 8, overflow: 'hidden', background: '#F3F4F6', position: 'relative', cursor: 'pointer', border: '2px solid transparent', transition: 'border-color 0.15s' },
  photoItemActive:   { border: '2px solid #1C2E26' },
  photoItemSelected: { border: '2px solid #D97706' },
  photoImg:          { width: '100%', height: 120, objectFit: 'cover', display: 'block' },
  photoCaption:      { fontSize: 11, color: '#6B7280', padding: '6px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  heroBadge:         { position: 'absolute', top: 6, left: 6, background: '#1C2E26', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em' },
  hint:              { fontSize: 12, color: '#9CA3AF', marginTop: 12, margin: 0 },
};
