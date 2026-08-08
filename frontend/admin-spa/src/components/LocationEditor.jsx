/**
 * Location tab — editable location fields with Hospitable data as defaults.
 * Fields: neighborhood, neighborhoodDescription, directions, gettingAround, pin lat/lng, Google Maps embed.
 */
import { useState } from 'react';
import { adminApi } from '../lib/api';

export default function LocationEditor({ property, cached, onSaved }) {
  const stored = property?.location ?? cached?.location ?? {};

  const [neighborhood,    setNeighborhood]    = useState(stored.neighborhood    ?? cached.location?.neighborhood    ?? '');
  const [neighborhoodDesc,setNeighborhoodDesc]= useState(stored.neighborhoodDesc?? cached.location?.neighborhoodDescription ?? '');
  const [directions,      setDirections]      = useState(stored.directions      ?? cached.location?.directions      ?? '');
  const [gettingAround,   setGettingAround]   = useState(stored.gettingAround   ?? cached.location?.gettingAround   ?? '');
  const [pinLat,          setPinLat]          = useState(String(stored.pinLat   ?? cached.location?.pinLat ?? ''));
  const [pinLng,          setPinLng]          = useState(String(stored.pinLng   ?? cached.location?.pinLng ?? ''));
  const [mapsEmbed,       setMapsEmbed]       = useState(stored.mapsEmbed       ?? '');

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState(null);

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

  // Build a preview map URL from lat/lng
  const hasCoords = pinLat && pinLng;
  const mapPreviewUrl = hasCoords
    ? `https://www.google.com/maps?q=${pinLat},${pinLng}&z=13&output=embed`
    : null;

  return (
    <div>
      {/* Neighborhood */}
      <Card>
        <CardHeader
          title="Neighborhood"
          subtitle="Shown in the location section of the booking site"
        />
        <FormField label="Neighborhood Name">
          <input style={s.input} placeholder="e.g. Red River Gorge" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
        </FormField>
        <FormField label="Neighborhood Description">
          <textarea style={{ ...s.input, ...s.textarea }} rows={3} placeholder="Describe the area for guests…" value={neighborhoodDesc} onChange={e => setNeighborhoodDesc(e.target.value)} />
        </FormField>
      </Card>

      {/* Directions + Getting Around */}
      <Card>
        <CardHeader
          title="Getting There"
          subtitle="Directions and local transportation info shown on the booking site"
        />
        <FormField label="Driving Directions">
          <textarea style={{ ...s.input, ...s.textarea }} rows={4} placeholder="From the Bert T. Combs Mountain Parkway, take exit 33…" value={directions} onChange={e => setDirections(e.target.value)} />
        </FormField>
        <FormField label="Getting Around">
          <textarea style={{ ...s.input, ...s.textarea }} rows={3} placeholder="A car is essential. Nearest grocery is 18 miles…" value={gettingAround} onChange={e => setGettingAround(e.target.value)} />
        </FormField>
      </Card>

      {/* Map pin */}
      <Card>
        <CardHeader
          title="Map Pin"
          subtitle="Latitude / longitude for the Google Maps embed. Use decimal degrees (e.g. 37.7918, -83.6832)."
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
            <iframe
              src={mapPreviewUrl}
              width="100%" height="280" style={{ border:0, borderRadius:8 }}
              loading="lazy" title="Map preview"
            />
          </div>
        )}

        <FormField label="Custom Google Maps Embed Code (optional)" hint="Paste the full <iframe> embed code from Google Maps → Share → Embed. Overrides the lat/lng pin if provided.">
          <textarea style={{ ...s.input, ...s.textarea, fontFamily:'monospace', fontSize:12 }} rows={3} placeholder='<iframe src="https://www.google.com/maps/embed?..."…>' value={mapsEmbed} onChange={e => setMapsEmbed(e.target.value)} />
        </FormField>
      </Card>

      {/* Actions */}
      <div style={s.actions}>
        {error  && <div style={s.errorMsg}>{error}</div>}
        {saved  && <div style={s.successMsg}>Saved!</div>}
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
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
  card:        { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'24px', marginBottom:16 },
  cardHeader:  { marginBottom:20 },
  cardTitle:   { fontSize:15, fontWeight:600, color:'#111827', margin:0, marginBottom:4 },
  cardSub:     { fontSize:13, color:'#6B7280', margin:0 },
  field:       { marginBottom:20 },
  label:       { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:4 },
  hint:        { fontSize:12, color:'#9CA3AF', marginBottom:6, fontStyle:'italic' },
  input:       { width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#111827', outline:'none', boxSizing:'border-box', background:'#fff' },
  textarea:    { resize:'vertical', lineHeight:1.6 },
  coordRow:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  mapPreview:  { marginBottom:20, borderRadius:8, overflow:'hidden' },
  actions:     { display:'flex', alignItems:'center', gap:16, justifyContent:'flex-end' },
  saveBtn:     { background:'#1C2E26', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  successMsg:  { fontSize:13, color:'#16A34A', fontWeight:500 },
  errorMsg:    { fontSize:13, color:'#DC2626', flex:1 },
};
