import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../lib/api';
import { MATERIAL_SYMBOL_NAMES, materialSymbolLabel, isValidMaterialSymbol } from '../data/materialSymbolsCatalog';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import barMarkerIcon from '../../../property-site/img/map-icons/bar.svg';
import bridgeMarkerIcon from '../../../property-site/img/map-icons/bridge.svg';
import cameraMarkerIcon from '../../../property-site/img/map-icons/camera.svg';
import climbingMarkerIcon from '../../../property-site/img/map-icons/climbing.svg';
import coffeeMarkerIcon from '../../../property-site/img/map-icons/coffee.svg';
import gasMarkerIcon from '../../../property-site/img/map-icons/gas.svg';
import golfMarkerIcon from '../../../property-site/img/map-icons/golf.svg';
import gondolaMarkerIcon from '../../../property-site/img/map-icons/gondola.svg';
import groceriesMarkerIcon from '../../../property-site/img/map-icons/groceries.svg';
import hikingMarkerIcon from '../../../property-site/img/map-icons/hiking.svg';
import kayakMarkerIcon from '../../../property-site/img/map-icons/kayak.svg';
import locationMarkerIcon from '../../../property-site/img/map-icons/location.svg';
import familyMarkerIcon from '../../../property-site/img/map-icons/family.svg';
import nightlifeMarkerIcon from '../../../property-site/img/map-icons/nightlife.svg';
import offroadMarkerIcon from '../../../property-site/img/map-icons/offroad.svg';
import restaurantMarkerIcon from '../../../property-site/img/map-icons/restaurant.svg';
import shoppingMarkerIcon from '../../../property-site/img/map-icons/shopping.svg';
import trailMarkerIcon from '../../../property-site/img/map-icons/trail.svg';
import ziplineMarkerIcon from '../../../property-site/img/map-icons/zipline.svg';

const ICON_OPTIONS = [
  '🔑','🚪','🛎️','🏠','🏡',
  '📶','📡','💻','📱','📺',
  '📋','📝','📌','📍','🗓️',
  '🍽️','🍳','☕','🧁','🍕',
  '♨️','🛁','🚿','🪥','🧼',
  '🗺️','🧭','🚗','🚶','🚴',
  '🚨','🆘','📞','🏥','🔒',
  '🧺','🗑️','♻️','🧹','🪣',
  '💡','⚡','🔧','🪟','🪑',
  '🌿','🌲','🏔️','🌊','⛺',
  '🎸','🎮','🎯','🎱','🏋️',
  '🐾','🐕','🐈','🦮','🌸',
  '👋','❤️','⭐','✨','🎉',
];

const SECTION_TEMPLATES = [
  { icon: 'material-symbols:waving_hand', title: 'Welcome', sectionType: 'welcome' },
  { icon: 'material-symbols:key', title: 'Check-In' },
  { icon: 'material-symbols:wifi', title: 'WiFi & Tech' },
  { icon: 'material-symbols:rule', title: 'House Rules' },
  { icon: 'material-symbols:kitchen', title: 'Kitchen & Appliances' },
  { icon: 'material-symbols:hot_tub', title: 'Hot Tub' },
  { icon: 'material-symbols:map', title: 'Local Recommendations', sectionType: 'recommendations' },
  { icon: 'material-symbols:emergency', title: 'Emergency Contacts' },
  { icon: 'material-symbols:local_parking', title: 'Parking & Directions' },
  { icon: 'material-symbols:recycling', title: 'Trash & Recycling' },
  { icon: 'material-symbols:lightbulb', title: 'Tips & Tricks' },
];

// ── Material Symbols icon format ────────────────────────────────────────────
// section.icon stores either a legacy emoji string (unchanged, still fully
// supported) or "material-symbols:<name>" where <name> is a lowercase symbol
// name validated against the self-hosted catalog. No new DB field is used.
const MATERIAL_SYMBOL_RE = /^material-symbols:([a-z0-9_]+)$/;

function parseSectionIcon(value) {
  if (typeof value !== 'string') return null;
  const m = value.match(MATERIAL_SYMBOL_RE);
  return m && isValidMaterialSymbol(m[1]) ? m[1] : null;
}

function normalizeSearchText(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const RECOMMENDED_ICON_GROUPS = [
  { label: 'Arrival & access', icons: ['key', 'door_open', 'login', 'logout'] },
  { label: 'House & rooms', icons: ['home', 'bedroom_parent', 'bed', 'bathroom', 'crib', 'deck'] },
  { label: 'Kitchen & dining', icons: ['kitchen', 'oven', 'microwave', 'coffee_maker', 'local_cafe', 'restaurant', 'outdoor_grill'] },
  { label: 'Amenities & comfort', icons: ['wifi', 'router', 'hot_tub', 'sauna', 'fireplace', 'thermostat', 'ac_unit', 'local_laundry_service', 'pool', 'pets', 'child_friendly'] },
  { label: 'Safety & rules', icons: ['warning', 'emergency', 'medical_services', 'shield', 'rule', 'checklist'] },
  { label: 'Outdoors & recreation', icons: ['local_parking', 'directions_car', 'map', 'hiking', 'attractions'] },
  { label: 'Checkout & cleaning', icons: ['recycling', 'delete', 'cleaning_services', 'shopping_bag', 'luggage'] },
];

// Extra search keywords that don't literally appear in a symbol's own name/label.
const ICON_SEARCH_SYNONYMS = {
  wifi: ['wi fi', 'internet', 'network'],
  router: ['wifi', 'internet'],
  hot_tub: ['jacuzzi', 'spa'],
  sauna: ['spa', 'steam room'],
  coffee_maker: ['coffee', 'espresso', 'coffee pot'],
  local_cafe: ['coffee', 'cafe', 'espresso'],
  checklist: ['checkout', 'check out'],
  rule: ['checkout', 'house rules'],
  logout: ['checkout', 'check out', 'departure'],
  luggage: ['checkout', 'departure', 'bags', 'suitcase'],
  cleaning_services: ['checkout', 'housekeeping', 'cleaning'],
  key: ['check in', 'checkin', 'entry'],
  login: ['check in', 'checkin', 'arrival'],
  door_open: ['entry', 'check in'],
  ac_unit: ['air conditioning', 'ac', 'cooling'],
  thermostat: ['temperature', 'heat', 'heating'],
  local_laundry_service: ['laundry', 'washer', 'dryer'],
  local_parking: ['parking', 'car'],
  directions_car: ['parking', 'driving'],
  medical_services: ['first aid', 'emergency'],
  emergency: ['911', 'urgent', 'sos'],
  shield: ['safety', 'security'],
  pets: ['dog', 'cat', 'pet friendly'],
  child_friendly: ['kids', 'baby', 'family'],
  crib: ['baby', 'infant', 'nursery'],
  shopping_bag: ['shop', 'shopping'],
  attractions: ['things to do', 'activities'],
  hiking: ['trail', 'hike'],
};

const ICON_SEARCH_RESULT_LIMIT = 60;

function searchMaterialIcons(query) {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const terms = q.split(' ').filter(Boolean);
  // "Wi-Fi" normalizes to "wi fi" (two terms), but the symbol is named "wifi"
  // (one word) — compare space-collapsed forms too so exact matches like that
  // still rank first instead of losing to compound names that merely contain
  // "wi" and "fi" as substrings (e.g. the many android_wifi_* icons).
  const qCompact = q.replace(/ /g, '');
  const scored = [];
  for (const name of MATERIAL_SYMBOL_NAMES) {
    const nameNorm = normalizeSearchText(name);
    const labelNorm = normalizeSearchText(materialSymbolLabel(name));
    const synonyms = (ICON_SEARCH_SYNONYMS[name] || []).map(normalizeSearchText);
    const haystack = [nameNorm, labelNorm, ...synonyms].join(' ');
    if (!terms.every(t => haystack.includes(t))) continue;
    const nameCompact = nameNorm.replace(/ /g, '');
    const isExact = nameNorm === q || nameCompact === qCompact;
    const isPrefix = nameNorm.startsWith(q) || labelNorm.startsWith(q) || nameCompact.startsWith(qCompact);
    const score = isExact ? 0 : isPrefix ? 1 : 2;
    scored.push({ name, score });
  }
  scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  return scored.map(r => r.name);
}

// Best-effort suggestion only — a legacy emoji is never rewritten automatically.
const EMOJI_TO_MATERIAL = {
  '🔑': 'key', '🚪': 'door_open', '🛎️': 'login', '🏠': 'home', '🏡': 'home',
  '📶': 'wifi', '📡': 'router', '💻': 'devices', '📱': 'tablet', '📺': 'tv',
  '📋': 'rule', '📝': 'edit_note', '📌': 'pin', '📍': 'location_on', '🗓️': 'calendar_month',
  '🍽️': 'restaurant', '🍳': 'skillet', '☕': 'local_cafe', '🧁': 'cake', '🍕': 'local_pizza',
  '♨️': 'hot_tub', '🛁': 'bathtub', '🚿': 'shower', '🪥': 'bathroom', '🧼': 'soap',
  '🗺️': 'map', '🧭': 'explore', '🚗': 'directions_car', '🚶': 'directions_walk', '🚴': 'directions_bike',
  '🚨': 'emergency', '🆘': 'sos', '📞': 'call', '🏥': 'medical_services', '🔒': 'lock',
  '🧺': 'local_laundry_service', '🗑️': 'delete', '♻️': 'recycling', '🧹': 'cleaning_services', '🪣': 'cleaning_services',
  '💡': 'lightbulb', '⚡': 'bolt', '🔧': 'build', '🪟': 'window', '🪑': 'chair',
  '🌿': 'eco', '🌲': 'park', '🏔️': 'landscape', '🌊': 'waves', '⛺': 'cabin',
  '🎸': 'music_note', '🎮': 'sports_esports', '🎯': 'sports_score', '🎱': 'sports_bar', '🏋️': 'fitness_center',
  '🐾': 'pets', '🐕': 'pets', '🐈': 'pets', '🦮': 'pets', '🌸': 'local_florist',
  '👋': 'waving_hand', '❤️': 'favorite', '⭐': 'star', '✨': 'auto_awesome_motion', '🎉': 'celebration',
};

const CATEGORY_LABELS = {
  restaurant: '🍽️ Restaurant',
  attraction: '🏞️ Attraction',
  activity:   '🧗 Activity',
  shop:       '🛒 Shop',
  services:   '⛽ Services',
};

const CATEGORY_COLORS = {
  restaurant: '#E8F4ED',
  attraction: '#EFF6FF',
  activity:   '#FFF7ED',
  shop:       '#FDF4FF',
  services:   '#F9FAFB',
};

const AUDIENCE_OPTIONS = [
  { value: 'hikers', label: 'Hikers', guestLabel: 'For you hikers', asset: hikingMarkerIcon },
  { value: 'climbers', label: 'Climbers', guestLabel: 'For you climbers', asset: climbingMarkerIcon },
  { value: 'offroaders', label: 'Off-roaders', guestLabel: 'For you off-roaders', asset: offroadMarkerIcon },
  { value: 'golfers', label: 'Golfers', guestLabel: 'For golfers', asset: golfMarkerIcon },
  { value: 'families', label: 'Families', guestLabel: 'For families', asset: familyMarkerIcon },
  { value: 'nightlife', label: 'Nightlife', guestLabel: 'For nightlife', asset: nightlifeMarkerIcon },
];

const MAP_ICON_OPTIONS = [
  { value: '', label: 'Automatic' },
  { value: 'restaurant', label: 'Restaurant', asset: restaurantMarkerIcon },
  { value: 'coffee', label: 'Coffee / café', asset: coffeeMarkerIcon },
  { value: 'bar', label: 'Bar / brewery', asset: barMarkerIcon },
  { value: 'arch', label: 'Sandstone arch' },
  { value: 'climber', label: 'Rock climbing', asset: climbingMarkerIcon },
  { value: 'carabiner', label: 'Carabiner' },
  { value: 'hiking', label: 'Hiking', asset: hikingMarkerIcon },
  { value: 'trail', label: 'Trailhead', asset: trailMarkerIcon },
  { value: 'bridge', label: 'Bridge', asset: bridgeMarkerIcon },
  { value: 'paddle', label: 'Kayaking', asset: kayakMarkerIcon },
  { value: 'offroad', label: 'Off-road / 4×4', asset: offroadMarkerIcon },
  { value: 'gondola', label: 'Gondola / sky lift', asset: gondolaMarkerIcon },
  { value: 'zipline', label: 'Zipline', asset: ziplineMarkerIcon },
  { value: 'shopping', label: 'Shopping', asset: shoppingMarkerIcon },
  { value: 'groceries', label: 'Groceries', asset: groceriesMarkerIcon },
  { value: 'services', label: 'Gas / fuel', asset: gasMarkerIcon },
  { value: 'camera', label: 'Scenic / photo', asset: cameraMarkerIcon },
  { value: 'pin', label: 'General location', asset: locationMarkerIcon },
];

export default function GuidebookEditor({ propertyId, propertyName, property, onPropertySaved }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfSaved, setPdfSaved] = useState('');
  const heroInputRef = useRef(null);

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
    const oldIdx   = sections.findIndex(s => s.sectionId === active.id);
    const newIdx   = sections.findIndex(s => s.sectionId === over.id);
    const reordered = arrayMove(sections, oldIdx, newIdx).map((s, i) => ({ ...s, order: (i + 1) * 10 }));
    setSections(reordered);
    await Promise.all(reordered.map(s => adminApi.upsertSection(propertyId, s.sectionId, s)));
  }

  async function saveSection(sectionData) {
    setSaving(true); setError('');
    try {
      const id    = sectionData.sectionId || sectionData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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
    setEditing({ title: tmpl.title, icon: tmpl.icon, sectionType: tmpl.sectionType || 'general', audiences: [], important: false, items: [], published: false, aiPublished: false });
  }

  async function updateGuidebookHero(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setHeroUploading(true); setError(''); setHeroSaved(false);
    try {
      const { uploadUrl, fileUrl } = await adminApi.signUpload(propertyId, file.name, file.type);
      await adminApi.uploadFile(uploadUrl, file);
      await adminApi.updateProperty(propertyId, {
        content: { ...(property?.content ?? {}), guidebookHeroPhoto: fileUrl },
      });
      const updated = await adminApi.getProperty(propertyId);
      onPropertySaved?.(updated);
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setHeroUploading(false);
      event.target.value = '';
    }
  }

  async function downloadKnowledgePdf() {
    setPdfGenerating(true); setError(''); setPdfSaved('');
    try {
      const { downloadGuidebookKnowledgePdf } = await import('../lib/guidebookPdf.mjs');
      const filename = downloadGuidebookKnowledgePdf({ propertyId, propertyName, sections });
      setPdfSaved(filename);
      setTimeout(() => setPdfSaved(''), 5000);
    } catch (e) {
      setError(e.message);
    } finally {
      setPdfGenerating(false);
    }
  }

  if (loading) return <div style={{ color: '#6B7280', padding: 40 }}>Loading guidebook…</div>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Guidebook</h1>
          <p style={s.sub}>{propertyName} — drag to reorder sections</p>
        </div>
        <div style={s.headerActions}>
          <button style={s.btnSecondary} onClick={downloadKnowledgePdf} disabled={pdfGenerating || sections.length === 0}>
            {pdfGenerating ? 'Generating PDF…' : 'Download AI knowledge PDF'}
          </button>
          <button style={s.btnPrimary} onClick={() => setEditing({ title: '', icon: '📄', sectionType: 'general', audiences: [], important: false, items: [], published: false, aiPublished: false })}>
            + Add Section
          </button>
        </div>
      </div>

      <div className="guidebook-pdf-notice">
        <div>
          <p style={s.eyebrow}>Hospitable Knowledge Hub</p>
          <strong>Searchable AI knowledge PDF</strong>
          <span>Includes saved sections marked “Available to AI agents,” guest content, place details, and AI context. Private host notes are always excluded.</span>
        </div>
        {pdfSaved && <span className="guidebook-pdf-saved">✓ Downloaded {pdfSaved}</span>}
      </div>

      <div className="guidebook-hero-settings">
        <div
          className="guidebook-hero-preview"
          role="img"
          aria-label="Current guidebook hero"
          style={{ backgroundImage: `linear-gradient(rgba(17,38,61,.18), rgba(17,38,61,.45)), url("${property?.content?.guidebookHeroPhoto || property?.content?.heroSliderPhotos?.[0] || property?.content?.heroPhoto || property?.hospitable?.cached?.photos?.[0]?.url || ''}")` }}
        />
        <div>
          <p style={s.eyebrow}>Guidebook welcome</p>
          <h2 style={s.heroSettingsTitle}>Hero image</h2>
          <p style={s.heroSettingsCopy}>Upload a dedicated image for the stay guide. If you leave this unset, the guide continues to use the property hero or first Hospitable photo.</p>
          <input ref={heroInputRef} type="file" accept="image/*" onChange={updateGuidebookHero} style={{ display: 'none' }} />
          <button style={s.btnPrimary} onClick={() => heroInputRef.current?.click()} disabled={heroUploading}>{heroUploading ? 'Uploading…' : 'Choose guidebook image'}</button>
          {heroSaved && <span style={s.savedInline}>✓ Image saved</span>}
        </div>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {sections.length === 0 && (
        <div style={s.templates}>
          <p style={s.templatesLabel}>Quick-start with a template:</p>
          <div style={s.templateGrid}>
            {SECTION_TEMPLATES.map(t => (
              <button key={t.title} style={s.templateBtn} onClick={() => addFromTemplate(t)}>
                <IconGlyph value={t.icon} size={20} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
        <button style={s.addMoreBtn} onClick={() => setEditing({ title: '', icon: '📄', sectionType: 'general', audiences: [], important: false, items: [], published: false, aiPublished: false })}>
          + Add another section
        </button>
      )}

      {editing && (
        <SectionModal
          section={editing}
          saving={saving}
          propertyId={propertyId}
          onSave={saveSection}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SortableSection({ section, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.sectionId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const placeCount = (section.items || []).filter(i => i.type === 'place').length;
  const isRec = section.sectionType === 'recommendations' || placeCount > 0;

  return (
    <div ref={setNodeRef} style={{ ...s.sectionRow, ...style }}>
      <div style={s.dragHandle} {...attributes} {...listeners} title="Drag to reorder">⠿</div>
      <span style={s.sectionIcon}><IconGlyph value={section.icon} size={22} /></span>
      <div style={s.sectionInfo}>
        <div style={s.sectionTitle}>
          {section.title}
          {section.important && <span style={s.importantBadge}>⚠ Important</span>}
          {isRec && <span style={s.recsBadge}>📍 Local Recs</span>}
        </div>
        <div style={s.sectionMeta}>
          {section.items?.length || 0} items · {section.published ? '✓ Published' : '○ Draft'}
          {(section.aiPublished ?? section.published) && ' · 🤖 Available to AI'}
          {section.aiContext && ' · AI context added'}
        </div>
        {section.audiences?.length > 0 && <AudienceBadges values={section.audiences} />}
      </div>
      <div style={s.sectionActions}>
        <button style={s.btnSecondary} onClick={onEdit}>Edit</button>
        <button style={s.btnDanger} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

// ── Section modal ─────────────────────────────────────────────────────────────
const DEFAULT_NEW_ITEM = { type: 'text', label: '', content: '', aiContext: '', hostNotes: '' };

const GENERIC_ITEM_TYPES = [
  { value: 'text', label: 'Text', icon: 'notes' },
  { value: 'guide', label: 'Guide', icon: 'menu_book' },
  { value: 'image', label: 'Image', icon: 'image' },
  { value: 'video', label: 'Video', icon: 'movie' },
  { value: 'map', label: 'Map Link', icon: 'map' },
  { value: 'link', label: 'Web Link', icon: 'link' },
];

function SectionModal({ section, saving, propertyId, onSave, onClose }) {
  const [data, setData] = useState({ ...section });
  const [view, setView] = useState('section'); // 'section' | 'add-item' | 'edit-item'
  const [newItem, setNewItem] = useState(DEFAULT_NEW_ITEM);
  const [addItemError, setAddItemError] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editItemError, setEditItemError] = useState('');
  const [showAiFields, setShowAiFields] = useState(false);
  const [itemNotice, setItemNotice] = useState('');
  const [lastTouchedItemId, setLastTouchedItemId] = useState(null);
  const addItemBtnRef = useRef(null);
  const addItemHeadingRef = useRef(null);
  const editItemHeadingRef = useRef(null);

  const isRecs = data.sectionType === 'recommendations';
  const isWelcome = data.sectionType === 'welcome';

  const set   = (k, v) => setData(d => ({ ...d, [k]: v }));
  const setNI = (k, v) => setNewItem(i => ({ ...i, [k]: v }));
  const setEd = (k, v) => setEditDraft(d => ({ ...d, [k]: v }));
  const setEdPlace = (k, v) => setEditDraft(d => ({ ...d, place: { ...d.place, [k]: v } }));

  const prevViewRef = useRef(view);

  useEffect(() => {
    if (view === 'add-item') addItemHeadingRef.current?.focus();
    if (view === 'edit-item') editItemHeadingRef.current?.focus();
    // Returning from a subview: restore focus to whatever opened it.
    // (Not requestAnimationFrame — it isn't reliably scheduled in every host
    // environment this admin renders in, whereas a plain effect after commit is.)
    if (view === 'section') {
      if (prevViewRef.current === 'add-item') addItemBtnRef.current?.focus();
      else if (prevViewRef.current === 'edit-item' && lastTouchedItemId) {
        document.querySelector(`#guidebook-item-${lastTouchedItemId} [data-edit-trigger]`)?.focus();
      }
    }
    prevViewRef.current = view;
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (view !== 'section' || !lastTouchedItemId) return;
    document.getElementById(`guidebook-item-${lastTouchedItemId}`)?.scrollIntoView({ block: 'nearest' });
  }, [view, lastTouchedItemId]);

  function openAddItem() {
    setAddItemError('');
    setView('add-item');
  }

  function closeAddItem() {
    setNewItem(DEFAULT_NEW_ITEM);
    setAddItemError('');
    setView('section');
  }

  function finishAdd(itemId, name) {
    setNewItem(DEFAULT_NEW_ITEM);
    setAddItemError('');
    setView('section');
    setLastTouchedItemId(itemId);
    setItemNotice(`${name} was added to this draft. Save the section to keep this change.`);
  }

  function openEditItem(item) {
    setEditingItemId(item.itemId);
    setEditDraft({ ...item, place: item.place ? { ...item.place } : undefined });
    setEditItemError('');
    setLastTouchedItemId(item.itemId);
    setView('edit-item');
  }

  function closeEditItem() {
    setEditingItemId(null);
    setEditDraft(null);
    setEditItemError('');
    setView('section');
  }

  function saveEditItem() {
    if (!editDraft) return;
    if (editDraft.type === 'place') {
      updateItem(editingItemId, editDraft);
      finishEdit(editDraft.place?.name || editDraft.label || 'Place');
      return;
    }
    const content = (editDraft.content || '').trim();
    const label = (editDraft.label || '').trim();
    if (!content) { setEditItemError('Add the content or URL before saving this item.'); return; }
    if (!label) { setEditItemError('Add a label for this item.'); return; }
    updateItem(editingItemId, { ...editDraft, label, content });
    finishEdit(label);
  }

  function finishEdit(name) {
    setEditingItemId(null);
    setEditDraft(null);
    setEditItemError('');
    setView('section');
    setItemNotice(`${name} was updated in this draft. Save the section to keep this change.`);
  }

  function handleModalKeyDown(e) {
    if (e.key !== 'Escape') return;
    if (view === 'add-item') { e.preventDefault(); closeAddItem(); }
    else if (view === 'edit-item') { e.preventDefault(); closeEditItem(); }
  }

  function addGenericItem() {
    const content = newItem.content.trim();
    const label = newItem.label.trim() || (newItem.type === 'map' ? 'View on Google Maps' : newItem.type === 'link' ? 'Open link' : '');
    if (!content) { setAddItemError('Add the content or URL before adding this item.'); return; }
    if (!label) { setAddItemError('Add a label for this item.'); return; }
    const item = { ...newItem, label, content, itemId: `item-${Date.now()}`, order: ((data.items?.length || 0) + 1) * 10 };
    setData(current => ({ ...current, items: [...(current.items || []), item] }));
    finishAdd(item.itemId, label);
  }

  function addPlaceItem(placeItem) {
    const item = { ...placeItem, itemId: `item-${Date.now()}`, type: 'place', order: ((data.items?.length || 0) + 1) * 10 };
    setData(current => ({ ...current, items: [...(current.items || []), item] }));
    finishAdd(item.itemId, placeItem.place?.name || placeItem.label || 'Place');
  }

  function removeItem(itemId) {
    set('items', data.items.filter(i => i.itemId !== itemId));
  }

  function updateItem(itemId, updates) {
    set('items', data.items.map(i => i.itemId === itemId ? { ...i, ...updates } : i));
  }

  function updateWelcomeMessage(content) {
    const items = [...(data.items || [])];
    const textIndex = items.findIndex(item => item.type === 'text');
    if (textIndex >= 0) {
      items[textIndex] = { ...items[textIndex], label: items[textIndex].label || 'Welcome message', content };
    } else {
      items.unshift({
        itemId: `item-${Date.now()}`,
        type: 'text',
        label: 'Welcome message',
        content,
        aiContext: '',
        hostNotes: '',
        order: 10,
      });
    }
    set('items', items);
  }

  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && view === 'section' && onClose()} onKeyDown={handleModalKeyDown}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{section.sectionId ? 'Edit Section' : 'New Section'}</h2>
          {view === 'section' && <button style={s.closeBtn} onClick={onClose} aria-label="Close section editor">✕</button>}
        </div>

        <div style={s.modalBody}>
          {view === 'add-item' && (
            <div key="add-item" className="section-editor-pane">
              <button type="button" style={s.addItemBack} onClick={closeAddItem}>
                <span className="material-symbols-outlined msi" aria-hidden="true" style={{ fontSize: 18 }}>arrow_back</span>
                Back to section
              </button>
              <h3 ref={addItemHeadingRef} tabIndex={-1} style={s.addItemHeading}>
                {isRecs ? 'Add a place' : 'Add an item'}
              </h3>
              <p style={s.addItemHint}>
                {isRecs
                  ? "Paste a Google Maps link — we'll pull in the name, photo, rating, and calculate driving distance automatically."
                  : 'Choose what you want guests to see.'}
              </p>

              {isRecs ? (
                <PlaceAddForm propertyId={propertyId} onAdd={addPlaceItem} />
              ) : (
                <>
                  <div style={s.itemTypeGrid} role="radiogroup" aria-label="Item type">
                    {GENERIC_ITEM_TYPES.map(t => {
                      const selected = newItem.type === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          style={{ ...s.itemTypeCard, ...(selected ? s.itemTypeCardSelected : {}) }}
                          onClick={() => setNI('type', t.value)}
                        >
                          <span className="material-symbols-outlined msi" aria-hidden="true" style={{ fontSize: 22 }}>{t.icon}</span>
                          <span>{t.label}</span>
                          {selected && <span style={s.itemTypeCheck} aria-hidden="true">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Label</label>
                    <input style={s.input} value={newItem.label} onChange={e => setNI('label', e.target.value)} placeholder="e.g. Door code" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Content / URL{newItem.type === 'guide' && <MarkdownHelp />}</label>
                    <textarea style={{ ...s.input, height: 72, resize: 'vertical' }}
                      value={newItem.content} onChange={e => setNI('content', e.target.value)}
                      placeholder={newItem.type === 'guide' ? 'Use short paragraphs, - bullets, and [link text](https://example.com)…' : newItem.type === 'text' ? 'Enter instructions…' : 'Enter URL…'} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>🤖 AI context (hidden from guests)</label>
                    <textarea style={{ ...s.input, height: 56, resize: 'vertical', fontSize: 13 }}
                      value={newItem.aiContext} onChange={e => setNI('aiContext', e.target.value)}
                      placeholder="Any context an AI concierge should know about this item…" />
                  </div>
                  {addItemError && <div role="alert" style={s.addItemError}>{addItemError}</div>}
                </>
              )}
            </div>
          )}

          {view === 'edit-item' && editDraft && (
            <div key="edit-item" className="section-editor-pane">
              <button type="button" style={s.addItemBack} onClick={closeEditItem}>
                <span className="material-symbols-outlined msi" aria-hidden="true" style={{ fontSize: 18 }}>arrow_back</span>
                Back to section
              </button>
              <h3 ref={editItemHeadingRef} tabIndex={-1} style={s.addItemHeading}>
                {editDraft.type === 'place' ? 'Edit place' : 'Edit item'}
              </h3>
              <p style={s.addItemHint}>
                {editDraft.type === 'place'
                  ? 'Update how this place appears to guests.'
                  : 'Update what guests see.'}
              </p>

              {editDraft.type === 'place' ? (
                <>
                  <div style={{ ...s.formRow, flexWrap: 'wrap' }}>
                    <div style={s.formGroup}>
                      <label style={s.labelSm}>Display name</label>
                      <input style={s.input} value={editDraft.place?.name || ''} onChange={e => setEdPlace('name', e.target.value)} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.labelSm}>Category</label>
                      <select style={s.input} value={editDraft.place?.category || 'activity'} onChange={e => setEdPlace('category', e.target.value)}>
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Map marker</label>
                    <MapIconPicker value={editDraft.place?.mapIcon || ''} onChange={mapIcon => setEdPlace('mapIcon', mapIcon)} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Best for</label>
                    <AudiencePicker value={editDraft.audiences || []} onChange={audiences => setEd('audiences', audiences)} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '12px 0', padding: '12px 14px', border: '1px solid #E2E8EC', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>
                    <input type="checkbox" checked={Boolean(editDraft.featured)} onChange={e => setEd('featured', e.target.checked)} style={{ width: 17, height: 17, marginTop: 1, accentColor: '#D1614D' }} />
                    <span><strong style={{ display: 'block', color: '#1D3557', fontSize: 13 }}>Our Pick</strong><small style={{ display: 'block', marginTop: 2, color: '#6B7280', fontSize: 11, lineHeight: 1.4 }}>Show this place first and give it a subtle recommendation badge on guest pages.</small></span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '12px 0', padding: '12px 14px', border: '1px solid #E2E8EC', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editDraft.websiteVisible !== false} onChange={e => setEd('websiteVisible', e.target.checked)} style={{ width: 17, height: 17, marginTop: 1, accentColor: '#1D3557' }} />
                    <span><strong style={{ display: 'block', color: '#1D3557', fontSize: 13 }}>Show on property website</strong><small style={{ display: 'block', marginTop: 2, color: '#6B7280', fontSize: 11, lineHeight: 1.4 }}>Turn this off to keep the recommendation in the complete Guidebook without showing it in the property-page preview.</small></span>
                  </label>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Guest-facing description</label>
                    <textarea style={{ ...s.input, height: 64, resize: 'vertical', marginTop: 4 }}
                      value={editDraft.description || ''}
                      onChange={e => setEd('description', e.target.value)}
                      placeholder="What guests see — a short pitch for this place…" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>🤖 AI context — tips, best dishes, best time to go, who it's for (hidden from guests)</label>
                    <textarea style={{ ...s.input, height: 72, resize: 'vertical', marginTop: 4, fontSize: 13 }}
                      value={editDraft.aiContext || ''}
                      onChange={e => setEd('aiContext', e.target.value)}
                      placeholder="e.g. 'Best dish: the Miguel's Special. Great for families. Gets busy Friday nights. Mention you're staying at The Overhang.'" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Host notes (private — never shown to AI or guests)</label>
                    <textarea style={{ ...s.input, height: 56, resize: 'vertical', marginTop: 4, fontSize: 13 }}
                      value={editDraft.hostNotes || ''}
                      onChange={e => setEd('hostNotes', e.target.value)}
                      placeholder="e.g. 'Owner gives us a discount if we mention the property'" />
                  </div>
                  {(editDraft.place?.address || editDraft.place?.phone) && (
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {editDraft.place?.address && <span>📍 {editDraft.place.address}</span>}
                      {editDraft.place?.phone && <span style={{ marginLeft: 12 }}>📞 {editDraft.place.phone}</span>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Label</label>
                    <input style={s.input} value={editDraft.label || ''} onChange={e => setEd('label', e.target.value)} placeholder="e.g. Door code" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Content / URL{editDraft.type === 'guide' && <MarkdownHelp />}</label>
                    <textarea style={{ ...s.input, height: 72, resize: 'vertical' }}
                      value={editDraft.content || ''} onChange={e => setEd('content', e.target.value)}
                      placeholder="What guests should see…" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>🤖 AI context (hidden from guests)</label>
                    <textarea style={{ ...s.input, height: 56, resize: 'vertical', fontSize: 13 }}
                      value={editDraft.aiContext || ''} onChange={e => setEd('aiContext', e.target.value)}
                      placeholder="Any additional context an AI should know about this item…" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.labelSm}>Host notes (private)</label>
                    <textarea style={{ ...s.input, height: 56, resize: 'vertical', fontSize: 13 }}
                      value={editDraft.hostNotes || ''} onChange={e => setEd('hostNotes', e.target.value)}
                      placeholder="Private notes just for you…" />
                  </div>
                  {editItemError && <div role="alert" style={s.addItemError}>{editItemError}</div>}
                </>
              )}
            </div>
          )}

          {view === 'section' && (
            <div key="section" className="section-editor-pane">
              {/* Section metadata */}
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Icon</label>
                  <MaterialIconPicker value={data.icon} onChange={v => set('icon', v)} />
                </div>
                <div style={{ ...s.formGroup, flex: 3 }}>
                  <label style={s.label}>Section title *</label>
                  <input style={s.input} value={data.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Check-In Instructions" />
                </div>
              </div>

              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Section type</label>
                  <select style={s.input} value={data.sectionType || 'general'} onChange={e => set('sectionType', e.target.value)}>
                    <option value="general">General</option>
                    <option value="welcome">Welcome message</option>
                    <option value="recommendations">Local Recommendations</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Visibility</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 8 }}>
                    <input type="checkbox" checked={data.published} onChange={e => set('published', e.target.checked)} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, color: '#374151' }}>Visible to guests</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 10 }}>
                    <input type="checkbox" checked={data.aiPublished ?? data.published ?? false} onChange={e => set('aiPublished', e.target.checked)} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, color: '#374151' }}>Available to AI agents</span>
                  </label>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 1.4 }}>
                    Public agent feed. Do not include private access details or host-only notes.
                  </div>
                </div>
              </div>

              <div style={s.audienceBox}>
                <label style={s.label}>Who is this section for?</label>
                <p style={s.audienceHint}>Optional. Tag a whole practical guide—such as a hiking packing list—so it appears with matching recommendations in the guest’s “For you” filter.</p>
                <AudiencePicker value={data.audiences || []} onChange={audiences => set('audiences', audiences)} />
              </div>

              <div style={{ ...s.importantBox, ...(data.important ? s.importantBoxSelected : {}) }}>
                <label style={s.importantToggle}>
                  <input
                    type="checkbox"
                    checked={data.important === true}
                    onChange={e => set('important', e.target.checked)}
                    style={{ width: 17, height: 17, accentColor: '#BD503E' }}
                  />
                  <span style={s.importantIcon} aria-hidden="true">!</span>
                  <span>
                    <strong style={s.importantTitle}>Highlight as important</strong>
                    <small style={s.importantHint}>Adds an Important label and emphasis in the guest guide, opens this section by default, and places it first in Quick essentials.</small>
                  </span>
                </label>
              </div>

              {/* AI context for section */}
              <div style={s.aiBox}>
                <button style={s.aiToggle} onClick={() => setShowAiFields(!showAiFields)}>
                  🤖 AI Context {showAiFields ? '▲' : '▼'}
                  <span style={s.aiToggleSub}>Hidden from guests — used by AI concierge</span>
                </button>
                {showAiFields && (
                  <div style={{ marginTop: 10 }}>
                    <label style={s.labelSm}>Section context for AI (e.g., "Guests commonly ask about…", "Key things to know…")</label>
                    <textarea style={{ ...s.input, height: 80, resize: 'vertical', marginTop: 4 }}
                      value={data.aiContext || ''}
                      onChange={e => set('aiContext', e.target.value)}
                      placeholder="Add context that would help an AI answer guest questions about this section…" />
                  </div>
                )}
              </div>

              {/* Welcome message */}
              {isWelcome && (
                <div style={s.welcomeBox}>
                  <label style={s.label}>Welcome message</label>
                  <p style={s.welcomeHint}>This text appears directly beneath the “Welcome to” title in the guidebook hero.</p>
                  <textarea
                    style={{ ...s.input, minHeight: 110, resize: 'vertical' }}
                    value={(data.items || []).find(item => item.type === 'text')?.content || ''}
                    onChange={e => updateWelcomeMessage(e.target.value)}
                    placeholder="We're so glad you're here."
                  />
                </div>
              )}

              {/* Items */}
              {!isWelcome && <div style={{ marginTop: 24 }}>
                <div style={s.itemsHeader}>
                  <label style={{ ...s.label, marginBottom: 0 }}>
                    {isRecs ? 'Places' : 'Content items'}
                  </label>
                  <button type="button" ref={addItemBtnRef} style={s.btnAddItem} onClick={openAddItem}>
                    + Add Item
                  </button>
                </div>

                {(data.items || []).map(item => (
                  <div key={item.itemId} id={`guidebook-item-${item.itemId}`}>
                    {item.type === 'place'
                      ? <PlaceItemRow item={item} onRemove={() => removeItem(item.itemId)} onEdit={() => openEditItem(item)} />
                      : <GenericItemRow item={item} onRemove={() => removeItem(item.itemId)} onEdit={() => openEditItem(item)} />}
                  </div>
                ))}

                {itemNotice && (
                  <div role="status" style={s.itemNotice}>
                    {itemNotice}
                  </div>
                )}
              </div>}
            </div>
          )}
        </div>

        <div style={s.modalFooter}>
          {view === 'add-item' && (
            <>
              <button style={s.btnSecondary} onClick={closeAddItem}>Cancel</button>
              {!isRecs && <button style={s.btnPrimary} onClick={addGenericItem}>Add to Section</button>}
            </>
          )}
          {view === 'edit-item' && (
            <>
              <button style={s.btnSecondary} onClick={closeEditItem}>Cancel</button>
              <button style={s.btnPrimary} onClick={saveEditItem}>Save Changes</button>
            </>
          )}
          {view === 'section' && (
            <>
              <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={() => onSave(data)} disabled={saving}>
                {saving ? 'Saving…' : 'Save Section'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Markdown reference popover (for "Formatted guide" content fields) ─────────
const MARKDOWN_HELP_ITEMS = [
  { sample: '## Title',            desc: 'Section title' },
  { sample: '### Subtitle',        desc: 'Smaller subtitle' },
  { sample: '**bold text**',       desc: 'Bold' },
  { sample: '_italic text_',       desc: 'Italic' },
  { sample: '- list item',         desc: 'Bulleted list (one per line)' },
  { sample: '[link text](https://example.com)', desc: 'Link' },
];

function MarkdownHelp() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block', marginLeft: 6 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Formatting reference"
        style={{
          width: 16, height: 16, borderRadius: '50%', border: '1px solid #9CA3AF',
          background: '#fff', color: '#6B7280', fontSize: 10, fontWeight: 700,
          lineHeight: '14px', padding: 0, cursor: 'pointer', verticalAlign: 'middle',
        }}
      >?</button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 4,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 12, width: 260,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>Formatting reference</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {MARKDOWN_HELP_ITEMS.map(({ sample, desc }) => (
              <div key={sample}>
                <code style={{
                  display: 'block', fontSize: 12, background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: 5, padding: '3px 6px', color: '#111827', fontFamily: 'monospace',
                }}>{sample}</code>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

// ── Generic item row (existing item types) ────────────────────────────────────
function GenericItemRow({ item, onRemove, onEdit }) {
  return (
    <div style={s.itemRow}>
      <span style={{ fontSize: 12, background: '#E5E7EB', padding: '2px 8px', borderRadius: 4, color: '#374151', flexShrink: 0 }}>{item.type}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14 }}><strong>{item.label}</strong>{item.content ? ` — ${item.content.slice(0, 50)}` : ''}</div>
        {item.aiContext && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>🤖 {item.aiContext.slice(0, 60)}</div>}
      </div>
      <button style={s.expandBtn} onClick={onEdit} title="Edit item" aria-label="Edit item" data-edit-trigger>✏️</button>
      <button style={s.btnDangerSm} onClick={onRemove} aria-label="Remove item">✕</button>
    </div>
  );
}

// ── Place item row (in the section item list) ─────────────────────────────────
function PlaceItemRow({ item, onRemove, onEdit }) {
  const p = item.place || {};
  const catColor = CATEGORY_COLORS[p.category] || '#F9FAFB';

  return (
    <div style={{ ...s.itemRow, flexWrap: 'wrap', background: catColor, border: `1px solid ${catColor === '#F9FAFB' ? '#E5E7EB' : 'transparent'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        {p.photoUrl
          ? <img src={p.photoUrl} alt={p.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {p.category === 'restaurant' ? '🍽️' : p.category === 'attraction' ? '🏞️' : '📍'}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name || item.label}</span>
            {item.featured && <span style={{ padding: '3px 7px', borderRadius: 999, background: '#FBEAE6', color: '#A54132', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Our Pick</span>}
            {item.websiteVisible === false && <span style={{ padding: '3px 7px', borderRadius: 999, background: '#EEF1F3', color: '#52606D', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Guidebook only</span>}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            {CATEGORY_LABELS[p.category] || '📍 Place'}
            {p.distanceMiles && ` · ${p.distanceMiles} mi · ~${p.travelMinutes} min`}
            {p.rating && ` · ⭐ ${p.rating}`}
          </div>
          {item.aiContext && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>🤖 {item.aiContext.slice(0, 60)}</div>}
          {item.audiences?.length > 0 && <AudienceBadges values={item.audiences} />}
        </div>
        <button style={s.expandBtn} onClick={onEdit} title="Edit place" aria-label="Edit place" data-edit-trigger>✏️</button>
        <button style={s.btnDangerSm} onClick={onRemove} aria-label="Remove place">✕</button>
      </div>
    </div>
  );
}

// ── Place add form (Google URL → lookup → confirm) ────────────────────────────
function PlaceAddForm({ propertyId, onAdd }) {
  const [url, setUrl]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [preview, setPreview]   = useState(null); // enriched place data from API
  const [submitting, setSubmitting] = useState(false);

  async function handleLookup() {
    if (!url.trim() || loading) return;
    setLoading(true); setError(''); setPreview(null);
    try {
      const res = await adminApi.lookupPlace(propertyId, url.trim());
      setPreview(res.place);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(confirmedPlace = preview) {
    if (!confirmedPlace || submitting) return;
    setSubmitting(true);
    onAdd({
      label:       confirmedPlace.name,
      description: '',
      aiContext:   '',
      hostNotes:   '',
      featured:    false,
      websiteVisible: true,
      audiences:   [],
      place:       confirmedPlace,
    });
    setUrl('');
    setPreview(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...s.input, flex: 1, fontSize: 13 }}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://maps.google.com/place/..."
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          autoFocus
        />
        <button style={{ ...s.btnPrimary, whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1 }}
          onClick={handleLookup} disabled={loading || !url.trim()}>
          {loading ? 'Looking up…' : 'Look up'}
        </button>
      </div>

      {error && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: '#DC2626' }}>{error}</div>}

      {preview && (
        <PlacePreview place={preview} onAdd={handleAdd} onDismiss={() => { setPreview(null); setUrl(''); }} submitting={submitting} />
      )}
    </div>
  );
}

// ── Place preview card (after lookup, before adding) ──────────────────────────
function PlacePreview({ place: initialPlace, onAdd, onDismiss, submitting }) {
  const [p, setP] = useState(initialPlace);
  const update    = (k, v) => setP(prev => ({ ...prev, [k]: v }));

  return (
    <div style={s.placePreview}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {p.photoUrl
          ? <img src={p.photoUrl} alt={p.name} style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 72, height: 72, borderRadius: 10, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
              {p.category === 'restaurant' ? '🍽️' : '📍'}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
            {CATEGORY_LABELS[p.category] || '📍'}
            {p.rating && ` · ⭐ ${p.rating} (${p.totalRatings?.toLocaleString()})`}
            {p.priceLabelString && ` · ${p.priceLabelString}`}
          </div>
          {p.distanceMiles != null && (
            <div style={{ fontSize: 13, color: '#16A34A', marginTop: 2, fontWeight: 500 }}>
              🚗 {p.distanceMiles} miles · ~{p.travelMinutes} min drive
            </div>
          )}
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{p.address}</div>
        </div>
      </div>

      {p._mock && (
        <div style={s.mockWarning}>⚠️ Google Places API key not configured — showing mock data. Add your key to Secrets Manager at <code>altus-retreats/dev/google</code>.</div>
      )}

      {/* Editable override fields */}
      <div style={{ marginTop: 14 }}>
        <div style={{ ...s.formRow, flexWrap: 'wrap' }}>
          <div style={s.formGroup}>
            <label style={s.labelSm}>Name override</label>
            <input style={s.input} value={p.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div style={s.formGroup}>
            <label style={s.labelSm}>Category</label>
            <select style={s.input} value={p.category} onChange={e => update('category', e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={s.formGroup}>
          <label style={s.labelSm}>Map marker</label>
          <MapIconPicker value={p.mapIcon || ''} onChange={mapIcon => update('mapIcon', mapIcon)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={s.btnSecondary} onClick={onDismiss} disabled={submitting}>Dismiss</button>
        <button style={{ ...s.btnPrimary, opacity: submitting ? 0.6 : 1 }} onClick={() => onAdd(p)} disabled={submitting}>
          {submitting ? 'Adding…' : 'Add to section'}
        </button>
      </div>
    </div>
  );
}

// ── Icon picker ───────────────────────────────────────────────────────────────
function MapIconPicker({ value, onChange }) {
  return (
    <div style={s.mapIconGrid} role="radiogroup" aria-label="Map marker icon">
      {MAP_ICON_OPTIONS.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value || 'auto'}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.label}
            style={{ ...s.mapIconOption, ...(selected ? s.mapIconOptionSelected : {}) }}
            onClick={() => onChange(option.value)}
          >
            <span style={s.mapIconPreview} aria-hidden="true">
              {option.asset
                ? <img src={option.asset} alt="" style={s.mapIconImage} />
                : <span style={s.mapIconLegacy}>{option.value === '' ? 'A' : option.value === 'arch' ? '⌒' : '⬡'}</span>}
            </span>
            <span style={s.mapIconLabel}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AudiencePicker({ value = [], onChange }) {
  const selected = new Set(value);
  return (
    <div style={s.audienceGrid}>
      {AUDIENCE_OPTIONS.map(option => {
        const active = selected.has(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            style={{ ...s.audienceOption, ...(active ? s.audienceOptionSelected : {}) }}
            onClick={() => onChange(active ? value.filter(item => item !== option.value) : [...value, option.value])}
          >
            <img src={option.asset} alt="" aria-hidden="true" style={{ ...s.audienceIcon, ...(active ? s.audienceIconSelected : {}) }} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AudienceBadges({ values = [] }) {
  return (
    <div style={s.audienceBadges}>
      {values.map(value => {
        const option = AUDIENCE_OPTIONS.find(candidate => candidate.value === value);
        return option ? <span key={value} style={s.audienceBadge}>{option.label}</span> : null;
      })}
    </div>
  );
}

// Renders a section.icon value as either a Material Symbol glyph or the raw
// legacy string (emoji, or the neutral default when blank/unrecognized).
function IconGlyph({ value, size = 20 }) {
  const symbol = parseSectionIcon(value);
  if (symbol) {
    return (
      <span
        className="material-symbols-outlined msi"
        style={{ fontSize: size, lineHeight: 1 }}
        aria-hidden="true"
      >
        {symbol}
      </span>
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">{value || '📄'}</span>;
}

function MaterialIconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('material'); // 'material' | 'emoji'
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const dialogRef = useRef(null);

  const currentSymbol = parseSectionIcon(value);
  const currentLabel = currentSymbol ? materialSymbolLabel(currentSymbol) : (value ? 'Emoji icon' : 'Choose icon');
  const equivalent = !currentSymbol && value && EMOJI_TO_MATERIAL[value];

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  function pick(name) {
    onChange('material-symbols:' + name);
    close();
  }

  const results = tab === 'material' ? searchMaterialIcons(query) : [];
  const visibleResults = results.slice(0, ICON_SEARCH_RESULT_LIMIT);
  const extraCount = results.length - visibleResults.length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        style={s.iconPickerBtn}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <IconGlyph value={value} size={20} />
        <span style={s.iconPickerBtnLabel}>{currentLabel}</span>
        <span style={s.iconPickerChevron} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          style={s.iconPickerBackdrop}
          onClick={e => e.target === e.currentTarget && close()}
          onKeyDown={handleKeyDown}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose a section icon"
            style={s.iconPickerDialog}
          >
            <div style={s.iconPickerHeader}>
              <div style={s.iconPickerTabs} role="tablist" aria-label="Icon source">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'material'}
                  style={{ ...s.iconPickerTab, ...(tab === 'material' ? s.iconPickerTabActive : {}) }}
                  onClick={() => setTab('material')}
                >
                  Material Symbols
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'emoji'}
                  style={{ ...s.iconPickerTab, ...(tab === 'emoji' ? s.iconPickerTabActive : {}) }}
                  onClick={() => setTab('emoji')}
                >
                  Emoji (legacy)
                </button>
              </div>
              <button type="button" style={s.closeBtn} onClick={close} aria-label="Close icon picker">✕</button>
            </div>

            {tab === 'material' ? (
              <>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search icons — try “hot tub”, “wifi”, “checkout”…"
                  aria-label="Search Material Symbols"
                  style={s.iconPickerSearch}
                />

                {equivalent && (
                  <button type="button" style={s.iconPickerSuggestion} onClick={() => pick(equivalent)}>
                    Use the Material equivalent — <strong>{materialSymbolLabel(equivalent)}</strong>
                  </button>
                )}

                <div style={s.iconPickerResults}>
                  {query.trim() ? (
                    <>
                      <div style={s.iconPickerGrid} role="listbox" aria-label="Search results">
                        {visibleResults.map(name => (
                          <IconOption key={name} name={name} selected={name === currentSymbol} onClick={() => pick(name)} />
                        ))}
                      </div>
                      {visibleResults.length === 0 && (
                        <p style={s.iconPickerEmpty}>No icons match “{query}”. Try a different word.</p>
                      )}
                      {extraCount > 0 && (
                        <p style={s.iconPickerMore}>+{extraCount} more match{extraCount === 1 ? '' : 'es'} — refine your search to see them.</p>
                      )}
                    </>
                  ) : (
                    RECOMMENDED_ICON_GROUPS.map(group => (
                      <div key={group.label} style={s.iconPickerGroup}>
                        <p style={s.iconPickerGroupLabel}>{group.label}</p>
                        <div style={s.iconPickerGrid} role="listbox" aria-label={group.label}>
                          {group.icons.map(name => (
                            <IconOption key={name} name={name} selected={name === currentSymbol} onClick={() => pick(name)} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div style={s.iconPickerResults}>
                <div style={s.iconGrid}>
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      style={{
                        ...s.iconOption,
                        background: icon === value ? '#E8F4ED' : 'transparent',
                        outline: icon === value ? '2px solid #2D3A2E' : 'none',
                      }}
                      onClick={() => { onChange(icon); close(); }}
                      title={icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconOption({ name, selected, onClick }) {
  const label = materialSymbolLabel(name);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      title={label}
      aria-label={label}
      style={{ ...s.iconPickerOption, ...(selected ? s.iconPickerOptionSelected : {}) }}
      onClick={onClick}
    >
      <span className="material-symbols-outlined msi" style={{ fontSize: 22 }} aria-hidden="true">{name}</span>
      <span style={s.iconPickerOptionLabel}>{label}</span>
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 },
  headerActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  title:         { fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 4 },
  sub:           { color: '#6B7280', fontSize: 15 },
  errorBanner:   { background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 },
  sectionRow:    { display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '16px 20px', marginBottom: 10, flexWrap: 'wrap' },
  dragHandle:    { color: '#9CA3AF', fontSize: 18, cursor: 'grab', userSelect: 'none', lineHeight: 1 },
  sectionIcon:   { fontSize: 22, flexShrink: 0 },
  sectionInfo:   { flex: 1, minWidth: 0 },
  sectionTitle:  { fontWeight: 600, color: '#111827', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 },
  sectionMeta:   { fontSize: 13, color: '#6B7280', marginTop: 2 },
  sectionActions: { display: 'flex', gap: 8, flexShrink: 0 },
  recsBadge:     { fontSize: 12, background: '#E8F4ED', color: '#16A34A', padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  importantBadge: { fontSize: 11, background: '#FFF0EC', color: '#A33F31', padding: '3px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: '.03em' },
  templates:     { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 32 },
  templatesLabel: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 14 },
  templateGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 },
  templateBtn:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  addMoreBtn:    { marginTop: 16, color: '#2D3A2E', background: 'none', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimary:    { padding: '10px 20px', background: '#2D3A2E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnSecondary:  { padding: '8px 16px', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnDanger:     { padding: '8px 14px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnDangerSm:   { background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  expandBtn:     { background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 14, padding: '0 4px' },
  modalOverlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal:         { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  modalHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid #E5E7EB' },
  modalBody:     { padding: '24px 28px', overflowY: 'auto', flex: 1 },
  modalFooter:   { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '20px 28px', borderTop: '1px solid #E5E7EB' },
  closeBtn:      { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7280', padding: '4px 8px' },
  formRow:       { display: 'flex', gap: 12, marginBottom: 0 },
  formGroup:     { flex: 1, marginBottom: 16 },
  label:         { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  labelSm:       { display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 },
  input:         { width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', outline: 'none' },
  itemRow:       { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, marginBottom: 8, fontSize: 13, flexWrap: 'wrap' },
  aiBox:         { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 14, marginBottom: 0 },
  aiToggle:      { background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#16A34A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 },
  aiToggleSub:   { fontSize: 11, color: '#6B7280', fontWeight: 400 },
  placePreview:       { marginTop: 14, padding: 14, background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' },
  mockWarning:        { marginTop: 10, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, fontSize: 12, color: '#92400E' },
  itemNotice:         { marginTop: 10, padding: '9px 12px', border: '1px solid #A7D7C7', borderRadius: 7, background: '#EFFAF6', color: '#23614D', fontSize: 12, fontWeight: 600 },
  itemsHeader:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  btnAddItem:         { padding: '8px 14px', background: '#fff', color: '#1D3557', border: '1px solid #1D3557', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  addItemBack:        { display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '4px 2px', border: 'none', background: 'none', color: '#1D3557', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  addItemHeading:     { margin: '0 0 4px', color: '#1D3557', fontSize: 20, fontWeight: 700, outline: 'none' },
  addItemHint:        { margin: '0 0 18px', color: '#6B7280', fontSize: 13, lineHeight: 1.5 },
  addItemError:       { marginTop: 4, marginBottom: 16, padding: '9px 12px', border: '1px solid #F5B8AE', borderRadius: 7, background: '#FFF4F1', color: '#A33F31', fontSize: 12, fontWeight: 600 },
  itemTypeGrid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 20 },
  itemTypeCard:       { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 10px', border: '1px solid #E5E7EB', borderRadius: 10, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 },
  itemTypeCardSelected: { borderColor: '#BD503E', background: '#FFF6F3', color: '#BD503E', boxShadow: '0 0 0 1px #BD503E' },
  itemTypeCheck:      { position: 'absolute', top: 6, right: 8, color: '#BD503E', fontSize: 13, fontWeight: 800, lineHeight: 1 },
  mapIconGrid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 7 },
  mapIconOption:      { display: 'flex', minWidth: 0, alignItems: 'center', gap: 7, padding: '7px 8px', border: '1px solid #D7DEE3', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  mapIconOptionSelected: { borderColor: '#1D3557', background: '#EEF3F7', boxShadow: '0 0 0 1px #1D3557' },
  mapIconPreview:     { display: 'grid', width: 28, height: 28, placeItems: 'center', flexShrink: 0, borderRadius: 7, background: '#1D3557', color: '#fff' },
  mapIconImage:       { width: 17, height: 17, objectFit: 'contain', filter: 'brightness(0) invert(1)' },
  mapIconLegacy:      { color: '#fff', fontSize: 19, fontWeight: 700, lineHeight: 1 },
  mapIconLabel:       { minWidth: 0, overflow: 'hidden', fontSize: 11, fontWeight: 600, lineHeight: 1.2, textOverflow: 'ellipsis' },
  iconPickerBtn:      { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 7, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', width: '100%', minWidth: 0 },
  iconPickerBtnLabel: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'left' },
  iconPickerChevron:  { fontSize: 11, color: '#9CA3AF', flexShrink: 0 },
  iconGrid:           { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 },
  iconOption:         { border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 20, padding: 6, lineHeight: 1, fontFamily: 'inherit' },
  iconPickerBackdrop: { position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,24,39,0.5)', padding: 16 },
  iconPickerDialog:   { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 420, maxHeight: '80vh', background: '#fff', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' },
  iconPickerHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 10px 10px 16px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 },
  iconPickerTabs:     { display: 'flex', gap: 4 },
  iconPickerTab:      { padding: '6px 10px', border: 'none', borderRadius: 7, background: 'transparent', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  iconPickerTabActive: { background: '#EEF3F7', color: '#1D3557' },
  iconPickerSearch:   { margin: '12px 16px 4px', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', width: 'calc(100% - 32px)' },
  iconPickerSuggestion: { margin: '4px 16px 0', padding: '8px 12px', border: '1px solid #A7D7C7', borderRadius: 8, background: '#EFFAF6', color: '#23614D', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' },
  iconPickerResults:  { overflowY: 'auto', overflowX: 'hidden', padding: '10px 16px 16px', flex: 1 },
  iconPickerGroup:    { marginBottom: 14 },
  iconPickerGroupLabel: { margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' },
  iconPickerGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 6 },
  iconPickerOption:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0, padding: '10px 6px', border: '1px solid #E5E7EB', borderRadius: 9, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' },
  iconPickerOptionSelected: { borderColor: '#1D3557', background: '#EEF3F7', boxShadow: '0 0 0 1px #1D3557' },
  iconPickerOptionLabel: { width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 },
  iconPickerEmpty:    { margin: 0, padding: '20px 4px', color: '#6B7280', fontSize: 13, textAlign: 'center' },
  iconPickerMore:     { margin: '10px 2px 0', color: '#9CA3AF', fontSize: 11, textAlign: 'center' },
  eyebrow:            { margin: '0 0 5px', color: '#BD503E', fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' },
  heroSettingsTitle:  { margin: '0 0 7px', color: '#1D3557', fontFamily: 'Fraunces, Georgia, serif', fontSize: 26, fontWeight: 600 },
  heroSettingsCopy:   { margin: '0 0 16px', color: '#637180', fontSize: 13, lineHeight: 1.55 },
  savedInline:        { marginLeft: 12, color: '#2F735D', fontSize: 13, fontWeight: 600 },
  welcomeBox:         { marginTop: 24, padding: 18, border: '1px solid #DCE3E7', borderRadius: 12, background: '#F3F6F7' },
  welcomeHint:        { margin: '-1px 0 10px', color: '#637180', fontSize: 12, lineHeight: 1.5 },
  audienceBox:        { margin: '4px 0 16px', padding: 15, border: '1px solid #DCE3E7', borderRadius: 12, background: '#F8FAFB' },
  audienceHint:       { margin: '-1px 0 11px', color: '#637180', fontSize: 12, lineHeight: 1.5 },
  audienceGrid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 },
  audienceOption:     { minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 10px', border: '1px solid #DCE3E7', borderRadius: 10, background: '#fff', color: '#52606D', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  audienceOptionSelected: { borderColor: '#1D3557', background: '#1D3557', color: '#fff', boxShadow: '0 5px 14px rgba(29,53,87,.14)' },
  audienceIcon:       { width: 22, height: 22, objectFit: 'contain' },
  audienceIconSelected: { filter: 'brightness(0) invert(1)' },
  audienceBadges:     { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  audienceBadge:      { padding: '3px 7px', borderRadius: 999, background: '#E7EEEB', color: '#35554B', fontSize: 9, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' },
  importantBox:       { margin: '0 0 16px', padding: 15, border: '1px solid #E2E6E9', borderRadius: 12, background: '#FAFBFC' },
  importantBoxSelected: { borderColor: '#E4A99E', background: '#FFF6F3', boxShadow: '0 0 0 1px rgba(189,80,62,.08)' },
  importantToggle:    { display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer' },
  importantIcon:      { display: 'grid', width: 29, height: 29, flex: '0 0 auto', placeItems: 'center', borderRadius: 9, background: '#BD503E', color: '#fff', fontSize: 17, fontWeight: 800, lineHeight: 1 },
  importantTitle:     { display: 'block', marginBottom: 3, color: '#1D3557', fontSize: 13 },
  importantHint:      { display: 'block', color: '#637180', fontSize: 11, lineHeight: 1.45 },
};
