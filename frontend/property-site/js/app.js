/**
 * Main app bootstrap — fetches property data, mounts components.
 */

// ── Toast utility ────────────────────────────────────
window.showToast = function(message, type = 'info', duration = 5000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container'; container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`; toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
};

// ── Hero gallery (full-page background slides) ────────
function initGallery(photos) {
  const slidesEl     = document.querySelector('.slides');
  const dotsEl       = document.querySelector('.dots');
  if (!slidesEl || !photos?.length) return;

  photos.forEach((photo, i) => {
    const slide = document.createElement('div');
    slide.className = `slide${i === 0 ? ' active' : ''}`;
    slide.style.backgroundImage = `url('${photo.url}')`;
    if (photo.position) slide.style.backgroundPosition = photo.position;
    slidesEl.appendChild(slide);

    if (dotsEl) {
      const dot = document.createElement('button');
      dot.className = `dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', photo.caption || `Photo ${i + 1}`);
      dot.setAttribute('role', 'tab');
      dot.addEventListener('click', () => goToSlide(i));
      dotsEl.appendChild(dot);
    }
  });

  let current = 0;
  let timer = null;

  function goToSlide(idx) {
    slidesEl.querySelectorAll('.slide')[current]?.classList.remove('active');
    dotsEl?.querySelectorAll('.dot')[current]?.classList.remove('active');
    current = (idx + photos.length) % photos.length;
    slidesEl.querySelectorAll('.slide')[current]?.classList.add('active');
    dotsEl?.querySelectorAll('.dot')[current]?.classList.add('active');
  }

  function startTimer() { timer = setInterval(() => goToSlide(current + 1), 5000); }
  startTimer();

  slidesEl.addEventListener('mouseenter', () => clearInterval(timer));
  slidesEl.addEventListener('mouseleave', startTimer);
}

// ── Hero amenity pills ────────────────────────────────
const HERO_PRIORITY = ['Hot tub','Hot Tub','Fire pit','Fire Pit','Wifi','WiFi','Pet friendly','Pet Friendly','Self check-in','Sauna'];

function initHeroPills(amenities) {
  const pillsEl = document.querySelector('.hero__pills');
  if (!pillsEl || !amenities?.length) return;

  const normalized = amenities.map(a =>
    typeof a === 'string' ? a : (a.name || String(a))
  );

  // Show priority amenities first, then fill up to 5 total
  const priority = normalized.filter(n => HERO_PRIORITY.some(p => p.toLowerCase() === n.toLowerCase()));
  const rest      = normalized.filter(n => !HERO_PRIORITY.some(p => p.toLowerCase() === n.toLowerCase()));
  const picks     = [...priority, ...rest].slice(0, 5);

  picks.forEach(name => {
    const pill = document.createElement('span');
    pill.className = 'hero__pill';
    pill.textContent = `◆ ${name}`;
    pillsEl.appendChild(pill);
  });
}

// ── Photo grid ────────────────────────────────────────
function initPhotoGrid(photos) {
  const grid = document.querySelector('.photo-grid');
  if (!grid || !photos?.length) return;
  grid.innerHTML = '';
  const visible = photos.slice(0, 5);
  visible.forEach((photo, i) => {
    const item = document.createElement('div');
    item.className = 'photo-grid__item';
    const img = document.createElement('img');
    img.src = photo.url; img.alt = photo.caption || ''; img.loading = 'lazy';
    item.appendChild(img);
    if (i === 4 && photos.length > 5) {
      const more = document.createElement('div');
      more.className = 'photo-grid__more';
      more.textContent = `+${photos.length - 5} more`;
      item.appendChild(more);
    }
    grid.appendChild(item);
  });
}

// ── Amenities ─────────────────────────────────────────
const AMENITY_ICONS = {
  'Wifi': '📶', 'WiFi': '📶', 'Full kitchen': '🍳', 'Free parking': '🅿️',
  'Hot Tub': '♨️', 'Hot tub': '♨️', 'Fire pit': '🔥', 'Fire Pit': '🔥',
  'Washer/dryer': '👕', 'Air conditioning': '❄️', 'Heating': '🌡️',
  'Smart TV': '📺', 'Outdoor dining area': '🌿', 'BBQ grill': '🍖',
  'Game room': '🎮', 'Fireplace': '🪵', 'Pool': '🏊', 'Sauna': '🧖',
  'Cold Plunge': '🧊', 'EV Charger': '⚡', 'Trail Access': '🥾',
  'Pet friendly': '🐾', 'Pet Friendly': '🐾', 'Self check-in': '🔑',
};

function initAmenities(amenities) {
  const grid = document.querySelector('.amenities-grid');
  if (!grid || !amenities?.length) return;
  grid.innerHTML = '';

  const normalized = amenities.map(a =>
    typeof a === 'string' ? { name: a, category: 'Other' } : { name: a.name || String(a), category: a.category || 'Other' }
  );

  const groups = normalized.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a.name);
    return acc;
  }, {});

  const hasCategories = Object.keys(groups).length > 1 || !groups['Other'];

  if (hasCategories) {
    Object.entries(groups).forEach(([cat, names]) => {
      const header = document.createElement('div');
      header.className = 'amenity-cat-header';
      header.textContent = cat;
      grid.appendChild(header);
      names.forEach(name => {
        const el = document.createElement('div');
        el.className = 'amenity';
        el.innerHTML = `<span class="amenity__icon" aria-hidden="true">${AMENITY_ICONS[name] || '✓'}</span><span>${name}</span>`;
        grid.appendChild(el);
      });
    });
  } else {
    normalized.forEach(({ name }) => {
      const el = document.createElement('div');
      el.className = 'amenity';
      el.innerHTML = `<span class="amenity__icon" aria-hidden="true">${AMENITY_ICONS[name] || '✓'}</span><span>${name}</span>`;
      grid.appendChild(el);
    });
  }
}

// ── Location ──────────────────────────────────────────
function initLocation(location) {
  if (!location) return;

  const nameEls = document.querySelectorAll('.location-neighborhood-name');
  if (location.neighborhood) nameEls.forEach(el => el.textContent = location.neighborhood);

  // Eyebrow (location line in hero)
  const eyebrow = document.querySelector('.hero__eyebrow');
  if (eyebrow && location.neighborhood) eyebrow.textContent = location.neighborhood;

  const mapEl = document.getElementById('location-map');
  if (mapEl) {
    if (location.mapsEmbed) {
      mapEl.innerHTML = location.mapsEmbed;
    } else if (location.pinLat && location.pinLng) {
      const src = `https://maps.google.com/maps?q=${location.pinLat},${location.pinLng}&z=13&output=embed`;
      mapEl.innerHTML = `<iframe src="${src}" width="100%" height="100%" style="border:0;border-radius:12px;" loading="lazy" title="Property location"></iframe>`;
    } else {
      mapEl.innerHTML = `<div class="map-placeholder"><span>📍</span> ${location.neighborhood || 'Location'}</div>`;
    }
  }

  const show = (id, descEl, text) => {
    if (!text) return;
    const card = document.getElementById(id);
    const el   = document.querySelector(descEl);
    if (card && el) { el.textContent = text; card.style.display = ''; }
  };

  show('loc-neighborhood', '.location-neighborhood-desc', location.neighborhoodDescription || location.neighborhoodDesc);
  show('loc-directions',   '.location-directions',        location.directions);
  show('loc-around',       '.location-around',            location.gettingAround);
}

// ── House Rules ───────────────────────────────────────
function initHouseRules(houseRules, cancellationPolicy) {
  if (!houseRules?.length && !cancellationPolicy) return;

  const summary = document.getElementById('rules-summary');
  if (summary) summary.style.display = '';

  const rulesList = document.getElementById('rules-list');
  if (rulesList && houseRules?.length) {
    houseRules.forEach(rule => {
      const li = document.createElement('li');
      li.className = 'rules-list__item';
      li.textContent = typeof rule === 'string' ? rule : (rule.body || rule.rule || rule.text || rule.name || JSON.stringify(rule));
      rulesList.appendChild(li);
    });
  }

  if (cancellationPolicy) {
    const sec  = document.getElementById('cancellation-section');
    const text = document.getElementById('cancellation-text');
    if (sec && text) { text.textContent = cancellationPolicy; sec.style.display = ''; }
  }

  const modal    = document.getElementById('rules-modal');
  const trigger  = document.getElementById('rules-trigger');
  const closeBtn = document.getElementById('rules-modal-close');

  const openModal  = () => { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; closeBtn?.focus(); };
  const closeModal = () => { modal.style.display = 'none'; document.body.style.overflow = ''; trigger?.focus(); };

  trigger?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.style.display !== 'none') closeModal(); });
}

// ── SEO ───────────────────────────────────────────────
function updateSEO(name, description) {
  if (name) {
    document.title = `${name} — Direct Booking | Altus Retreats`;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', name);
  }
  if (description) {
    document.querySelector('meta[name="description"]')?.setAttribute('content', description.slice(0, 160));
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description.slice(0, 160));
  }
}

// ── Property data ─────────────────────────────────────
async function loadProperty() {
  try {
    const data = await api.getProperty();
    const h = data.hospitable || {};
    const p = data.property   || {};
    const c = p.content       || {};

    const name        = c.heroHeadline  || h.name        || p.name        || 'Our Retreat';
    const description = c.heroSubtitle  || h.summary     || h.description || '';
    const aboutTitle  = c.aboutTitle    || '';
    const aboutBody   = c.aboutBody     || h.description || description;
    const bedrooms    = p.bedrooms      || h.bedrooms    || '—';
    const bathrooms   = p.bathrooms     || h.bathrooms   || '—';
    const maxGuests   = p.maxGuests     || h.maxGuests   || '—';
    const amenities   = h.amenities     || [];
    const photos      = h.photos        || [];
    const location    = p.location      || null;
    const houseRules        = h.houseRules        || [];
    const cancellationPolicy= h.cancellationPolicy || null;
    const heroPhoto   = c.heroPhoto     || null;

    // Hero title fields (admin-manageable)
    const heroEyebrow    = c.heroEyebrow    || null;
    const heroTitleLine1 = c.heroTitleLine1 || null;
    const heroAccentWord = c.heroAccentWord || null;
    const heroTitleSuffix= c.heroTitleSuffix|| null;

    // Branding
    if (p.branding) {
      const r = document.documentElement.style;
      if (p.branding.primaryColor) r.setProperty('--color-primary', p.branding.primaryColor);
      if (p.branding.accentColor)  r.setProperty('--color-accent',  p.branding.accentColor);
    }

    updateSEO(name, aboutBody);

    // Hero title
    const titleMain   = document.querySelector('.hero__title-main');
    const titleAccent = document.querySelector('.hero__title-accent');
    const titleDim    = document.querySelector('.hero__title-dim');
    const eyebrowEl   = document.querySelector('.hero__eyebrow');

    if (titleMain   && heroTitleLine1) titleMain.textContent   = heroTitleLine1;
    if (titleAccent && heroAccentWord) titleAccent.textContent  = heroAccentWord;
    if (titleDim    && heroTitleSuffix) titleDim.textContent   = ' ' + heroTitleSuffix;
    if (eyebrowEl   && heroEyebrow)    eyebrowEl.textContent   = heroEyebrow;

    // Property name in nav logo
    document.querySelectorAll('.property-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.property-description').forEach(el => el.textContent = description);

    const aboutTitleEl = document.querySelector('.about-title');
    if (aboutTitleEl && aboutTitle) aboutTitleEl.textContent = aboutTitle;

    const aboutBodyEl = document.querySelector('.about-body');
    if (aboutBodyEl) aboutBodyEl.textContent = aboutBody;

    const setMeta = (sel, val) => document.querySelectorAll(sel).forEach(el => el.textContent = val);
    setMeta('.stat-bedrooms',  bedrooms);
    setMeta('.stat-bathrooms', bathrooms);
    setMeta('.stat-guests',    maxGuests);
    setMeta('.stat-type',      h.propertyType || 'Entire home');

    const heroPhotos = heroPhoto ? [{ url: heroPhoto, caption: name }, ...photos] : photos;

    initGallery(heroPhotos);
    initHeroPills(amenities);
    initPhotoGrid(photos);
    initAmenities(amenities);
    initLocation(location);
    initHouseRules(houseRules, cancellationPolicy);

  } catch (err) {
    console.error('Failed to load property:', err);
    showToast('Could not load property information. Please refresh.', 'error');
  }
}

// ── Smooth scroll ─────────────────────────────────────
function initNavLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(el => {
    el.addEventListener('click', e => {
      const target = document.querySelector(el.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavLinks();
  loadProperty();
});
