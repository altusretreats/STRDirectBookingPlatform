/**
 * Media tab — hero slider photos + single hero photo + Hospitable gallery.
 *
 * Sections:
 *  1. Hero Slider Photos — upload/manage custom images for the background slider (content.heroSliderPhotos)
 *  2. Hero Photo (legacy single override) — still supported as fallback
 *  3. Hospitable Photos — synced gallery (read-only here; manage in Hospitable)
 */
import { useState, useRef } from 'react';
import { adminApi } from '../lib/api';

export default function MediaPanel({ property, cached, onSaved }) {
  const heroPhoto       = property?.content?.heroPhoto     ?? null;
  const savedSliders    = property?.content?.heroSliderPhotos ?? [];
  const hospPhotos      = cached?.photos ?? [];

  // ── Slider photos state ──────────────────────────────
  const [sliderPhotos,   setSliderPhotos]   = useState(savedSliders);
  const [sliderDirty,    setSliderDirty]    = useState(false);
  const [sliderUploading, setSliderUploading] = useState(false);
  const [sliderError,    setSliderError]    = useState(null);
  const [sliderSaving,   setSliderSaving]   = useState(false);
  const [sliderSaved,    setSliderSaved]    = useState(false);
  const sliderInputRef = useRef(null);

  // ── Single hero photo state ──────────────────────────
  const [pendingHero,  setPendingHero]  = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const fileInputRef = useRef(null);

  const savedHero    = heroPhoto;
  const previewHero  = pendingHero ?? savedHero;
  const fallbackPhoto = hospPhotos[0] ?? null;
  const effectiveHero = previewHero ?? fallbackPhoto?.url ?? null;

  // ── Slider upload ────────────────────────────────────
  async function handleSliderFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSliderUploading(true); setSliderError(null);
    try {
      const newUrls = [];
      for (const file of files) {
        const { uploadUrl, fileUrl } = await adminApi.signUpload(property.slug, file.name, file.type);
        await adminApi.uploadFile(uploadUrl, file);
        newUrls.push(fileUrl);
      }
      setSliderPhotos(prev => {
        const updated = [...prev, ...newUrls];
        return updated;
      });
      setSliderDirty(true);
    } catch (err) {
      setSliderError(err.message);
    } finally {
      setSliderUploading(false);
      e.target.value = '';
    }
  }

  function removeSliderPhoto(idx) {
    setSliderPhotos(prev => prev.filter((_, i) => i !== idx));
    setSliderDirty(true);
  }

  function moveSliderPhoto(idx, direction) {
    setSliderPhotos(prev => {
      const arr = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
    setSliderDirty(true);
  }

  async function saveSliderPhotos() {
    setSliderSaving(true); setSliderError(null);
    try {
      await adminApi.updateProperty(property.slug, {
        content: { ...(property.content ?? {}), heroSliderPhotos: sliderPhotos },
      });
      const updated = await adminApi.getProperty(property.slug);
      onSaved?.(updated);
      setSliderDirty(false);
      setSliderSaved(true);
      setTimeout(() => setSliderSaved(false), 3000);
    } catch (err) {
      setSliderError(err.message);
    } finally {
      setSliderSaving(false);
    }
  }

  // ── Single hero photo ─────────────────────────────────
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

  async function handleSaveHero() {
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
    if (savedHero) return url === savedHero;
    return url === fallbackPhoto?.url;
  }

  return (
    <div>
      {/* ── Hero Slider Photos ──────────────────────────── */}
      <Card>
        <CardHeader
          title="Hero Slider Photos"
          subtitle="These images cycle as the full-page background on the landing page. Upload multiple photos and arrange their order. If none are set, Hospitable photos are used instead."
        />

        {/* Current slider grid */}
        {sliderPhotos.length > 0 && (
          <div style={s.sliderGrid}>
            {sliderPhotos.map((url, i) => (
              <div key={url + i} style={s.sliderItem}>
                <img src={url} alt={`Slide ${i + 1}`} style={s.sliderImg} loading="lazy"
                  onError={e => { e.target.style.display = 'none'; }} />
                <div style={s.sliderBadge}>{i + 1}</div>
                <div style={s.sliderActions}>
                  <button
                    style={s.sliderBtn}
                    onClick={() => moveSliderPhoto(i, -1)}
                    disabled={i === 0}
                    title="Move left"
                  >←</button>
                  <button
                    style={s.sliderBtn}
                    onClick={() => moveSliderPhoto(i, 1)}
                    disabled={i === sliderPhotos.length - 1}
                    title="Move right"
                  >→</button>
                  <button
                    style={{ ...s.sliderBtn, ...s.sliderBtnRemove }}
                    onClick={() => removeSliderPhoto(i)}
                    title="Remove"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sliderPhotos.length === 0 && !sliderUploading && (
          <div style={s.empty}>
            No hero slider photos yet — upload some below. Hospitable photos will be used as fallback.
          </div>
        )}

        {/* Upload area */}
        <div style={s.uploadArea} onClick={() => sliderInputRef.current?.click()}>
          <input
            ref={sliderInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleSliderFiles}
          />
          {sliderUploading ? (
            <div style={s.uploadMsg}>Uploading…</div>
          ) : (
            <>
              <div style={s.uploadIcon}>🖼️</div>
              <div style={s.uploadMsg}>Upload photos — select multiple at once</div>
              <div style={s.uploadHint}>JPG, PNG, WebP · Recommended: 2400×1600px or wider, landscape orientation</div>
            </>
          )}
        </div>

        {sliderError && <div style={s.error}>{sliderError}</div>}

        {sliderDirty && (
          <div style={s.saveRow}>
            <span style={s.pendingNote}>Unsaved changes</span>
            <button style={s.saveBtn} onClick={saveSliderPhotos} disabled={sliderSaving}>
              {sliderSaving ? 'Saving…' : `Save Slider Photos (${sliderPhotos.length})`}
            </button>
          </div>
        )}
        {sliderSaved && <div style={s.successMsg}>✓ Slider photos saved</div>}
      </Card>

      {/* ── Single Hero Photo Override — only relevant (and shown) when
           Hero Slider Photos is empty; slider photos take priority ── */}
      {sliderPhotos.length === 0 && (
      <Card>
        <CardHeader
          title="Hero Photo Override (Legacy)"
          subtitle="A single custom photo that pins itself as the first slide. Only used when Hero Slider Photos is empty."
        />

        <div style={s.heroPreview}>
          {effectiveHero ? (
            <img src={effectiveHero} alt="Hero preview" style={s.heroImg} />
          ) : (
            <div style={s.heroEmpty}>No hero photo set</div>
          )}
          <div style={s.heroOverlay}>
            <span style={s.heroLabel}>
              {pendingHero ? '⚠️ Unsaved — click Save to apply'
                : savedHero ? '✓ Current hero photo override'
                : '← Using first Hospitable photo (fallback)'}
            </span>
          </div>
        </div>

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
            <button style={s.saveBtn} onClick={handleSaveHero} disabled={saving}>
              {saving ? 'Saving…' : 'Save Hero Photo'}
            </button>
          </div>
        )}
        {saved && <div style={s.successMsg}>✓ Hero photo saved</div>}
      </Card>
      )}

      {/* ── Hospitable photos ─────────────────────────── */}
      <Card>
        <CardHeader
          title={`Hospitable Photos (${hospPhotos.length})`}
          subtitle="Synced from Hospitable. Used as the slider fallback when no custom hero slider photos are set. Manage the gallery in Hospitable."
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
                title="Click to set as hero photo override"
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
              </div>
            );
          })}
        </div>

        {hospPhotos.length > 0 && (
          <p style={s.hint}>
            {savedHero
              ? savedHero.includes('altus-retreats-media') ? '✓ Custom uploaded photo is set as hero override.' : '✓ A Hospitable photo is set as hero override.'
              : 'No hero override set — first photo is used as fallback.'}
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

  // Slider grid
  sliderGrid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 },
  sliderItem:        { position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#F3F4F6', border: '2px solid #E5E7EB' },
  sliderImg:         { width: '100%', height: 130, objectFit: 'cover', display: 'block' },
  sliderBadge:       { position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4 },
  sliderActions:     { display: 'flex', gap: 4, padding: '6px 8px', background: '#F9FAFB', justifyContent: 'flex-end' },
  sliderBtn:         { background: '#fff', border: '1px solid #D1D5DB', borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' },
  sliderBtnRemove:   { color: '#DC2626', borderColor: '#FCA5A5' },

  // Upload
  uploadArea:        { border: '2px dashed #D1D5DB', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16 },
  uploadIcon:        { fontSize: 28, marginBottom: 8 },
  uploadMsg:         { fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 },
  uploadHint:        { fontSize: 12, color: '#9CA3AF' },
  error:             { fontSize: 13, color: '#DC2626', marginBottom: 12 },
  saveRow:           { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  pendingNote:       { fontSize: 13, color: '#D97706' },
  saveBtn:           { background: '#1C2E26', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  successMsg:        { fontSize: 13, color: '#16A34A', fontWeight: 500, marginTop: 8 },
  empty:             { color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0', marginBottom: 16 },

  // Single hero preview
  heroPreview:       { position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 16, height: 200, background: '#F3F4F6' },
  heroImg:           { width: '100%', height: '100%', objectFit: 'cover' },
  heroEmpty:         { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: 13, padding: 20, textAlign: 'center' },
  heroOverlay:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' },
  heroLabel:         { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500 },

  // Hospitable grid
  photoGrid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  photoItem:         { borderRadius: 8, overflow: 'hidden', background: '#F3F4F6', position: 'relative', cursor: 'pointer', border: '2px solid transparent', transition: 'border-color 0.15s' },
  photoItemActive:   { border: '2px solid #1C2E26' },
  photoItemSelected: { border: '2px solid #D97706' },
  photoImg:          { width: '100%', height: 120, objectFit: 'cover', display: 'block' },
  heroBadge:         { position: 'absolute', top: 6, left: 6, background: '#1C2E26', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em' },
  hint:              { fontSize: 12, color: '#9CA3AF', marginTop: 12, margin: 0 },
};
