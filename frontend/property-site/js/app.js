/**
 * Main app bootstrap — fetches property data, mounts components.
 */

// ── Toast utility (global) ──────────────────────────
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

// ── Photo gallery ────────────────────────────────────
function initGallery(photos) {
  const hero = document.querySelector('.hero__gallery');
  const dotsContainer = document.querySelector('.hero__dots');
  if (!hero || !photos?.length) return;

  photos.forEach((photo, i) => {
    const slide = document.createElement('div');
    slide.className = `hero__slide${i === 0 ? ' active' : ''}`;
    slide.style.backgroundImage = `url('${photo.url}')`;
    hero.appendChild(slide);

    const dot = document.createElement('button');
    dot.className = `hero__dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('aria-label', photo.caption || `Photo ${i + 1}`);
    dot.setAttribute('role', 'tab');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer?.appendChild(dot);
  });

  let current = 0;
  let timer = null;

  function goToSlide(idx) {
    hero.querySelectorAll('.hero__slide')[current]?.classList.remove('active');
    dotsContainer?.querySelectorAll('.hero__dot')[current]?.classList.remove('active');
    current = (idx + photos.length) % photos.length;
    hero.querySelectorAll('.hero__slide')[current]?.classList.add('active');
    dotsContainer?.querySelectorAll('.hero__dot')[current]?.classList.add('active');
  }

  // Auto-advance every 5s
  function startTimer() {
    timer = setInterval(() => goToSlide(current + 1), 5000);
  }
  startTimer();

  // Pause on hover
  hero.addEventListener('mouseenter', () => clearInterval(timer));
  hero.addEventListener('mouseleave', startTimer);
}

// ── Photo grid ───────────────────────────────────────
function initPhotoGrid(photos) {
  const grid = document.querySelector('.photo-grid');
  if (!grid || !photos?.length) return;
  grid.innerHTML = '';
  const visible = photos.slice(0, 5);
  visible.forEach((photo, i) => {
    const item = document.createElement('div');
    item.className = 'photo-grid__item';
    const img = document.createElement('img');
    img.src = photo.url; img.alt = photo.caption || '';
    img.loading = 'lazy'; img.decoding = 'async';
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
  'WiFi': '📶', 'Full kitchen': '🍳', 'Full Kitchen': '🍳', 'Free parking': '🅿️',
  'Hot Tub': '♨️', 'Hot tub': '♨️', 'Fire pit': '🔥', 'Fire Pit': '🔥',
  'Washer/dryer': '👕', 'Air conditioning': '❄️', 'Heating': '🌡️',
  'Smart TV': '📺', 'Outdoor dining area': '🌿', 'BBQ grill': '🍖',
  'Game room': '🎮', 'Fireplace': '🪵', 'Pool': '🏊', 'Sauna': '🧖',
  'Cold Plunge': '🧊', 'EV Charger': '⚡', 'Trail Access': '🥾',
  'World-Class Climbing Nearby': '🧗',
};

function initAmenities(amenities) {
  const grid = document.querySelector('.amenities-grid');
  if (!grid || !amenities?.length) return;
  grid.innerHTML = '';
  amenities.forEach(name => {
    const el = document.createElement('div');
    el.className = 'amenity';
    el.innerHTML = `<span class="amenity__icon" aria-hidden="true">${AMENITY_ICONS[name] || '✓'}</span><span>${name}</span>`;
    grid.appendChild(el);
  });
}

// ── Location section ──────────────────────────────────
function initLocation(location) {
  if (!location) return;

  // Neighborhood name
  const nameEls = document.querySelectorAll('.location-neighborhood-name');
  if (location.neighborhood) nameEls.forEach(el => el.textContent = location.neighborhood);

  // Map
  const mapEl = document.getElementById('location-map');
  if (mapEl) {
    if (location.mapsEmbed) {
      // Custom embed code
      mapEl.innerHTML = location.mapsEmbed;
    } else if (location.pinLat && location.pinLng) {
      const src = `https://maps.google.com/maps?q=${location.pinLat},${location.pinLng}&z=13&output=embed`;
      mapEl.innerHTML = `<iframe src="${src}" width="100%" height="100%" style="border:0; border-radius: var(--radius);" loading="lazy" title="Property location"></iframe>`;
    } else {
      mapEl.innerHTML = `<div class="map-placeholder"><span>📍</span> ${location.neighborhood || 'Location'}</div>`;
    }
  }

  // Neighborhood description
  const nbhoodCard = document.getElementById('loc-neighborhood');
  const nbhoodDesc = document.querySelector('.location-neighborhood-desc');
  if ((location.neighborhoodDescription || location.neighborhoodDesc) && nbhoodCard && nbhoodDesc) {
    nbhoodDesc.textContent = location.neighborhoodDescription || location.neighborhoodDesc;
    nbhoodCard.style.display = '';
  }

  // Directions
  const dirCard = document.getElementById('loc-directions');
  const dirEl   = document.querySelector('.location-directions');
  if (location.directions && dirCard && dirEl) {
    dirEl.textContent = location.directions;
    dirCard.style.display = '';
  }

  // Getting around
  const aroundCard = document.getElementById('loc-around');
  const aroundEl   = document.querySelector('.location-around');
  if (location.gettingAround && aroundCard && aroundEl) {
    aroundEl.textContent = location.gettingAround;
    aroundCard.style.display = '';
  }
}

// ── House Rules Modal ─────────────────────────────────
function initHouseRules(houseRules, cancellationPolicy) {
  const haRules  = houseRules?.length > 0;
  const hasCancel= !!cancellationPolicy;
  if (!haRules && !hasCancel) return;

  // Show trigger button
  const summary = document.getElementById('rules-summary');
  if (summary) summary.style.display = '';

  // Populate modal
  const rulesList = document.getElementById('rules-list');
  if (rulesList && houseRules?.length) {
    houseRules.forEach(rule => {
      const li = document.createElement('li');
      li.className = 'rules-list__item';
      li.textContent = rule;
      rulesList.appendChild(li);
    });
  }

  if (hasCancel) {
    const cancelSection = document.getElementById('cancellation-section');
    const cancelText    = document.getElementById('cancellation-text');
    if (cancelSection && cancelText) {
      cancelText.textContent = cancellationPolicy;
      cancelSection.style.display = '';
    }
  }

  // Modal open/close
  const modal    = document.getElementById('rules-modal');
  const trigger  = document.getElementById('rules-trigger');
  const closeBtn = document.getElementById('rules-modal-close');

  function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    trigger?.focus();
  }

  trigger?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display !== 'none') closeModal(); });
}

// ── Sticky nav ────────────────────────────────────────
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

// ── Smooth scroll links ───────────────────────────────
function initNavLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(el => {
    el.addEventListener('click', e => {
      const target = document.querySelector(el.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// ── SEO meta tags ─────────────────────────────────────
function updateSEO(name, description, propertyType, location) {
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

    // Resolve: admin content overrides Hospitable where set
    const name        = c.heroHeadline  || h.name        || p.name        || 'Our Retreat';
    const description = c.heroSubtitle  || h.summary     || h.description || '';
    const aboutTitle  = c.aboutTitle    || '';
    const aboutBody   = c.aboutBody     || h.description || description;
    const bedrooms    = p.bedrooms      || h.bedrooms    || '—';
    const bathrooms   = p.bathrooms     || h.bathrooms   || '—';
    const maxGuests   = p.maxGuests     || h.maxGuests   || '—';
    const amenities   = h.amenities     || [];
    const photos      = h.photos        || [];
    const location    = data.property?.location || null;
    const houseRules        = h.houseRules        || [];
    const cancellationPolicy= h.cancellationPolicy || null;
    const heroPhoto   = c.heroPhoto     || null;

    // Apply branding overrides
    if (p.branding) {
      const r = document.documentElement.style;
      if (p.branding.primaryColor) r.setProperty('--color-primary', p.branding.primaryColor);
      if (p.branding.accentColor)  r.setProperty('--color-accent',  p.branding.accentColor);
    }

    // Update SEO
    updateSEO(name, aboutBody, h.propertyType, location);

    // Populate content
    document.querySelectorAll('.property-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.property-description').forEach(el => el.textContent = description);

    const aboutTitleEl = document.querySelector('.about-title');
    if (aboutTitleEl && aboutTitle) aboutTitleEl.textContent = aboutTitle;

    const aboutBodyEl = document.querySelector('.about-body');
    if (aboutBodyEl) aboutBodyEl.textContent = aboutBody;

    // Stats
    const setMeta = (sel, val) => { document.querySelectorAll(sel).forEach(el => el.textContent = val); };
    setMeta('.stat-bedrooms',  bedrooms);
    setMeta('.stat-bathrooms', bathrooms);
    setMeta('.stat-guests',    maxGuests);
    setMeta('.stat-type',      h.propertyType || 'Entire home');

    // Hero photo (if admin set one, use as first slide)
    const heroPhotos = heroPhoto ? [{ url: heroPhoto, caption: name }, ...photos] : photos;

    initGallery(heroPhotos);
    initPhotoGrid(photos);
    initAmenities(amenities);
    initLocation(location);
    initHouseRules(houseRules, cancellationPolicy);

  } catch (err) {
    console.error('Failed to load property:', err);
    showToast('Could not load property information. Please refresh.', 'error');
  }
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initNavLinks();
  loadProperty();
});
