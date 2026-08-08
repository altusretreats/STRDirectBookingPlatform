import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';

const STATUS_STYLES = {
  CONFIRMED: { background:'#DCFCE7', color:'#16A34A' },
  PENDING:   { background:'#FEF9C3', color:'#CA8A04' },
  CANCELLED: { background:'#FEE2E2', color:'#DC2626' },
  FAILED:    { background:'#F3F4F6', color:'#6B7280' },
};

export default function BookingsList({ propertyId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    // TODO: add admin/bookings endpoint — for now show placeholder
    setLoading(false);
    setBookings(MOCK_BOOKINGS);
  }, [propertyId]);

  const fmt = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  const fmtMoney = (cents) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits:2 });

  if (loading) return <div style={{ color:'#6B7280', padding:40 }}>Loading bookings…</div>;

  return (
    <div>
      <h1 style={{ fontSize:28, fontWeight:700, color:'#111827', marginBottom:4 }}>Bookings</h1>
      <p style={{ color:'#6B7280', marginBottom:32, fontSize:15 }}>All reservations for this property.</p>

      {error && <div style={{ background:'#FEF2F2', color:'#DC2626', padding:'12px 16px', borderRadius:8, marginBottom:20, fontSize:14 }}>{error}</div>}

      <div style={{ overflowX:'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Guest','Check-in','Check-out','Nights','Total','Status','Booking ID'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.bookingId} style={s.tr}>
                <td style={s.td}>
                  <div style={{ fontWeight:600, color:'#111827' }}>{b.guest.firstName} {b.guest.lastName}</div>
                  <div style={{ fontSize:12, color:'#6B7280' }}>{b.guest.email}</div>
                </td>
                <td style={s.td}>{fmt(b.checkIn)}</td>
                <td style={s.td}>{fmt(b.checkOut)}</td>
                <td style={s.td}>{b.nights}</td>
                <td style={s.td}>{fmtMoney(b.pricing.total)}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, ...STATUS_STYLES[b.status] }}>{b.status}</span>
                </td>
                <td style={{ ...s.td, fontSize:11, color:'#9CA3AF', fontFamily:'monospace' }}>{b.bookingId}</td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:'40px', color:'#9CA3AF' }}>No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const MOCK_BOOKINGS = [
  { bookingId:'bk_abc123', status:'CONFIRMED', guest:{ firstName:'Sarah', lastName:'Johnson', email:'sarah@example.com' },
    checkIn:'2026-09-15', checkOut:'2026-09-20', nights:5, pricing:{ total:175500 } },
  { bookingId:'bk_def456', status:'PENDING', guest:{ firstName:'Mike', lastName:'Chen', email:'mike@example.com' },
    checkIn:'2026-10-01', checkOut:'2026-10-05', nights:4, pricing:{ total:142000 } },
];

const s = {
  table: { width:'100%', borderCollapse:'collapse', background:'#fff', borderRadius:12, overflow:'hidden', border:'1px solid #E5E7EB', fontSize:14 },
  th:    { padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' },
  tr:    { borderBottom:'1px solid #F3F4F6' },
  td:    { padding:'14px 16px', color:'#374151', verticalAlign:'top' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:100, fontSize:12, fontWeight:600 },
};
