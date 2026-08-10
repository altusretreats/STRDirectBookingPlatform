/**
 * Location tab — editable location fields with override toggles.
 * Override lock = sync won't overwrite that field.
 */
import { useState } from 'react';
import { adminApi } from '../lib/api';
import MarkdownEditor from './MarkdownEditor';

// ── Sub-components ────────────────────────────────────────────────────────────
function Card({ children }) { return <div style={s.card}>{children}</div>; }
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
function OverrideBadge({ locked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={locked ? 'Locked — sync will not overwrite. Click to unlock.' : 'Unlocked — sync may overwrite. Click to lock.'}
      style={{
        ...s.overrideBadge,
        background:  locked ? '#FEF3C7' : '#F3F4F6',
        color:       locked ? '#92400E' : '#6B7280',
        borderColor: locked ? '#FCD34D' : '#E5E7EB',
      }}
    >
      {locked ? '🔒 Locked from sync' : '🔓 Lock from sync'}
    </button>
  );
}
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
export default function LocationEditor({ property, cached, onSaved }) {
  const stored    = property?.location              ?? {};
  const hospLoc   = cached?.location               ?? {};
  const initOvr   = property?.content?.overrides   ?? {};

  const [neighborhood,     setNeighborhood]     = useState(stored.neighborhood     ?? hospLoc.neighborhood     ?? '');
  const [neighborhoodDesc, setNeighborhoodDesc] = useState(stored.neighborhoodDesc ?? hospLoc.neighborhoodDescription ?? '');
  const [directions,       setDirections]       = useState(stored.directions       ?? hospLoc.directions       ?? '');
  const [gettingAround,    setGettingAround]    = useState(stored.gettingAround    ?? hospLoc.gettingAround    ?? '');
  const [pinLat,           setPinLat]           = useState(String(stored.pinLat    ?? hospLoc.pinLat           ?? ''));
  const [pinLng,           setPinLng]           = useState(String(stored.pinLng    ?? hospLoc.pinLng           ?? ''));
  const [mapsEmbed,        setMapsEmbed]        = useState(stored.mapsEmbed        ?? '');

  const [overrides, setOverrides] = useState(initOvr);

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState(null);

  function toggleOverride(key) {
    setOverrides(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await adminApi.updateProperty(property.slug, {
        location: {
          neighborhood, neighborhoodDesc, directions, gettingAround,
          pinLat: pinLat ? parseFloat(pinLat) : null,
          pinLng: pinLng ? parseFloat(pinLng) : null,
          mapsEmbed,
        },
        // Persist override flags together with location save
        content: { ...property?.content, overrides },
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

  const hasCoords    = pinLat && pinLng;
  const mapPreviewUrl = hasCoords
    ? `https://www.google.com/maps?q=${pinLat},${pinLng}&z=13&output=embed`
    : null;

  return (
    <div>
      {/* ── Neighborhood ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Neighborhood" subtitle="Shown in the location section of the booking site." />

        <FieldRow
          label="Neighborhood Name"
          overrideKey="neighborhood"
          overrides={overrides}
          onOverrideToggle={toggleOverride}
          hint={hospLoc.neighborhood ? `Hospitable: "${hospLoc.neighborhood}"` : undefined}
        >
          <input
            style={s.input}
            placeholder="e.g. Red River Gorge"
            value={neighborhood}
            onChange={e => setNeighborhood(e.target.value)}
          />
        </FieldRow>

        <FieldRow
          label="Neighborhood Description"
          overrideKey="neighborhoodDesc"
          overrides={overrides}
          onOverrideToggle={toggleOverride}
          hint={hospLoc.neighborhoodDescription ? `Hospitable: "${hospLoc.neighborhoodDescription.slice(0, 80)}…"` : undefined}
        >
          <MarkdownEditor
            value={neighborhoodDesc}
            onChange={setNeighborhoodDesc}
            placeholder="Describe the area for guests…"
            rows={4}
          />
        </FieldRow>
      </Card>

      {/* ── Getting There ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Getting There" subtitle="Directions and local transportation info shown on the booking site." />

        <FieldRow
          label="Driving Directions"
          overrideKey="directions"
          overrides={overrides}
          onOverrideToggle={toggleOverride}
          hint={hospLoc.directions ? `Hospitable: "${hospLoc.directions.slice(0, 80)}…"` : undefined}
        >
          <MarkdownEditor
            value={directions}
            onChange={setDirections}
            placeholder="From the Bert T. Combs Mountain Parkway, take exit 33…"
            rows={5}
          />
        </FieldRow>

        <FieldRow
          label="Getting Around"
          overrideKey="gettingAround"
          overrides={overrides}
          onOverrideToggle={toggleOverride}
          hint={hospLoc.gettingAround ? `Hospitable: "${hospLoc.gettingAround.slice(0, 80)}…"` : undefined}
        >
          <MarkdownEditor
            value={gettingAround}
            onChange={setGettingAround}
            placeholder="A car is essential. Nearest grocery is 18 miles…"
            rows={4}
          />
        </FieldRow>
      </Card>

      {/* ── Map Pin ───────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Map Pin"
          subtitle="Latitude / longitude for the map embed. Decimal degrees (e.g. 37.7918, -83.6832)."
        />
        <div style={s.coordRow}>
          <FormField label="Latitude">
            <input style={s.input} placeholder="37.7918" value={pinLat} onChange={e => setPinLat(e.target.value)} type="number" step="0.0001" />
          </FormField>
          <FormField label="Longitude">
            <input style={s.input} placeholder="-83.6832" value={pinLng} onChange={e => setPinLng(e.target.value)} type="number" step="0.0001" />
          </FormField>
        </div>

        {mapPreviewUrl && (
          <div style={s.mapPreview}>
            <iframe src={mapPreviewUrl} width="100%" height="280" style={{ border: 0, borderRadius: 8 }} loading="lazy" title="Map preview" />
          </div>
        )}

        <FormField
          label="Custom Google Maps Embed Code (optional)"
          hint="Paste the full <iframe> embed code from Google Maps → Share → Embed. Overrides the lat/lng pin."
        >
          <textarea
            style={{ ...s.input, ...s.textarea, fontFamily: 'monospace', fontSize: 12 }}
            rows={3}
            placeholder='<iframe src="https://www.google.com/maps/embed?..."…>'
            value={mapsEmbed}
            onChange={e => setMapsEmbed(e.target.value)}
          />
        </FormField>
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
  textarea:      { resize: 'vertical', lineHeight: 1.6 },
  overrideBadge: { fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, border: '1px solid', cursor: 'pointer', background: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  coordRow:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  mapPreview:    { marginBottom: 20, borderRadius: 8, overflow: 'hidden' },
  actions:       { display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' },
  saveBtn:       { background: '#1C2E26', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  successMsg:    { fontSize: 13, color: '#16A34A', fontWeight: 500 },
  errorMsg:      { fontSize: 13, color: '#DC2626', flex: 1 },
};
