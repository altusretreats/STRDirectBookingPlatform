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
    dot.setAttribute('aria-label', photo.caption || `Photo ${i+1}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer?.appendChild(dot);
  });

  let current = 0;
  function goToSlide(idx) {
    hero.querySelectorAll('.hero__slide')[current]?.classList.remove('active');
    dotsContainer?.querySelectorAll('.hero__dot')[current]?.classList.remove('active');
    current = idx;
    hero.querySelectorAll('.hero__slide')[current]?.classList.add('active');
    dotsContainer?.querySelectorAll('.hero__dot')[current]?.classList.add('active');
  }

  // Auto-advance every 5s
  setInterval(() => goToSlide((current + 1) % photos.length), 5000);
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
  'WiFi': '📶', 'Full kitchen': '🍳', 'Free parking': '🅿️', 'Hot tub': '♨️',
  'Fire pit': '🔥', 'Washer/dryer': '👕', 'Air conditioning': '❄️', 'Heating': '🌡️',
  'Smart TV': '📺', 'Outdoor dining area': '🌿', 'BBQ grill': '🍖', 'Game room': '🎮',
  'Fireplace': '🪵', 'Pool': '🏊',
};

function initAmenities(amenities) {
  const grid = document.querySelector('.amenities-grid');
  if (!grid || !amenities?.length) return;
  grid.innerHTML = '';
  amenities.forEach(name => {
    const el = document.createElement('div');
    el.className = 'amenity';
    el.innerHTML = `<span class="amenity__icon">${AMENITY_ICONS[name] || '✓'}</span><span>${name}</span>`;
    grid.appendChild(el);
  });
}

// ── Sticky nav ────────────────────────────────────────
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

// ── Smooth scroll CTA ─────────────────────────────────
function initCTAs() {
  document.querySelectorAll('[data-scroll]').forEach(el => {
    el.addEventListener('click', () => {
      const target = document.querySelector(el.dataset.scroll);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Booking bar quick-search
  const checkBtn = document.getElementById('check-availability-btn');
  if (checkBtn) {
    checkBtn.addEventListener('click', () => {
      const checkIn  = document.getElementById('bar-checkin')?.value;
      const checkOut = document.getElementById('bar-checkout')?.value;
      if (checkIn && checkOut) {
        booking.onDatesSelected({ checkIn, checkOut });
      }
      document.querySelector('#section-dates')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Step navigation
  document.getElementById('btn-to-details')?.addEventListener('click', () => booking.goToDetails());
  document.getElementById('btn-to-payment')?.addEventListener('click', () => booking.goToPayment());
  document.getElementById('btn-back-to-dates')?.addEventListener('click', () => {
    document.getElementById('section-dates').hidden = false;
    document.getElementById('section-details').hidden = true;
    document.getElementById('section-dates').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('btn-back-to-details')?.addEventListener('click', () => {
    document.getElementById('section-payment').hidden = true;
    document.getElementById('section-details').hidden = false;
    document.getElementById('section-details').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('pay-btn')?.addEventListener('click', () => booking.submitPayment());
}

// ── Property data ─────────────────────────────────────
async function loadProperty() {
  try {
    const data = await api.getProperty();
    const h = data.hospitable;
    const p = data.property;

    // Apply branding
    if (p.branding) {
      const r = document.documentElement.style;
      if (p.branding.primaryColor) r.setProperty('--color-primary', p.branding.primaryColor);
      if (p.branding.accentColor)  r.setProperty('--color-accent',  p.branding.accentColor);
    }

    // Populate content
    document.querySelectorAll('.property-name').forEach(el => el.textContent = h.name || p.name);
    document.title = `${h.name || p.name} — Direct Booking`;

    const descEl = document.querySelector('.property-description');
    if (descEl && h.description) descEl.textContent = h.description;

    // Stats
    const setMeta = (sel, val) => { const el = document.querySelector(sel); if(el) el.textContent = val; };
    setMeta('.stat-bedrooms', h.bedrooms || '—');
    setMeta('.stat-bathrooms', h.bathrooms || '—');
    setMeta('.stat-guests', h.maxGuests || '—');
    setMeta('.stat-type', h.propertyType || 'Entire home');
    setMeta('#hero-checkin', h.checkInTime ? `Check-in: ${h.checkInTime}` : '');
    setMeta('#hero-checkout', h.checkOutTime ? `Check-out: ${h.checkOutTime}` : '');

    initGallery(h.photos || []);
    initPhotoGrid(h.photos || []);
    initAmenities(h.amenities || []);

    // Mount calendar
    const calEl = document.getElementById('availability-calendar');
    if (calEl) {
      new AvailabilityCalendar(calEl, {
        minStay: h.minimumStay || 2,
        onSelect: ({ checkIn, checkOut }) => {
          booking.onDatesSelected({ checkIn, checkOut });
          // Sync booking bar inputs
          const ci = document.getElementById('bar-checkin');
          const co = document.getElementById('bar-checkout');
          if (ci) ci.value = checkIn;
          if (co) co.value = checkOut;
        },
      });
    }

  } catch (err) {
    console.error('Failed to load property:', err);
    showToast('Could not load property information. Please refresh.', 'error');
  }
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCTAs();
  loadProperty();
});
