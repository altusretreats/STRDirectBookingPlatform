import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { adminApi } from '../lib/api';
import { navigate } from '../App';
import PropertiesList from './PropertiesList';
import PropertyDetail from './PropertyDetail';
import HubSitePage from './HubSitePage';

export default function AdminShell({ routeInfo }) {
  const { user, logout } = useAuth();
  const { route, propertyId, tab } = routeInfo;

  const [properties, setProperties] = useState([]);
  const [propsLoading, setPropsLoading] = useState(true);

  useEffect(() => {
    adminApi.listProperties()
      .then(d => setProperties(d.properties || []))
      .catch(console.error)
      .finally(() => setPropsLoading(false));
  }, []);

  const currentProp = properties.find(p => p.slug === propertyId);

  return (
    <div style={s.shell}>
      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={s.logo}>Altus Retreats</div>

        {/* Properties section */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Properties</div>

          {propsLoading
            ? <div style={s.dim}>Loading…</div>
            : properties.map(p => (
                <SidebarItem
                  key={p.slug}
                  label={p.name}
                  icon="🏠"
                  active={route === 'property' && propertyId === p.slug}
                  onClick={() => navigate(`/properties/${p.slug}/overview`)}
                />
              ))
          }

          <SidebarItem
            label="+ Add Property"
            icon=""
            muted
            active={false}
            onClick={() => navigate('/properties')}
          />
        </div>

        {/* Hub site */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Brand</div>
          <SidebarItem
            label="Altus Retreats Site"
            icon="🌐"
            active={route === 'hub'}
            onClick={() => navigate('/hub/content')}
          />
        </div>

        <div style={s.spacer} />

        <div style={s.footer}>
          <div style={s.userEmail}>{user?.email}</div>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>
        {route === 'properties' && (
          <PropertiesList properties={properties} loading={propsLoading} />
        )}
        {route === 'property' && propertyId && (
          <PropertyDetail
            propertyId={propertyId}
            tab={tab}
            property={currentProp}
            onPropertyUpdated={(updated) => {
              setProperties(prev => prev.map(p => p.slug === updated.slug ? updated : p));
            }}
          />
        )}
        {route === 'hub' && <HubSitePage tab={tab} />}
      </main>
    </div>
  );
}

function SidebarItem({ label, icon, active, onClick, muted }) {
  return (
    <button
      style={{ ...s.item, ...(active ? s.itemActive : {}), ...(muted ? s.itemMuted : {}) }}
      onClick={onClick}
    >
      {icon && <span style={s.itemIcon}>{icon}</span>}
      {label}
    </button>
  );
}

const s = {
  shell:       { display:'flex', minHeight:'100vh', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  sidebar:     { width:240, background:'#1C2E26', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh', overflowY:'auto' },
  logo:        { padding:'24px 20px 20px', fontSize:16, fontWeight:700, color:'#fff', borderBottom:'1px solid rgba(255,255,255,0.08)', letterSpacing:'-0.01em' },
  section:     { padding:'16px 12px 4px' },
  sectionLabel:{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', paddingLeft:8, marginBottom:6 },
  item:        { width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.65)', background:'transparent', fontFamily:'inherit', textAlign:'left', marginBottom:1 },
  itemActive:  { background:'rgba(255,255,255,0.12)', color:'#fff' },
  itemMuted:   { color:'rgba(255,255,255,0.35)', fontSize:12 },
  itemIcon:    { fontSize:14, width:18, flexShrink:0 },
  spacer:      { flex:1 },
  footer:      { padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.08)' },
  userEmail:   { fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn:   { fontSize:12, color:'rgba(255,255,255,0.5)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' },
  main:        { flex:1, overflowY:'auto', background:'#F9FAFB' },
  dim:         { fontSize:12, color:'rgba(255,255,255,0.3)', padding:'4px 12px' },
};
