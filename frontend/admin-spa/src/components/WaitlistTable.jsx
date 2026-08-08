import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';

const SOURCE_LABELS = {
  'altusretreats.net':   'Altus Retreats',
  'staytheoverhang.com': 'The Overhang',
  'unknown':             'Unknown',
};

export default function WaitlistTable() {
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('all');

  useEffect(() => {
    const source = filter === 'all' ? undefined : filter;
    setLoading(true);
    adminApi.getWaitlist(source)
      .then(d => { setEntries(d.entries || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [filter]);

  const sources = ['all', 'altusretreats.net', 'staytheoverhang.com'];

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Waitlist</h1>
          <p style={s.sub}>{entries.length} signup{entries.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={s.filters}>
          {sources.map(src => (
            <button key={src}
              style={{ ...s.filterBtn, ...(filter === src ? s.filterBtnActive : {}) }}
              onClick={() => setFilter(src)}>
              {src === 'all' ? 'All' : SOURCE_LABELS[src] || src}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={s.state}>Loading…</div>}
      {error   && <div style={{ ...s.state, color: '#DC2626' }}>Error: {error}</div>}

      {!loading && !error && entries.length === 0 && (
        <div style={s.state}>No signups yet.</div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Email</th>
                <th style={s.th}>Source</th>
                <th style={s.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={i % 2 === 0 ? s.rowEven : s.rowOdd}>
                  <td style={s.td}>{e.email}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: badgeColor(e.source) }}>
                      {SOURCE_LABELS[e.source] || e.source}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: '#6B7280', fontSize: 13 }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function badgeColor(source) {
  if (source === 'altusretreats.net')   return '#D1FAE5';
  if (source === 'staytheoverhang.com') return '#FEF3C7';
  return '#F3F4F6';
}

const s = {
  header:        { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 },
  title:         { fontSize:28, fontWeight:700, color:'#111827', marginBottom:4 },
  sub:           { color:'#6B7280', fontSize:15 },
  filters:       { display:'flex', gap:8 },
  filterBtn:     { padding:'7px 16px', borderRadius:6, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', color:'#374151', fontFamily:'inherit' },
  filterBtnActive:{ background:'#2D3A2E', color:'#fff', borderColor:'#2D3A2E' },
  state:         { color:'#6B7280', textAlign:'center', marginTop:60, fontSize:15 },
  tableWrap:     { background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', overflow:'hidden' },
  table:         { width:'100%', borderCollapse:'collapse' },
  th:            { padding:'12px 20px', textAlign:'left', fontSize:12, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'#6B7280', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' },
  td:            { padding:'14px 20px', fontSize:14, color:'#111827', borderBottom:'1px solid #F3F4F6' },
  rowEven:       { background:'#fff' },
  rowOdd:        { background:'#FAFAFA' },
  badge:         { display:'inline-block', padding:'3px 10px', borderRadius:100, fontSize:12, fontWeight:500, color:'#374151' },
};
