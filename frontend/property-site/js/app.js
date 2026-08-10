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
// landingPills: admin-curated array of strings (content.heroLandingPills)
// amenities: Hospitable amenities — used as fallback only if no curated pills set
function initHeroPills(landingPills, amenities) {
  const pillsEl = document.querySelector('.hero__pills');
  if (!pillsEl) return;

  let picks = [];

  if (landingPills?.length) {
    // Admin curated — use exactly as set
    picks = landingPills.filter(Boolean).slice(0, 6);
  }
  // If nothing curated, show nothing — admin should set these

  if (!picks.length) return;

  picks.forEach(text => {
    const pill = document.createElement('span');
    pill.className = 'hero__pill';
    pill.textContent = text;
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
    const heroSubtitleText = c.heroSubtitle || '';           // landing page only — no Hospitable fallback
    const description = h.summary     || h.description || ''; // used only in below-fold sections
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

    // Hero title fields (admin-manageable, no Hospitable fallback)
    const heroEyebrow     = c.heroEyebrow     || null;
    const heroTitleLine1  = c.heroTitleLine1  || null;
    const heroAccentWord  = c.heroAccentWord  || null;
    const heroTitleSuffix = c.heroTitleSuffix || null;
    const heroLandingPills = c.heroLandingPills || [];

    // Branding + per-content accent color override
    if (p.branding) {
      const r = document.documentElement.style;
      if (p.branding.primaryColor) r.setProperty('--color-primary', p.branding.primaryColor);
      if (p.branding.accentColor)  r.setProperty('--color-accent',  p.branding.accentColor);
    }
    if (c.heroAccentColor) {
      document.documentElement.style.setProperty('--color-accent', c.heroAccentColor);
    }

    updateSEO(name, aboutBody);

    // Hero title (admin-managed only)
    const titleMain   = document.querySelector('.hero__title-main');
    const titleAccent = document.querySelector('.hero__title-accent');
    const titleDim    = document.querySelector('.hero__title-dim');
    const eyebrowEl   = document.querySelector('.hero__eyebrow');
    const subtitleEl  = document.querySelector('.hero__subtitle');

    if (titleMain)   { titleMain.textContent   = heroTitleLine1  || ''; titleMain.style.display   = heroTitleLine1  ? '' : 'none'; }
    if (titleAccent) { titleAccent.textContent = heroAccentWord  || ''; titleAccent.style.display = heroAccentWord  ? '' : 'none'; }
    if (titleDim)    { titleDim.textContent    = heroTitleSuffix || ''; titleDim.style.display    = heroTitleSuffix ? '' : 'none'; }
    if (eyebrowEl   && heroEyebrow)     eyebrowEl.textContent    = heroEyebrow;

    // Hero subtitle — only show if admin explicitly set it
    if (subtitleEl) {
      subtitleEl.textContent = heroSubtitleText;
      subtitleEl.style.display = heroSubtitleText ? '' : 'none';
    }

    // Property name in nav logo
    document.querySelectorAll('.property-name').forEach(el => el.textContent = name);
    // Below-fold description (about section only)
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

    // Hero slider: custom uploads take priority → single heroPhoto override → Hospitable photos
    const heroSliderPhotos = (c.heroSliderPhotos || [])
      .filter(Boolean)
      .map(url => ({ url }));

    let heroPhotos;
    if (heroSliderPhotos.length) {
      heroPhotos = heroSliderPhotos;
    } else if (heroPhoto) {
      heroPhotos = [{ url: heroPhoto, caption: name }, ...photos];
    } else {
      heroPhotos = photos;
    }

    initGallery(heroPhotos);
    initHeroPills(heroLandingPills, amenities);
    initPhotoGrid(photos);
    initAmenities(amenities);
    initLocation(location);
    initHouseRules(houseRules, cancellationPolicy);

  } catch (err) {
    console.error('Failed to load property:', err);
    showToast('Could not load property information. Please refresh.', 'error');
  }
}

// ── Smooth scroll (custom easing) ─────────────────────
function smoothScrollTo(targetEl) {
  const targetY  = targetEl.getBoundingClientRect().top + window.scrollY;
  const startY   = window.scrollY;
  const distance = targetY - startY;
  const duration = Math.max(400, Math.min(Math.abs(distance) * 0.4, 900));
  let startTime  = null;

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutQuart(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function initNavLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(el => {
    el.addEventListener('click', e => {
      const target = document.querySelector(el.getAttribute('href'));
      if (target) { e.preventDefault(); smoothScrollTo(target); }
    });
  });
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavLinks();
  loadProperty();
});
