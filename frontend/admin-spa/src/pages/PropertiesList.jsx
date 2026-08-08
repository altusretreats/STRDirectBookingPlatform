import { navigate } from '../App';

export default function PropertiesList({ properties, loading }) {
  if (loading) return <PageWrap><div style={s.msg}>Loading properties…</div></PageWrap>;

  return (
    <PageWrap>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Properties</h1>
          <p style={s.sub}>Manage your Altus Retreats portfolio</p>
        </div>
        <button style={s.addBtn} onClick={() => alert('Add property: coming soon')}>
          + Add Property
        </button>
      </div>

      {properties.length === 0 && (
        <div style={s.empty}>No properties yet. Add your first property to get started.</div>
      )}

      <div style={s.grid}>
        {properties.map(p => (
          <PropertyCard key={p.slug} property={p} />
        ))}
      </div>
    </PageWrap>
  );
}

function PropertyCard({ property: p }) {
  const lastSync = p.hospitable?.lastSyncedAt
    ? new Date(p.hospitable.lastSyncedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : 'Never synced';
  const cached = p.hospitable?.cached || {};

  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div>
          <div style={s.cardName}>{p.name}</div>
          <div style={s.cardSlug}>{p.slug}</div>
        </div>
        <span style={{ ...s.badge, ...(p.active ? s.badgeActive : s.badgeInactive) }}>
          {p.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div style={s.cardStats}>
        <Stat label="Bedrooms"  value={cached.bedrooms  ?? '—'} />
        <Stat label="Bathrooms" value={cached.bathrooms ?? '—'} />
        <Stat label="Guests"    value={cached.maxGuests ?? '—'} />
        <Stat label="Photos"    value={cached.photos?.length ?? '—'} />
      </div>

      <div style={s.cardDomain}>
        {p.domain ? <a href={`https://${p.domain}`} target="_blank" style={s.link}>{p.domain}</a> : <span style={s.dim}>No domain set</span>}
      </div>

      <div style={s.cardFooter}>
        <span style={s.syncTime}>Last sync: {lastSync}</span>
        <button style={s.manageBtn} onClick={() => navigate(`/properties/${p.slug}/overview`)}>
          Manage →
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={s.stat}>
      <div style={s.statVal}>{value}</div>
      <div style={s.statLbl}>{label}</div>
    </div>
  );
}

function PageWrap({ children }) {
  return <div style={{ padding:'40px 48px', maxWidth:1100 }}>{children}</div>;
}

const s = {
  header:   { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:32 },
  title:    { fontSize:26, fontWeight:700, color:'#111827', margin:0, marginBottom:4 },
  sub:      { color:'#6B7280', fontSize:14, margin:0 },
  addBtn:   { background:'#2D3A2E', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' },
  grid:     { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:20 },
  card:     { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'24px', display:'flex', flexDirection:'column', gap:16 },
  cardTop:  { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 },
  cardName: { fontSize:17, fontWeight:700, color:'#111827', marginBottom:2 },
  cardSlug: { fontSize:12, color:'#9CA3AF', fontFamily:'monospace' },
  badge:    { fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 },
  badgeActive:   { background:'#DCFCE7', color:'#16A34A' },
  badgeInactive: { background:'#FEE2E2', color:'#DC2626' },
  cardStats:{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 },
  stat:     { textAlign:'center' },
  statVal:  { fontSize:18, fontWeight:700, color:'#111827' },
  statLbl:  { fontSize:11, color:'#9CA3AF', marginTop:2 },
  cardDomain:{ fontSize:13 },
  link:     { color:'#2D3A2E', textDecoration:'underline' },
  dim:      { color:'#9CA3AF' },
  cardFooter:{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid #F3F4F6', paddingTop:16, marginTop:0 },
  syncTime: { fontSize:12, color:'#9CA3AF' },
  manageBtn:{ background:'none', border:'1px solid #D1D5DB', borderRadius:7, padding:'6px 14px', fontSize:13, fontWeight:500, cursor:'pointer', color:'#374151' },
  msg:      { color:'#6B7280', fontSize:15 },
  empty:    { color:'#9CA3AF', fontSize:15, padding:'60px 0', textAlign:'center' },
};
