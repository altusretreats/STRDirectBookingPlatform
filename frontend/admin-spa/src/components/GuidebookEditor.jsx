import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SECTION_TEMPLATES = [
  { icon: '🔑', title: 'Check-In' },
  { icon: '🌐', title: 'WiFi & Tech' },
  { icon: '📋', title: 'House Rules' },
  { icon: '🍽️', title: 'Kitchen & Appliances' },
  { icon: '♨️', title: 'Hot Tub' },
  { icon: '🗺️', title: 'Local Recommendations' },
  { icon: '🚨', title: 'Emergency Contacts' },
  { icon: '🚗', title: 'Parking & Directions' },
  { icon: '🧺', title: 'Trash & Recycling' },
  { icon: '💡', title: 'Tips & Tricks' },
];

export default function GuidebookEditor({ propertyId, propertyName }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // section being edited
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { loadSections(); }, [propertyId]);

  async function loadSections() {
    setLoading(true);
    try {
      const data = await adminApi.listSections(propertyId);
      setSections(data.sections || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex(s => s.sectionId === active.id);
    const newIdx = sections.findIndex(s => s.sectionId === over.id);
    const reordered = arrayMove(sections, oldIdx, newIdx).map((s, i) => ({ ...s, order: (i + 1) * 10 }));
    setSections(reordered);
    // Persist new order
    await Promise.all(reordered.map(s =>
      adminApi.upsertSection(propertyId, s.sectionId, s)
    ));
  }

  async function saveSection(sectionData) {
    setSaving(true); setError('');
    try {
      const id = sectionData.sectionId || sectionData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const order = sectionData.order || (sections.length + 1) * 10;
      await adminApi.upsertSection(propertyId, id, { ...sectionData, sectionId: id, order });
      setEditing(null);
      await loadSections();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deleteSection(sectionId) {
    if (!confirm('Delete this section?')) return;
    try {
      await adminApi.deleteSection(propertyId, sectionId);
      setSections(prev => prev.filter(s => s.sectionId !== sectionId));
    } catch (e) { setError(e.message); }
  }

  function addFromTemplate(tmpl) {
    setEditing({ title: tmpl.title, icon: tmpl.icon, items: [], published: false });
  }

  if (loading) return <div style={{ color:'#6B7280', padding:40 }}>Loading guidebook…</div>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Guidebook</h1>
          <p style={s.sub}>{propertyName} — drag to reorder sections</p>
        </div>
        <button style={s.btnPrimary} onClick={() => setEditing({ title: '', icon: '📄', items: [], published: false })}>
          + Add Section
        </button>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* Template suggestions (only if no sections yet) */}
      {sections.length === 0 && (
        <div style={s.templates}>
          <p style={s.templatesLabel}>Quick-start with a template:</p>
          <div style={s.templateGrid}>
            {SECTION_TEMPLATES.map(t => (
              <button key={t.title} style={s.templateBtn} onClick={() => addFromTemplate(t)}>
                <span style={{ fontSize:20 }}>{t.icon}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.sectionId)} strategy={verticalListSortingStrategy}>
          {sections.map(section => (
            <SortableSection key={section.sectionId} section={section}
              onEdit={() => setEditing(section)}
              onDelete={() => deleteSection(section.sectionId)} />
          ))}
        </SortableContext>
      </DndContext>

      {sections.length > 0 && (
        <button style={s.addMoreBtn} onClick={() => setEditing({ title: '', icon: '📄', items: [], published: false })}>
          + Add another section
        </button>
      )}

      {/* Edit modal */}
      {editing && (
        <SectionModal section={editing} saving={saving}
          onSave={saveSection} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function SortableSection({ section, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.sectionId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={{ ...s.sectionRow, ...style }}>
      <div style={s.dragHandle} {...attributes} {...listeners} title="Drag to reorder">⠿</div>
      <span style={s.sectionIcon}>{section.icon}</span>
      <div style={s.sectionInfo}>
        <div style={s.sectionTitle}>{section.title}</div>
        <div style={s.sectionMeta}>{section.items?.length || 0} items · {section.published ? '✓ Published' : '○ Draft'}</div>
      </div>
      <div style={s.sectionActions}>
        <button style={s.btnSecondary} onClick={onEdit}>Edit</button>
        <button style={s.btnDanger} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

function SectionModal({ section, saving, onSave, onClose }) {
  const [data, setData] = useState({ ...section });
  const [newItem, setNewItem] = useState({ type: 'text', label: '', content: '' });

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const setItem = (k, v) => setNewItem(i => ({ ...i, [k]: v }));

  function addItem() {
    if (!newItem.label) return;
    const item = { ...newItem, itemId: `item-${Date.now()}`, order: (data.items?.length || 0 + 1) * 10 };
    set('items', [...(data.items || []), item]);
    setNewItem({ type: 'text', label: '', content: '' });
  }

  function removeItem(itemId) {
    set('items', data.items.filter(i => i.itemId !== itemId));
  }

  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h2 style={{ fontSize:20, fontWeight:700 }}>{section.sectionId ? 'Edit Section' : 'New Section'}</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Icon (emoji)</label>
              <input style={s.input} value={data.icon} onChange={e => set('icon', e.target.value)} maxLength={4} />
            </div>
            <div style={{ ...s.formGroup, flex:3 }}>
              <label style={s.label}>Section title *</label>
              <input style={s.input} value={data.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Check-In Instructions" />
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Published</label>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={data.published} onChange={e => set('published', e.target.checked)} style={{ width:16, height:16 }} />
              <span style={{ fontSize:14, color:'#374151' }}>Visible to guests</span>
            </label>
          </div>

          {/* Items */}
          <div style={{ marginTop:24 }}>
            <label style={s.label}>Content items</label>
            {(data.items || []).map(item => (
              <div key={item.itemId} style={s.itemRow}>
                <span style={{ fontSize:12, background:'#E5E7EB', padding:'2px 8px', borderRadius:4, color:'#374151' }}>{item.type}</span>
                <span style={{ flex:1, fontSize:14 }}><strong>{item.label}</strong>{item.content ? ` — ${item.content.slice(0,60)}…` : ''}</span>
                <button style={s.btnDangerSm} onClick={() => removeItem(item.itemId)}>✕</button>
              </div>
            ))}

            <div style={s.addItemBox}>
              <p style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:10 }}>Add item</p>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.labelSm}>Type</label>
                  <select style={s.input} value={newItem.type} onChange={e => setItem('type', e.target.value)}>
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="map">Map link</option>
                    <option value="link">Link</option>
                  </select>
                </div>
                <div style={{ ...s.formGroup, flex:2 }}>
                  <label style={s.labelSm}>Label</label>
                  <input style={s.input} value={newItem.label} onChange={e => setItem('label', e.target.value)} placeholder="e.g. Door code" />
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.labelSm}>Content / URL</label>
                <textarea style={{ ...s.input, height:80, resize:'vertical' }}
                  value={newItem.content} onChange={e => setItem('content', e.target.value)}
                  placeholder={newItem.type === 'text' ? 'Enter instructions…' : 'Enter URL…'} />
              </div>
              <button style={s.btnSecondary} onClick={addItem}>Add item</button>
            </div>
          </div>
        </div>

        <div style={s.modalFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={() => onSave(data)} disabled={saving}>
            {saving ? 'Saving…' : 'Save Section'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  header:       { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32 },
  title:        { fontSize:28, fontWeight:700, color:'#111827', marginBottom:4 },
  sub:          { color:'#6B7280', fontSize:15 },
  errorBanner:  { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', padding:'12px 16px', borderRadius:8, marginBottom:20, fontSize:14 },
  sectionRow:   { display:'flex', alignItems:'center', gap:16, background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'16px 20px', marginBottom:10 },
  dragHandle:   { color:'#9CA3AF', fontSize:18, cursor:'grab', userSelect:'none', lineHeight:1 },
  sectionIcon:  { fontSize:22, flexShrink:0 },
  sectionInfo:  { flex:1, minWidth:0 },
  sectionTitle: { fontWeight:600, color:'#111827', fontSize:15 },
  sectionMeta:  { fontSize:13, color:'#6B7280', marginTop:2 },
  sectionActions:{ display:'flex', gap:8, flexShrink:0 },
  templates:    { background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:12, padding:24, marginBottom:32 },
  templatesLabel:{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:14 },
  templateGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10 },
  templateBtn:  { display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', border:'1px solid #E5E7EB', borderRadius:8, background:'#fff', cursor:'pointer', fontFamily:'inherit' },
  addMoreBtn:   { marginTop:16, color:'#2D3A2E', background:'none', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnPrimary:   { padding:'10px 20px', background:'#2D3A2E', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnSecondary: { padding:'8px 16px', background:'#F3F4F6', color:'#374151', border:'1px solid #E5E7EB', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnDanger:    { padding:'8px 14px', background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnDangerSm:  { background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', fontSize:16, padding:'0 4px' },
  modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 },
  modal:        { background:'#fff', borderRadius:16, width:'100%', maxWidth:640, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' },
  modalHeader:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'24px 28px', borderBottom:'1px solid #E5E7EB' },
  modalBody:    { padding:'24px 28px', overflowY:'auto', flex:1 },
  modalFooter:  { display:'flex', justifyContent:'flex-end', gap:12, padding:'20px 28px', borderTop:'1px solid #E5E7EB' },
  closeBtn:     { background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#6B7280', padding:'4px 8px' },
  formRow:      { display:'flex', gap:12, marginBottom:0 },
  formGroup:    { flex:1, marginBottom:16 },
  label:        { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  labelSm:      { display:'block', fontSize:12, fontWeight:600, color:'#6B7280', marginBottom:4 },
  input:        { width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:7, fontSize:14, fontFamily:'inherit', color:'#111827', background:'#fff', outline:'none' },
  itemRow:      { display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#F9FAFB', borderRadius:7, marginBottom:6, fontSize:13 },
  addItemBox:   { border:'1px dashed #D1D5DB', borderRadius:8, padding:16, marginTop:12 },
};
