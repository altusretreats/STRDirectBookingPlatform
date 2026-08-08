import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';
import { navigate } from '../App';
import GuidebookEditor from '../components/GuidebookEditor';
import BookingsList from '../components/BookingsList';
import SyncPanel from '../components/SyncPanel';
import ContentEditor from '../components/ContentEditor';
import LocationEditor from '../components/LocationEditor';
import MediaPanel from '../components/MediaPanel';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: '⊞' },
  { id: 'content',   label: 'Content',   icon: '✏️' },
  { id: 'media',     label: 'Media',     icon: '🖼️' },
  { id: 'location',  label: 'Location',  icon: '📍' },
  { id: 'sync',      label: 'Sync',      icon: '🔄' },
  { id: 'guidebook', label: 'Guidebook', icon: '📖' },
  { id: 'bookings',  label: 'Bookings',  icon: '📅' },
];

export default function PropertyDetail({ propertyId, tab, property: propFromParent, onPropertyUpdated }) {
  const [property, setProperty] = useState(propFromParent ?? null);
  const [loading, setLoading] = useState(!propFromParent);

  useEffect(() => {
    if (!propFromParent) {
      setLoading(true);
      adminApi.getProperty(propertyId)
        .then(p => setProperty(p))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setProperty(propFromParent);
    }
  }, [propertyId, propFromParent]);

  const handlePropertyUpdate = (updated) => {
    setProperty(updated);
    onPropertyUpdated?.(updated);
  };

  if (loading) return (
    <div style={{ padding:'40px 48px', color:'#6B7280' }}>Loading property…</div>
  );
  if (!property) return (
    <div style={{ padding:'40px 48px', color:'#DC2626' }}>Property "{propertyId}" not found.</div>
  );

  const activeTab = TABS.find(t => t.id === tab)?.id ?? 'overview';
  const cached = property.hospitable?.cached ?? {};

  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.header}>
        <div>
          <div style={s.breadcrumb}>
            <button style={s.crumbBtn} onClick={() => navigate('/properties')}>Properties</button>
            <span style={s.crumbSep}>›</span>
            <span style={s.crumbCurrent}>{property.name}</span>
          </div>
          <h1 style={s.title}>{property.name}</h1>
          {property.domain && (
            <a href={`https://${property.domain}`} target="_blank" style={s.domain}>{property.domain}</a>
          )}
        </div>
        <div style={s.headerMeta}>
          {cached.lastSyncedAt && (
            <span style={s.syncBadge}>
              Synced {new Date(property.hospitable.lastSyncedAt).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
            </span>
          )}
          <span style={{ ...s.statusBadge, ...(property.active ? s.statusActive : s.statusInactive) }}>
            {property.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
            onClick={() => navigate(`/properties/${propertyId}/${t.id}`)}
          >
            <span style={s.tabIcon}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={s.content}>
        {activeTab === 'overview'  && <OverviewTab property={property} cached={cached} />}
        {activeTab === 'content'   && <ContentEditor property={property} onSaved={handlePropertyUpdate} />}
        {activeTab === 'media'     && <MediaPanel property={property} cached={cached} onSaved={handlePropertyUpdate} />}
        {activeTab === 'location'  && <LocationEditor property={property} cached={cached} onSaved={handlePropertyUpdate} />}
        {activeTab === 'sync'      && <SyncPanel property={property} onSynced={handlePropertyUpdate} />}
        {activeTab === 'guidebook' && <GuidebookEditor propertyId={propertyId} propertyName={property.name} />}
        {activeTab === 'bookings'  && <BookingsList propertyId={propertyId} />}
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ property, cached }) {
  return (
    <div>
      <div style={s.statsGrid}>
        <StatCard icon="🛏️" label="Bedrooms"   value={cached.bedrooms  ?? property.bedrooms  ?? '—'} />
        <StatCard icon="🚿" label="Bathrooms"  value={cached.bathrooms ?? property.bathrooms ?? '—'} />
        <StatCard icon="👥" label="Max Guests" value={cached.maxGuests ?? property.maxGuests ?? '—'} />
        <StatCard icon="📸" label="Photos"     value={cached.photos?.length ?? '—'} />
        <StatCard icon="✨" label="Amenities"  value={cached.amenities?.length ?? '—'} />
        <StatCard icon="📋" label="House Rules" value={cached.houseRules?.length ?? '—'} />
      </div>

      {cached.summary && (
        <Section title="Summary">
          <p style={{ color:'#374151', lineHeight:1.6, margin:0 }}>{cached.summary}</p>
        </Section>
      )}

      {cached.amenities?.length > 0 && (
        <Section title="Amenities">
          <div style={s.tagList}>
            {cached.amenities.map((a, i) => <span key={i} style={s.tag}>{a}</span>)}
          </div>
        </Section>
      )}

      {cached.houseRules?.length > 0 && (
        <Section title="House Rules">
          <ul style={{ margin:0, paddingLeft:20, color:'#374151', lineHeight:1.8 }}>
            {cached.houseRules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </Section>
      )}

      {cached.cancellationPolicy && (
        <Section title="Cancellation Policy">
          <p style={{ color:'#374151', lineHeight:1.6, margin:0 }}>{cached.cancellationPolicy}</p>
        </Section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div style={s.statCard}>
      <div style={s.statIcon}>{icon}</div>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

const s = {
  page:        { display:'flex', flexDirection:'column', height:'100%' },
  header:      { padding:'32px 40px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 },
  breadcrumb:  { display:'flex', alignItems:'center', gap:6, marginBottom:8, fontSize:13, color:'#9CA3AF' },
  crumbBtn:    { background:'none', border:'none', padding:0, cursor:'pointer', color:'#6B7280', fontSize:13, fontFamily:'inherit', textDecoration:'underline' },
  crumbSep:    { color:'#D1D5DB' },
  crumbCurrent:{ color:'#374151' },
  title:       { fontSize:26, fontWeight:700, color:'#111827', margin:0, marginBottom:4 },
  domain:      { fontSize:13, color:'#6B7280', textDecoration:'none', borderBottom:'1px solid #E5E7EB' },
  headerMeta:  { display:'flex', alignItems:'center', gap:10, paddingTop:28, flexShrink:0 },
  syncBadge:   { fontSize:12, color:'#6B7280', background:'#F3F4F6', padding:'4px 10px', borderRadius:20 },
  statusBadge: { fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:20 },
  statusActive:{ background:'#DCFCE7', color:'#16A34A' },
  statusInactive:{ background:'#FEE2E2', color:'#DC2626' },
  tabs:        { display:'flex', gap:0, padding:'24px 40px 0', borderBottom:'1px solid #E5E7EB', background:'#F9FAFB' },
  tab:         { display:'flex', alignItems:'center', gap:6, padding:'10px 16px', border:'none', borderBottom:'2px solid transparent', background:'none', cursor:'pointer', fontSize:13, fontWeight:500, color:'#6B7280', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1 },
  tabActive:   { color:'#111827', borderBottomColor:'#2D3A2E', fontWeight:600 },
  tabIcon:     { fontSize:14 },
  content:     { padding:'32px 40px', overflowY:'auto', flex:1 },
  statsGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:16, marginBottom:32 },
  statCard:    { background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'20px 16px', textAlign:'center' },
  statIcon:    { fontSize:22, marginBottom:8 },
  statValue:   { fontSize:22, fontWeight:700, color:'#111827', marginBottom:4 },
  statLabel:   { fontSize:12, color:'#9CA3AF' },
  section:     { background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'20px 24px', marginBottom:16 },
  sectionTitle:{ fontSize:14, fontWeight:600, color:'#374151', margin:0, marginBottom:12 },
  tagList:     { display:'flex', flexWrap:'wrap', gap:8 },
  tag:         { background:'#F3F4F6', color:'#374151', fontSize:13, padding:'4px 12px', borderRadius:20 },
};
