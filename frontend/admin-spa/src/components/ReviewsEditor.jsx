import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../lib/api';

const EMPTY_REVIEW = { reviewId: '', reviewerName: '', reviewText: '', rating: 5, stayDate: '', sourceLabel: 'Guest review', featured: false, published: true };

export default function ReviewsEditor({ propertyId, propertyName }) {
  const [reviews, setReviews] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadReviews(); }, [propertyId]);

  async function loadReviews() {
    setLoading(true); setError('');
    try { const data = await adminApi.listReviews(propertyId); setReviews(data.reviews || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function saveReview(event) {
    event.preventDefault();
    if (!editing.reviewerName.trim() || !editing.reviewText.trim()) return;
    setSaving(true); setError('');
    try {
      const reviewId = editing.reviewId || crypto.randomUUID();
      await adminApi.upsertReview(propertyId, reviewId, { ...editing, reviewId });
      setEditing(null);
      await loadReviews();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function deleteReview(review) {
    if (!confirm(`Delete the review from ${review.reviewerName}?`)) return;
    try {
      await adminApi.deleteReview(propertyId, review.reviewId);
      setReviews(current => current.filter(item => item.reviewId !== review.reviewId));
      if (editing?.reviewId === review.reviewId) setEditing(null);
    } catch (err) { setError(err.message); }
  }

  const counts = useMemo(() => ({
    published: reviews.filter(review => review.published).length,
    featured: reviews.filter(review => review.published && review.featured).length,
  }), [reviews]);

  return <div>
    <div className="admin-editor-intro">
      <div><h2>Guest reviews</h2><p>Manage verified feedback displayed on {propertyName}'s public page.</p></div>
      <button style={s.primaryButton} onClick={() => setEditing({ ...EMPTY_REVIEW })}>+ Add review</button>
    </div>
    <div style={s.notice}><strong>Use authentic guest feedback only.</strong> These reviews are managed by Altus and remain separate from Hospitable. Drafts stay private; featured reviews appear before other published reviews.</div>
    <div style={s.summaryRow}><Summary value={reviews.length} label="Total" /><Summary value={counts.published} label="Published" /><Summary value={counts.featured} label="Featured" /></div>
    {error && <div style={s.error}>{error}</div>}
    {loading ? <div style={s.empty}>Loading reviews…</div> : reviews.length === 0 ? <EmptyState onAdd={() => setEditing({ ...EMPTY_REVIEW })} /> :
      <div style={s.reviewGrid}>{reviews.map(review => <article key={review.reviewId} style={{ ...s.reviewCard, ...(review.featured ? s.featuredCard : {}) }}>
        <div style={s.cardTop}>
          <div style={s.stars} aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}<span style={s.emptyStars}>{'★'.repeat(5 - review.rating)}</span></div>
          <div style={s.badges}>{review.featured && <span style={s.featuredBadge}>Featured</span>}<span style={review.published ? s.publishedBadge : s.draftBadge}>{review.published ? 'Published' : 'Draft'}</span></div>
        </div>
        <blockquote style={s.quote}>“{review.reviewText}”</blockquote>
        <div style={s.byline}><strong>{review.reviewerName}</strong><span>{[review.sourceLabel, formatDate(review.stayDate)].filter(Boolean).join(' · ')}</span></div>
        <div style={s.cardActions}><button style={s.secondaryButton} onClick={() => setEditing({ ...review })}>Edit</button><button style={s.deleteButton} onClick={() => deleteReview(review)}>Delete</button></div>
      </article>)}</div>}

    {editing && <div style={s.overlay} onMouseDown={event => event.target === event.currentTarget && setEditing(null)}>
      <form style={s.modal} onSubmit={saveReview}>
        <div style={s.modalHeader}>
          <div><p style={s.eyebrow}>Public testimonial</p><h2 style={s.modalTitle}>{editing.reviewId ? 'Edit review' : 'Add review'}</h2></div>
          <button type="button" aria-label="Close" style={s.closeButton} onClick={() => setEditing(null)}>×</button>
        </div>
        <div style={s.modalBody}>
          <div style={s.twoColumn}>
            <Field label="Guest name" required><input style={s.input} value={editing.reviewerName} onChange={e => setEditing({ ...editing, reviewerName: e.target.value })} placeholder="e.g. Sarah M." required /></Field>
            <Field label="Stay date" hint="Month displayed with the review"><input style={s.input} type="date" value={editing.stayDate || ''} onChange={e => setEditing({ ...editing, stayDate: e.target.value })} /></Field>
            <Field label="Rating"><select style={s.input} value={editing.rating} onChange={e => setEditing({ ...editing, rating: Number(e.target.value) })}>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>)}</select></Field>
            <Field label="Source label" hint="Do not label manually entered reviews as Airbnb"><input style={s.input} value={editing.sourceLabel || ''} onChange={e => setEditing({ ...editing, sourceLabel: e.target.value })} placeholder="Guest review" /></Field>
          </div>
          <Field label="Review text" required><textarea style={{ ...s.input, minHeight: 150, resize: 'vertical' }} value={editing.reviewText} onChange={e => setEditing({ ...editing, reviewText: e.target.value })} placeholder="Enter the guest's review exactly as approved…" required maxLength={3000} /></Field>
          <div style={s.toggleRow}>
            <Toggle label="Published" description="Visible on the public property page" checked={editing.published} onChange={published => setEditing({ ...editing, published })} />
            <Toggle label="Featured" description="Place before other published reviews" checked={editing.featured} onChange={featured => setEditing({ ...editing, featured })} />
          </div>
        </div>
        <div style={s.modalFooter}><button type="button" style={s.secondaryButton} onClick={() => setEditing(null)}>Cancel</button><button type="submit" style={s.primaryButton} disabled={saving || !editing.reviewerName.trim() || !editing.reviewText.trim()}>{saving ? 'Saving…' : 'Save review'}</button></div>
      </form>
    </div>}
  </div>;
}

function EmptyState({ onAdd }) { return <div style={s.emptyCard}><div style={s.emptyStar}>★</div><h3 style={s.emptyTitle}>No guest reviews yet</h3><p style={s.emptyCopy}>Add your first verified review when you have permission to publish it.</p><button style={s.secondaryButton} onClick={onAdd}>Add first review</button></div>; }
function Summary({ value, label }) { return <div style={s.summary}><strong>{value}</strong><span>{label}</span></div>; }
function Field({ label, hint, children, required }) { return <label style={s.field}><span style={s.label}>{label}{required ? ' *' : ''}</span>{hint && <small style={s.hint}>{hint}</small>}{children}</label>; }
function Toggle({ label, description, checked, onChange }) { return <label style={s.toggle}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span><strong>{label}</strong><small style={{ display:'block', color:'#637180', marginTop:2 }}>{description}</small></span></label>; }
function formatDate(value) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''; }

const s = {
  primaryButton:{ padding:'10px 18px', border:0, borderRadius:10, background:'#1D3557', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }, secondaryButton:{ padding:'8px 14px', border:'1px solid #DCE3E7', borderRadius:9, background:'#fff', color:'#1D3557', fontSize:13, fontWeight:600, cursor:'pointer' }, deleteButton:{ padding:'8px 12px', border:0, background:'transparent', color:'#A54132', fontSize:13, cursor:'pointer' },
  notice:{ marginBottom:20, padding:'13px 16px', border:'1px solid #D5E2DD', borderRadius:12, background:'#EDF4F1', color:'#35554B', fontSize:12, lineHeight:1.55 }, summaryRow:{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }, summary:{ minWidth:112, display:'flex', alignItems:'baseline', gap:8, padding:'11px 15px', border:'1px solid #DCE3E7', borderRadius:12, background:'#fff' },
  reviewGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:14 }, reviewCard:{ padding:20, border:'1px solid #DCE3E7', borderRadius:16, background:'#fff', boxShadow:'0 8px 28px rgba(23,38,56,.045)' }, featuredCard:{ borderColor:'#D1614D', boxShadow:'inset 0 3px 0 #D1614D, 0 8px 28px rgba(23,38,56,.06)' }, cardTop:{ display:'flex', justifyContent:'space-between', gap:12 }, stars:{ color:'#D1614D', letterSpacing:2 }, emptyStars:{ color:'#DCE3E7' }, badges:{ display:'flex', gap:6 }, featuredBadge:{ padding:'3px 8px', borderRadius:999, background:'#FBEAE6', color:'#A54132', fontSize:10, fontWeight:600 }, publishedBadge:{ padding:'3px 8px', borderRadius:999, background:'#E7F2ED', color:'#2F735D', fontSize:10, fontWeight:600 }, draftBadge:{ padding:'3px 8px', borderRadius:999, background:'#EEF1F3', color:'#637180', fontSize:10, fontWeight:600 },
  quote:{ margin:'18px 0', color:'#172638', fontFamily:'Fraunces, Georgia, serif', fontSize:18, lineHeight:1.5 }, byline:{ display:'flex', flexDirection:'column', gap:2, color:'#1D3557', fontSize:13 }, cardActions:{ display:'flex', gap:4, marginTop:18, paddingTop:14, borderTop:'1px solid #EDF1F3' }, emptyCard:{ padding:'56px 24px', border:'1px dashed #CBD5DA', borderRadius:18, background:'#fff', textAlign:'center' }, emptyStar:{ color:'#D1614D', fontSize:28 }, emptyTitle:{ margin:'10px 0 5px', color:'#1D3557', fontFamily:'Fraunces, Georgia, serif' }, emptyCopy:{ margin:'0 0 18px', color:'#637180', fontSize:13 }, empty:{ color:'#637180', padding:30, textAlign:'center' }, error:{ marginBottom:16, padding:12, borderRadius:10, background:'#FDECEA', color:'#A54132', fontSize:13 },
  overlay:{ position:'fixed', inset:0, zIndex:1100, display:'grid', placeItems:'center', padding:18, background:'rgba(10,27,47,.68)' }, modal:{ width:'100%', maxWidth:720, maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden', borderRadius:18, background:'#fff', boxShadow:'0 30px 80px rgba(0,0,0,.25)' }, modalHeader:{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'22px 26px', borderBottom:'1px solid #DCE3E7' }, eyebrow:{ margin:'0 0 3px', color:'#BD503E', fontSize:10, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase' }, modalTitle:{ margin:0, color:'#1D3557', fontFamily:'Fraunces, Georgia, serif', fontSize:27 }, closeButton:{ width:38, height:38, border:'1px solid #DCE3E7', borderRadius:'50%', background:'#fff', color:'#637180', fontSize:24, cursor:'pointer' }, modalBody:{ padding:26, overflowY:'auto' }, modalFooter:{ display:'flex', justifyContent:'flex-end', gap:10, padding:'18px 26px', borderTop:'1px solid #DCE3E7' }, twoColumn:{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(230px, 1fr))', gap:'0 16px' }, field:{ display:'block', marginBottom:18 }, label:{ display:'block', marginBottom:5, color:'#26384B', fontSize:12, fontWeight:600 }, hint:{ display:'block', margin:'-2px 0 7px', color:'#7A8793', fontSize:10, fontWeight:400 }, input:{ width:'100%', padding:'10px 12px', border:'1px solid #CBD5DA', borderRadius:9, background:'#fff', color:'#172638', fontSize:14 }, toggleRow:{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:10 }, toggle:{ display:'flex', gap:10, alignItems:'flex-start', padding:13, border:'1px solid #DCE3E7', borderRadius:11, cursor:'pointer' },
};
