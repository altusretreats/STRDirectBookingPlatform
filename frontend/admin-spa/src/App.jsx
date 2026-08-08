import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard'); // dashboard | guidebook | bookings

  if (loading) return <div style={styles.loading}>Loading…</div>;
  if (!user)   return <LoginPage />;
  return <Dashboard page={page} setPage={setPage} />;
}

const styles = {
  loading: { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#6B7280', fontWeight:600 }
};
