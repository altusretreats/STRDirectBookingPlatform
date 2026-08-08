import { useState } from 'react';
import { adminApi } from '../lib/api';

export default function SyncPanel({ property, onSynced }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const cached = property?.hospitable?.cached ?? {};
  const lastSynced = property?.hospitable?.lastSyncedAt;
  const hospId = property?.hospitable?.propertyId;

  async function handleSync() {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await adminApi.syncProperty(property.slug);
      setResult(r);
      // Refresh property data
      const updated = await adminApi.getProperty(property.slug);
      onSynced?.(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Hospitable connection card */}
      <Card>
        <CardHeader
          title="Hospitable Connection"
          subtitle="Data is pulled directly from your Hospitable listing"
        />
        <div style={s.row}>
          <Field label="Hospitable Property ID" value={hospId || 'Not configured'} mono={!!hospId} />
          <Field label="Last Synced" value={lastSynced ? formatDate(lastSynced) : 'Never'} />
          <Field label="Photos" value={cached.photos?.length ?? '—'} />
          <Field label="Amenities" value={cached.amenities?.length ?? '—'} />
        </div>

        {!hospId && (
          <Notice type="warning">
            No Hospitable property ID configured. Set <code>hospitable.propertyId</code> in the property record to enable sync.
          </Notice>
        )}
      </Card>

      {/* Sync action card */}
      <Card>
        <CardHeader
          title="Sync Now"
          subtitle="Pulls the latest listing data from Hospitable and saves it to your database"
        />

        <button
          style={{ ...s.syncBtn, ...(loading ? s.syncBtnLoading : {}) }}
          onClick={handleSync}
          disabled={loading || !hospId}
        >
          {loading ? (
            <><Spinner /> Syncing…</>
          ) : (
            <><span style={s.btnIcon}>↻</span> Sync from Hospitable</>
          )}
        </button>

        {error && (
          <Notice type="error">{error}</Notice>
        )}

        {result && (
          <Notice type="success">
            Sync complete! Imported {result.summary?.photos ?? 0} photos and {result.summary?.amenities ?? 0} amenities for <strong>{result.summary?.name}</strong>.
          </Notice>
        )}
      </Card>

      {/* What gets synced */}
      <Card>
        <CardHeader
          title="What Gets Synced"
          subtitle="All data below is read from Hospitable and stored locally. You can override some fields in the Content tab."
        />
        <div style={s.syncItemGrid}>
          {[
            { label: 'Property Name',        status: cached.name             ? 'ok' : 'empty' },
            { label: 'Summary',              status: cached.summary          ? 'ok' : 'empty' },
            { label: 'Property Type',        status: cached.propertyType     ? 'ok' : 'empty' },
            { label: 'Bedrooms / Baths',     status: cached.bedrooms != null ? 'ok' : 'empty' },
            { label: 'Amenities',            status: cached.amenities?.length ? 'ok' : 'empty' },
            { label: 'Photos',               status: cached.photos?.length   ? 'ok' : 'empty' },
            { label: 'House Rules',          status: cached.houseRules?.length ? 'ok' : 'empty' },
            { label: 'Cancellation Policy',  status: cached.cancellationPolicy ? 'ok' : 'empty' },
            { label: 'Location / Directions',status: cached.location         ? 'ok' : 'empty' },
            { label: 'Tags',                 status: cached.tags?.length     ? 'ok' : 'empty' },
            { label: 'Check-in / out times', status: cached.checkInTime      ? 'ok' : 'empty' },
          ].map(({ label, status }) => (
            <div key={label} style={s.syncItem}>
              <span style={{ ...s.dot, ...(status === 'ok' ? s.dotOk : s.dotEmpty) }} />
              <span style={s.syncItemLabel}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Schedule note */}
      <Card>
        <CardHeader
          title="Automatic Sync"
          subtitle="Properties are automatically synced from Hospitable every day at 2:00 AM EST."
        />
        <div style={s.scheduleInfo}>
          <span style={s.scheduleIcon}>⏰</span>
          Daily at 2:00 AM EST via EventBridge Scheduler
        </div>
      </Card>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
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

function Field({ label, value, mono }) {
  return (
    <div style={s.field}>
      <div style={s.fieldLabel}>{label}</div>
      <div style={{ ...s.fieldValue, ...(mono ? s.mono : {}) }}>{value}</div>
    </div>
  );
}

function Notice({ type, children }) {
  const colors = {
    success: { bg:'#F0FDF4', border:'#BBF7D0', color:'#166534' },
    warning: { bg:'#FFFBEB', border:'#FDE68A', color:'#92400E' },
    error:   { bg:'#FEF2F2', border:'#FECACA', color:'#991B1B' },
  };
  const c = colors[type] || colors.success;
  return (
    <div style={{ ...s.notice, background:c.bg, borderColor:c.border, color:c.color }}>
      {children}
    </div>
  );
}

function Spinner() {
  return <span style={s.spinner}>◌</span>;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

const s = {
  card:        { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'24px', marginBottom:16 },
  cardHeader:  { marginBottom:20 },
  cardTitle:   { fontSize:15, fontWeight:600, color:'#111827', margin:0, marginBottom:4 },
  cardSub:     { fontSize:13, color:'#6B7280', margin:0 },
  row:         { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:20, marginBottom:16 },
  field:       {},
  fieldLabel:  { fontSize:11, fontWeight:600, color:'#9CA3AF', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 },
  fieldValue:  { fontSize:14, fontWeight:500, color:'#111827' },
  mono:        { fontFamily:'monospace', fontSize:13 },
  syncBtn:     { display:'inline-flex', alignItems:'center', gap:8, background:'#1C2E26', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  syncBtnLoading:{ opacity:0.7, cursor:'not-allowed' },
  btnIcon:     { fontSize:16 },
  notice:      { marginTop:16, padding:'12px 16px', borderRadius:8, border:'1px solid', fontSize:13, lineHeight:1.5 },
  spinner:     { animation:'spin 1s linear infinite', display:'inline-block' },
  syncItemGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 },
  syncItem:    { display:'flex', alignItems:'center', gap:8 },
  dot:         { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  dotOk:       { background:'#22C55E' },
  dotEmpty:    { background:'#D1D5DB' },
  syncItemLabel:{ fontSize:13, color:'#374151' },
  scheduleInfo:{ display:'flex', alignItems:'center', gap:10, fontSize:14, color:'#374151' },
  scheduleIcon:{ fontSize:18 },
};
