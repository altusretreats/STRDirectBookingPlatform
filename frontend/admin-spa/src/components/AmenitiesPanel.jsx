/**
 * Amenities tab — lists all Hospitable-synced amenities grouped by category.
 * Each amenity has a hide-from-guests toggle. Saved to content.hiddenAmenities[].
 * Supports both legacy string arrays and new {name, category} object arrays.
 */
import { useState } from 'react';
import { adminApi } from '../lib/api';

// Normalize amenity to {name, category} regardless of format stored
function normalize(a) {
  if (typeof a === 'string') return { name: a, category: 'Other' };
  return { name: a.name || a.label || String(a), category: a.category || a.type || a.group || 'Other' };
}

export default function AmenitiesPanel({ property, onSaved }) {
  const cached    = property?.hospitable?.cached ?? {};
  const rawList   = cached.amenities ?? [];
  const amenities = rawList.map(normalize);
  const initHidden = new Set(property?.content?.hiddenAmenities ?? []);

  const [hidden,  setHidden]  = useState(initHidden);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');

  function toggleHide(name) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await adminApi.updateProperty(property.slug, {
        content: { ...property?.content, hiddenAmenities: [...hidden] },
      });
      const updated = await adminApi.getProperty(property.slug);
      onSaved?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (amenities.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}>✨</div>
        <p style={s.emptyText}>No amenities synced yet.</p>
        <p style={s.emptyHint}>Run a sync from the Sync tab to pull amenities from Hospitable.</p>
      </div>
    );
  }

  // Filter by search
  const filtered = amenities.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category, hidden ones separate
  const visibleItems = filtered.filter(a => !hidden.has(a.name));
  const hiddenItems  = filtered.filter(a =>  hidden.has(a.name));

  const grouped = groupByCategory(visibleItems);
  const hiddenGrouped = groupByCategory(hiddenItems);

  return (
    <div>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div>
          <h2 style={s.heading}>Amenities</h2>
          <p style={s.subheading}>
            {amenities.length - hidden.size} shown · {hidden.size} hidden from guests
          </p>
        </div>
        <input
          style={s.search}
          placeholder="Search amenities…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Visible — grouped by category */}
      <div style={s.card}>
        <div style={s.sectionLabel}>Shown to guests ({visibleItems.length})</div>
        {visibleItems.length === 0
          ? <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>All amenities are hidden.</p>
          : Object.entries(grouped).map(([cat, items]) => (
              <CategoryGroup
                key={cat}
                category={cat}
                items={items}
                hidden={hidden}
                onToggle={toggleHide}
              />
            ))
        }
      </div>

      {/* Hidden */}
      {hiddenItems.length > 0 && (
        <div style={{ ...s.card, borderColor: '#FCA5A5', background: '#FFF5F5' }}>
          <div style={{ ...s.sectionLabel, color: '#DC2626' }}>Hidden from guests ({hiddenItems.length})</div>
          {Object.entries(hiddenGrouped).map(([cat, items]) => (
            <CategoryGroup
              key={cat}
              category={cat}
              items={items}
              hidden={hidden}
              onToggle={toggleHide}
            />
          ))}
        </div>
      )}

      {/* Save */}
      <div style={s.actions}>
        {error && <div style={s.errorMsg}>{error}</div>}
        {saved && <div style={s.successMsg}>✓ Saved</div>}
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function groupByCategory(items) {
  return items.reduce((acc, a) => {
    const cat = a.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});
}

function CategoryGroup({ category, items, hidden, onToggle }) {
  return (
    <div style={s.catGroup}>
      <div style={s.catLabel}>{category}</div>
      <div style={s.grid}>
        {items.map(a => (
          <AmenityRow
            key={a.name}
            amenity={a.name}
            isHidden={hidden.has(a.name)}
            onToggle={() => onToggle(a.name)}
          />
        ))}
      </div>
    </div>
  );
}

function AmenityRow({ amenity, isHidden, onToggle }) {
  return (
    <div style={{ ...s.amenityRow, opacity: isHidden ? 0.6 : 1 }}>
      <span style={s.amenityName}>{amenity}</span>
      <button
        type="button"
        style={{ ...s.toggleBtn, ...(isHidden ? s.toggleBtnShow : s.toggleBtnHide) }}
        onClick={onToggle}
      >
        {isHidden ? 'Show' : 'Hide'}
      </button>
    </div>
  );
}

const s = {
  empty:        { textAlign: 'center', padding: '80px 40px', color: '#9CA3AF' },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyText:    { fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 6px' },
  emptyHint:    { fontSize: 13, margin: 0 },
  toolbar:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 },
  heading:      { fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, marginBottom: 4 },
  subheading:   { fontSize: 13, color: '#6B7280', margin: 0 },
  search:       { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111827', outline: 'none', width: 220 },
  card:         { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 },
  catGroup:     { marginBottom: 18 },
  catLabel:     { fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #F3F4F6' },
  grid:         { display: 'flex', flexDirection: 'column', gap: 2 },
  amenityRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 6, background: '#F9FAFB' },
  amenityName:  { fontSize: 14, color: '#374151' },
  toggleBtn:    { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  toggleBtnHide:{ background: '#FEE2E2', color: '#DC2626' },
  toggleBtnShow:{ background: '#DCFCE7', color: '#16A34A' },
  actions:      { display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' },
  saveBtn:      { background: '#1C2E26', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  successMsg:   { fontSize: 13, color: '#16A34A', fontWeight: 500 },
  errorMsg:     { fontSize: 13, color: '#DC2626', flex: 1 },
};
