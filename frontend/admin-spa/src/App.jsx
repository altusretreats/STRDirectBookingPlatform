import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AdminShell from './pages/AdminShell';

// Simple hash router — no extra dependencies
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Parse: #/properties/kentucky/sync → { route: 'property', propertyId: 'kentucky', tab: 'sync' }
  const path = hash.replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'properties' && parts[1]) {
    return { route: 'property', propertyId: parts[1], tab: parts[2] || 'overview' };
  }
  if (parts[0] === 'hub') {
    return { route: 'hub', tab: parts[1] || 'content' };
  }
  return { route: 'properties', propertyId: null, tab: null };
}

export function navigate(path) {
  window.location.hash = path;
}

export default function App() {
  const { user, loading } = useAuth();
  const routeInfo = useHashRoute();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#6B7280', fontWeight:600 }}>
      Loading…
    </div>
  );
  if (!user) return <LoginPage />;
  return <AdminShell routeInfo={routeInfo} />;
}
