import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { login } from '../lib/cognito';

export default function LoginPage() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { session } = await login(email, password);
      setUser({ email: session.getIdToken().payload.email });
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Altus Retreats</div>
        <h1 style={s.title}>Admin Login</h1>
        <form onSubmit={handleSubmit}>
          <div style={s.group}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
          </div>
          <div style={s.group}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page:  { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F3F4F6' },
  card:  { background:'#fff', borderRadius:12, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', padding:'40px 48px', width:'100%', maxWidth:420 },
  logo:  { fontWeight:700, fontSize:20, color:'#2D4A3E', marginBottom:8 },
  title: { fontSize:24, fontWeight:700, marginBottom:28, color:'#111827' },
  group: { marginBottom:20 },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input: { width:'100%', padding:'10px 14px', border:'2px solid #E5E7EB', borderRadius:8, fontSize:15, fontFamily:'inherit', outline:'none', color:'#111827' },
  error: { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', padding:'10px 14px', borderRadius:8, fontSize:14, marginBottom:16 },
  btn:   { width:'100%', padding:'12px', background:'#2D4A3E', color:'#fff', border:'none', borderRadius:8, fontSize:16, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
};
