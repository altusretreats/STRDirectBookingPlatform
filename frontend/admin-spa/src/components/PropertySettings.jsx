import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';

export default function PropertySettings({ propertyId, propertyName }) {
  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Load current property data
    adminApi.listProperties().then(d => {
      const prop = (d.properties || []).find(p => p.slug === propertyId);
      if (prop) {
        setForm({
          name:    prop.name    || '',
          domain:  prop.domain  || '',
          active:  prop.active  !== false,
          hospitable: {
            listingId: prop.hospitable?.listingId || '',
            platform:  prop.hospitable?.platform  || 'hospitable',
          },
          address: {
            street:  prop.address?.street  || '',
            city:    prop.address?.city    || '',
            state:   prop.address?.state   || '',
            zip:     prop.address?.zip     || '',
            country: prop.address?.country || 'US',
          },
          branding: {
            description: prop.branding?.description || '',
            tagline:     prop.branding?.tagline     || '',
          },
          pricing: {
            nightlyRate:  prop.pricing?.nightlyRate  ?? '',
            cleaningFee:  prop.pricing?.cleaningFee  ?? '',
            minNights:    prop.pricing?.minNights    ?? 2,
            maxNights:    prop.pricing?.maxNights    ?? 14,
            checkInTime:  prop.pricing?.checkInTime  || '15:00',
            checkOutTime: prop.pricing?.checkOutTime || '11:00',
          },
        });
      }
    }).catch(e => setError(e.message));
  }, [propertyId]);

  const set = (path, value) => {
    setForm(prev => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await adminApi.updateProperty(propertyId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div style={s.loading}>Loading…</div>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Settings</h1>
          <p style={s.sub}>{propertyName}</p>
        </div>
        <div style={s.headerActions}>
          {saved && <span style={s.savedBadge}>✓ Saved</span>}
          {error && <span style={s.errorBadge}>{error}</span>}
          <button style={s.saveBtn} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* General */}
      <Section title="General" icon="⊞">
        <Row label="Property Name">
          <Input value={form.name} onChange={v => set('name', v)} />
        </Row>
        <Row label="Domain">
          <Input value={form.domain} onChange={v => set('domain', v)} placeholder="staytheoverhang.com" />
        </Row>
        <Row label="Active">
          <Toggle value={form.active} onChange={v => set('active', v)} />
        </Row>
      </Section>

      {/* Hospitable */}
      <Section title="Hospitable" icon="🔗">
        <Row label="Hospitable Property ID" hint="The UUID from your Hospitable dashboard URL: app.hospitable.com/properties/{uuid} — NOT the Airbnb listing ID">
          <Input value={form.hospitable.listingId} onChange={v => set('hospitable.listingId', v)} placeholder="e.g. a1b2c3d4-e5f6-..." />
        </Row>
        <Row label="Platform">
          <Select value={form.hospitable.platform} onChange={v => set('hospitable.platform', v)}
            options={[{ value: 'hospitable', label: 'Hospitable' }, { value: 'airbnb', label: 'Airbnb' }, { value: 'vrbo', label: 'VRBO' }]} />
        </Row>
      </Section>

      {/* Address */}
      <Section title="Property Address" icon="📍">
        <Row label="Street">
          <Input value={form.address.street} onChange={v => set('address.street', v)} placeholder="123 Forest Rd" />
        </Row>
        <div style={s.rowGrid}>
          <Row label="City">
            <Input value={form.address.city} onChange={v => set('address.city', v)} placeholder="Stanton" />
          </Row>
          <Row label="State">
            <Input value={form.address.state} onChange={v => set('address.state', v)} placeholder="KY" maxLength={2} />
          </Row>
          <Row label="ZIP">
            <Input value={form.address.zip} onChange={v => set('address.zip', v)} placeholder="40380" />
          </Row>
        </div>
      </Section>

      {/* Pricing */}
      <Section title="Pricing" icon="💰">
        <Row label="Nightly Rate" hint="In dollars (e.g. 350)">
          <Input value={form.pricing.nightlyRate} onChange={v => set('pricing.nightlyRate', Number(v) || '')} placeholder="350" />
        </Row>
        <Row label="Cleaning Fee" hint="One-time fee in dollars">
          <Input value={form.pricing.cleaningFee} onChange={v => set('pricing.cleaningFee', Number(v) || '')} placeholder="150" />
        </Row>
        <div style={s.rowGrid2}>
          <Row label="Min Nights">
            <Input value={form.pricing.minNights} onChange={v => set('pricing.minNights', Number(v) || 1)} placeholder="2" />
          </Row>
          <Row label="Max Nights">
            <Input value={form.pricing.maxNights} onChange={v => set('pricing.maxNights', Number(v) || 30)} placeholder="14" />
          </Row>
        </div>
        <div style={s.rowGrid2}>
          <Row label="Check-in Time">
            <Input type="time" value={form.pricing.checkInTime} onChange={v => set('pricing.checkInTime', v)} />
          </Row>
          <Row label="Check-out Time">
            <Input type="time" value={form.pricing.checkOutTime} onChange={v => set('pricing.checkOutTime', v)} />
          </Row>
        </div>
      </Section>

      {/* Branding */}
      <Section title="Branding" icon="✨">
        <Row label="Tagline">
          <Input value={form.branding.tagline} onChange={v => set('branding.tagline', v)} placeholder="Your basecamp for all things Red River Gorge" />
        </Row>
        <Row label="Description">
          <Textarea value={form.branding.description} onChange={v => set('branding.description', v)} placeholder="Short description shown on listing pages…" />
        </Row>
      </Section>

      <div style={s.footer}>
        {saved && <span style={s.savedBadge}>✓ Saved</span>}
        {error && <span style={s.errorBadge}>{error}</span>}
        <button style={s.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <span style={s.sectionIcon}>{icon}</span>
        <span style={s.sectionTitle}>{title}</span>
      </div>
      <div style={s.sectionBody}>{children}</div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div style={s.row}>
      <div style={s.rowLabel}>
        <span>{label}</span>
        {hint && <span style={s.hint}>{hint}</span>}
      </div>
      <div style={s.rowControl}>{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, maxLength, type = 'text' }) {
  return (
    <input
      style={s.input}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      style={s.textarea}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
    />
  );
}

function Toggle({ value, onChange }) {
  return (
    <label style={s.toggle}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <div style={{ ...s.toggleTrack, background: value ? '#2D3A2E' : '#D1D5DB' }}>
        <div style={{ ...s.toggleThumb, transform: value ? 'translateX(20px)' : 'translateX(2px)' }} />
      </div>
      <span style={{ ...s.toggleLabel, color: value ? '#2D3A2E' : '#6B7280' }}>{value ? 'Active' : 'Inactive'}</span>
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select style={s.select} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const s = {
  loading:      { color: '#6B7280', textAlign: 'center', marginTop: 60 },
  header:       { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  title:        { fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 4 },
  sub:          { color: '#6B7280', fontSize: 15 },
  headerActions:{ display: 'flex', alignItems: 'center', gap: 12 },
  saveBtn:      { padding: '10px 24px', background: '#2D3A2E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  savedBadge:   { fontSize: 13, color: '#16A34A', fontWeight: 500 },
  errorBadge:   { fontSize: 13, color: '#DC2626' },
  section:      { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  sectionHeader:{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' },
  sectionIcon:  { fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#374151' },
  sectionBody:  { padding: '8px 0' },
  row:          { display: 'flex', alignItems: 'flex-start', gap: 24, padding: '14px 24px', borderBottom: '1px solid #F9FAFB' },
  rowGrid:      { display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 0 },
  rowGrid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
  rowLabel:     { width: 180, flexShrink: 0, paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 3 },
  hint:         { fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 },
  rowControl:   { flex: 1 },
  input:        { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 14, color: '#111827', fontFamily: 'inherit', outline: 'none' },
  textarea:     { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 14, color: '#111827', fontFamily: 'inherit', outline: 'none', resize: 'vertical' },
  select:       { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 14, color: '#111827', fontFamily: 'inherit', background: '#fff' },
  toggle:       { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: 6 },
  toggleTrack:  { width: 44, height: 24, borderRadius: 100, position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb:  { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s' },
  toggleLabel:  { fontSize: 14, fontWeight: 500 },
  footer:       { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 },
};
