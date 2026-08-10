/**
 * Booking page — loads property data and populates the booking page.
 */

const AMENITY_ICONS = {
  'Wifi': '📶', 'WiFi': '📶', 'Full kitchen': '🍳', 'Free parking': '🅿️',
  'Hot Tub': '♨️', 'Hot tub': '♨️', 'Fire pit': '🔥', 'Fire Pit': '🔥',
  'Washer/dryer': '👕', 'Air conditioning': '❄️', 'Heating': '🌡️',
  'Smart TV': '📺', 'Outdoor dining area': '🌿', 'BBQ grill': '🍖',
  'Game room': '🎮', 'Fireplace': '🪵', 'Pool': '🏊', 'Sauna': '🧖',
  'Pet friendly': '🐾', 'Pet Friendly': '🐾', 'Self check-in': '🔑',
};

async function loadBookingPage() {
  try {
    const data = await api.getProperty();
    const h = data.hospitable || {};
    const p = data.property   || {};
    const c = p.content       || {};

    const name        = c.heroHeadline || h.name        || p.name        || 'Our Retreat';
    const description = c.heroSubtitle || h.summary     || h.description || '';
    const aboutTitle  = c.aboutTitle   || '';
    const aboutBody   = c.aboutBody    || h.description || description;
    const bedrooms    = p.bedrooms     || h.bedrooms    || '—';
    const bathrooms   = p.bathrooms    || h.bathrooms   || '—';
    const maxGuests   = p.maxGuests    || h.maxGuests   || '—';
    const amenities   = h.amenities    || [];
    const photos      = h.photos       || [];
    const location    = p.location     || null;
    const houseRules  = h.houseRules   || [];
    const heroPhoto   = c.heroPhoto    || photos[0]?.url || null;
    const checkinTime = h.checkin?.from || h.checkinTime || '3:00 PM';

    // Page title
    document.title = `Book Your Stay — ${name} | Altus Retreats`;

    // Property name
    document.querySelectorAll('.property-name').forEach(el => el.textContent = name);

    // Hero image
    const heroImg = document.getElementById('book-hero-img');
    if (heroImg && heroPhoto) {
      heroImg.style.backgroundImage = `url('${heroPhoto}')`;
    }

    // Hero location
    const locEl = document.querySelector('.book-hero__location');
    if (locEl && location?.neighborhood) locEl.textContent = location.neighborhood;

    // Stats
    const set = (sel, val) => document.querySelectorAll(sel).forEach(el => el.textContent = val);
    set('.stat-bedrooms',    bedrooms);
    set('.stat-bathrooms',   bathrooms);
    set('.stat-guests',      maxGuests);
    set('.book-checkin-time', checkinTime);

    // About
    const aboutTitleEl = document.querySelector('.about-title');
    if (aboutTitleEl && aboutTitle) aboutTitleEl.textContent = aboutTitle;
    document.querySelectorAll('.about-body, .property-description').forEach(el => el.textContent = aboutBody);

    // Amenities
    const amenGrid = document.getElementById('book-amenities');
    if (amenGrid && amenities.length) {
      const normalized = amenities.map(a =>
        typeof a === 'string' ? { name: a } : { name: a.name || String(a) }
      );
      normalized.forEach(({ name: aName }) => {
        const el = document.createElement('div');
        el.className = 'book-amenity';
        el.innerHTML = `<span class="book-amenity__icon">${AMENITY_ICONS[aName] || '✓'}</span><span>${aName}</span>`;
        amenGrid.appendChild(el);
      });
    }

    // House rules
    const rulesSec  = document.getElementById('book-rules-section');
    const rulesList = document.getElementById('book-rules');
    if (rulesSec && rulesList && houseRules.length) {
      houseRules.forEach(rule => {
        const li = document.createElement('li');
        li.textContent = typeof rule === 'string' ? rule : (rule.body || rule.rule || rule.text || rule.name || '');
        rulesList.appendChild(li);
      });
      rulesSec.style.display = '';
    }

  } catch (err) {
    console.error('Failed to load booking page:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadBookingPage);
