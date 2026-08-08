import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { adminApi } from '../lib/api';
import GuidebookEditor from '../components/GuidebookEditor';
import BookingsList from '../components/BookingsList';
import WaitlistTable from '../components/WaitlistTable';
import PropertySettings from '../components/PropertySettings';

export default function Dashboard({ page, setPage }) {
  const { user, logout } = useAuth();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    adminApi.listProperties().then(d => {
      setProperties(d.properties || []);
      if (d.properties?.length) setSelectedProperty(d.properties[0]);
    }).catch(console.error);
  }, []);

  return (
    <div style={s.shell}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarLogo}>Altus Retreats</div>

        {/* Property picker */}
        <div style={s.sidebarSection}>
          <div style={s.sidebarLabel}>Property</div>
          {properties.map(p => (
            <button key={p.slug} style={{ ...s.propBtn, ...(selectedProperty?.slug === p.slug ? s.propBtnActive : {}) }}
              onClick={() => setSelectedProperty(p)}>
              {p.name}
            </button>
          ))}
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {[
            { id: 'dashboard', icon: '⊞', label: 'Overview' },
            { id: 'guidebook', icon: '📖', label: 'Guidebook' },
            { id: 'bookings',  icon: '📅', label: 'Bookings' },
            { id: 'waitlist',  icon: '✉️', label: 'Waitlist' },
            { id: 'settings',  icon: '⚙️', label: 'Property Settings' },
          ].map(item => (
            <button key={item.id}
              style={{ ...s.navBtn, ...(page === item.id ? s.navBtnActive : {}) }}
              onClick={() => setPage(item.id)}>
              <span style={s.navIcon}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.userEmail}>{user?.email}</div>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        {page === 'dashboard' && <OverviewPage property={selectedProperty} />}
        {page === 'guidebook' && selectedProperty && <GuidebookEditor propertyId={selectedProperty.slug} propertyName={selectedProperty.name} />}
        {page === 'bookings'  && selectedProperty && <BookingsList propertyId={selectedProperty.slug} />}
        {page === 'waitlist'  && <WaitlistTable />}
        {page === 'settings'  && selectedProperty && <PropertySettings propertyId={selectedProperty.slug} propertyName={selectedProperty.name} />}
        {page === 'settings'  && !selectedProperty && <div style={s.placeholder}>Select a property to edit settings.</div>}
        {!selectedProperty && page !== 'dashboard' && <div style={s.placeholder}>Select a property to get started.</div>}
      </main>
    </div>
  );
}

function OverviewPage({ property }) {
  if (!property) return <div style={s.placeholder}>No properties found. <a href="#">Add one →</a></div>;
  return (
    <div>
      <h1 style={s.pageTitle}>{property.name}</h1>
      <p style={s.pageSub}>Welcome to the Altus Retreats admin panel.</p>
      <div style={s.cards}>
        <StatCard label="Property" value={property.slug} icon="🏠" />
        <StatCard label="Status" value={property.active ? 'Active' : 'Inactive'} icon="✓" color={property.active ? '#16A34A' : '#DC2626'} />
        <StatCard label="Domain" value={property.domain || 'Not set'} icon="🌐" />
        <StatCard label="Hospitable ID" value={property.hospitable?.listingId || 'Not set'} icon="🔗" />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = '#2D3A2E' }) {
  return (
    <div style={s.statCard}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ ...s.statValue, color }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

const s = {
  shell:       { display:'flex', minHeight:'100vh' },
  sidebar:     { width:260, background:'#1C2E26', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh', overflowY:'auto' },
  sidebarLogo: { padding:'28px 24px 20px', fontSize:18, fontWeight:700, color:'#fff', borderBottom:'1px solid rgba(255,255,255,0.08)' },
  sidebarSection: { padding:'20px 16px 8px' },
  sidebarLabel:{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', paddingLeft:8, marginBottom:8 },
  propBtn:     { width:'100%', textAlign:'left', padding:'8px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.7)', background:'transparent', fontFamily:'inherit', marginBottom:4 },
  propBtnActive:{ background:'rgba(255,255,255,0.12)', color:'#fff' },
  nav:         { padding:'8px 16px', flex:1 },
  navBtn:      { width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.7)', background:'transparent', fontFamily:'inherit', marginBottom:2 },
  navBtnActive:{ background:'rgba(255,255,255,0.12)', color:'#fff' },
  navIcon:     { fontSize:16, width:20, textAlign:'center' },
  sidebarFooter:{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.08)' },
  userEmail:   { fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn:   { fontSize:13, color:'rgba(255,255,255,0.6)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' },
  main:        { flex:1, padding:'40px 48px', overflowY:'auto' },
  pageTitle:   { fontSize:28, fontWeight:700, color:'#111827', marginBottom:4 },
  pageSub:     { color:'#6B7280', marginBottom:32, fontSize:15 },
  cards:       { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:20 },
  statCard:    { background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'24px 20px' },
  statValue:   { fontSize:16, fontWeight:700, marginBottom:4, color:'#2D3A2E', wordBreak:'break-all' },
  statLabel:   { fontSize:13, color:'#6B7280' },
  placeholder: { color:'#6B7280', fontSize:16, textAlign:'center', marginTop:80 },
};
