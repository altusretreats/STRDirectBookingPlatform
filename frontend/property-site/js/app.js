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
  const slidesEl = document.querySelector('.slides');
  const dotsEl   = document.querySelector('.dots');
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
function initHeroPills(landingPills) {
  const pillsEl = document.querySelector('.hero__pills');
  if (!pillsEl) return;

  const picks = (landingPills || []).filter(Boolean).slice(0, 6);
  if (!picks.length) return;

  picks.forEach(text => {
    const pill = document.createElement('span');
    pill.className = 'hero__pill';
    pill.textContent = text;
    pillsEl.appendChild(pill);
  });
}

// ── Amenity icon map ──────────────────────────────────
const AMENITY_ICONS = {
  'Wifi': '📶', 'WiFi': '📶', 'Full kitchen': '🍳', 'Free parking': '🅿️',
  'Hot Tub': '♨️', 'Hot tub': '♨️', 'Fire pit': '🔥', 'Fire Pit': '🔥',
  'Washer/dryer': '👕', 'Air conditioning': '❄️', 'Heating': '🌡️',
  'Smart TV': '📺', 'Outdoor dining area': '🌿', 'BBQ grill': '🍖',
  'Game room': '🎮', 'Fireplace': '🪵', 'Pool': '🏊', 'Sauna': '🧖',
  'Cold Plunge': '🧊', 'EV Charger': '⚡', 'EV charger': '⚡',
  'Trail Access': '🥾', 'Pet friendly': '🐾', 'Pet Friendly': '🐾',
  'Self check-in': '🔑', 'Kitchen': '🍳', 'Dishwasher': '🫧',
  'Washer': '👕', 'Dryer': '👕', 'BBQ utensils': '🍖',
  'Coffee maker': '☕', 'Coffee': '☕',
};

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

// ── Lightbox ──────────────────────────────────────────
let lightboxPhotos = [];
let lightboxIndex  = 0;

function openLightbox(photos, startIndex = 0) {
  lightboxPhotos = photos;
  lightboxIndex  = startIndex;
  updateLightboxImg();
  const lb = document.getElementById('lightbox');
  if (lb) { lb.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) { lb.style.display = 'none'; document.body.style.overflow = ''; }
}

function updateLightboxImg() {
  const photo = lightboxPhotos[lightboxIndex];
  if (!photo) return;
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (img) img.src = photo.url;
  if (cap) cap.textContent = photo.caption || '';
}

function initLightbox() {
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev')?.addEventListener('click', () => {
    lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    updateLightboxImg();
  });
  document.getElementById('lightbox-next')?.addEventListener('click', () => {
    lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
    updateLightboxImg();
  });
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    if (!lb || lb.style.display === 'none') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  { lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length; updateLightboxImg(); }
    if (e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length; updateLightboxImg(); }
  });
}

// ── Frame: populate sections ──────────────────────────
function initFrameSections({ photos, amenities, description, bedrooms, bathrooms, maxGuests, location, propertyName, hospLocation }) {

  // ── Photo grid: large main left + 2×2 sub right ──
  const photoGrid = document.getElementById('frame-photo-grid');
  if (photoGrid && photos?.length) {
    // main photo
    const mainPhoto = photos[0];
    const mainItem = document.createElement('div');
    mainItem.className = 'prop-photo-item prop-photo-item--main';
    const mainImg = document.createElement('img');
    mainImg.src = mainPhoto.url;
    mainImg.alt = mainPhoto.caption || '';
    mainItem.appendChild(mainImg);
    mainItem.addEventListener('click', () => openLightbox(photos, 0));
    photoGrid.appendChild(mainItem);

    // sub photos (slots 1-4 in the 2×2)
    const subPhotos = photos.slice(1, 5);
    subPhotos.forEach((photo, i) => {
      const item = document.createElement('div');
      item.className = 'prop-photo-item';

      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.caption || '';
      img.loading = 'lazy';
      item.appendChild(img);

      // "+N more" overlay on last sub slot if extras exist
      const isLast = i === subPhotos.length - 1;
      const remaining = photos.length - 5;
      if (isLast && remaining > 0) {
        const more = document.createElement('div');
        more.className = 'prop-photo-item__more';
        more.textContent = `+${remaining} more`;
        item.appendChild(more);
      }

      item.addEventListener('click', () => openLightbox(photos, i + 1));
      photoGrid.appendChild(item);
    });
  }

  // ── Property header ──
  const locEl = document.getElementById('frame-prop-location');
  if (locEl && location?.neighborhood) locEl.textContent = location.neighborhood;

  const nameEl = document.getElementById('frame-prop-name');
  if (nameEl && propertyName) nameEl.textContent = propertyName;

  // Stats row: "2 bedrooms · 2 bathrooms · 4 guests"
  const statsEl = document.getElementById('frame-prop-stats-row');
  if (statsEl) {
    const parts = [];
    if (bedrooms && bedrooms !== '—') parts.push(`${bedrooms} bedroom${bedrooms !== 1 ? 's' : ''}`);
    if (bathrooms && bathrooms !== '—') parts.push(`${bathrooms} bathroom${bathrooms !== 1 ? 's' : ''}`);
    if (maxGuests && maxGuests !== '—') parts.push(`${maxGuests} guests`);
    statsEl.innerHTML = parts.map((p, i) =>
      i === 0 ? p : `<span class="sep"></span>${p}`
    ).join('');
  }

  // ── Description with Read more toggle ──
  const descEl = document.getElementById('frame-prop-desc');
  const readMoreBtn = document.getElementById('frame-read-more');
  if (descEl && description) {
    descEl.textContent = description;
    // Show "Show more" button only if text is actually clamped
    requestAnimationFrame(() => {
      if (descEl.scrollHeight > descEl.clientHeight + 2) {
        if (readMoreBtn) readMoreBtn.style.display = '';
      }
    });
  }
  if (readMoreBtn) {
    readMoreBtn.addEventListener('click', () => {
      const expanded = descEl.classList.toggle('is-expanded');
      readMoreBtn.textContent = expanded ? 'Show less' : 'Show more';
    });
  }

  // ── Amenities: 2-column grid with icons ──
  const amenEl = document.getElementById('frame-amenities');
  if (amenEl && amenities?.length) {
    amenities.forEach(a => {
      const name = typeof a === 'string' ? a : (a.name || String(a));
      const item = document.createElement('div');
      item.className = 'prop-amenity-item';
      const icon = AMENITY_ICONS[name] || '✓';
      item.innerHTML = `<span class="prop-amenity-icon">${icon}</span><span>${escapeHtml(name)}</span>`;
      amenEl.appendChild(item);
    });
  }

  // ── Location (Section 3) ──
  if (location) {
    const neighEl = document.querySelector('.frame-location-neighborhood');
    if (neighEl && location.neighborhood) neighEl.textContent = location.neighborhood;

    const descLocEl = document.querySelector('.frame-location-desc');
    if (descLocEl && (location.neighborhoodDescription || location.neighborhoodDesc)) {
      descLocEl.textContent = location.neighborhoodDescription || location.neighborhoodDesc;
    }

    const dirEl = document.querySelector('.frame-location-directions');
    if (dirEl && location.directions) dirEl.textContent = location.directions;

    const mapEl = document.getElementById('frame-location-map');
    if (mapEl) {
      if (location.mapsEmbed) {
        mapEl.innerHTML = location.mapsEmbed;
      } else if (location.pinLat && location.pinLng) {
        const src = `https://maps.google.com/maps?q=${location.pinLat},${location.pinLng}&z=13&output=embed`;
        mapEl.innerHTML = `<iframe src="${src}" width="100%" height="100%" style="border:0;border-radius:10px;" loading="lazy" title="Property location"></iframe>`;
      } else if (location.neighborhood) {
        mapEl.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,0.4);font-size:13px;">📍 ${location.neighborhood}</div>`;
      }
    }

    const mapLink = document.getElementById('frame-map-link');
    if (mapLink && location.pinLat && location.pinLng) {
      mapLink.href = `https://www.google.com/maps?q=${location.pinLat},${location.pinLng}`;
      mapLink.style.display = '';
    }
  }
}

// ── Snap-scroll nav ────────────────────────────────────
function initFrameNav() {
  const frameScroll  = document.getElementById('frame-scroll');
  const frameBorder  = document.getElementById('frame-border');
  const heroContent  = document.getElementById('hero-content');
  if (!frameScroll) return;

  const sections = {
    property: document.getElementById('frame-section-property'),
    reviews:  document.getElementById('frame-section-reviews'),
    location: document.getElementById('frame-section-location'),
    promise:  document.getElementById('frame-section-promise'),
  };

  const landingSection = document.getElementById('frame-section-landing');
  const allTriggers    = document.querySelectorAll('[data-section]');

  // Scroll helper: use the frame-scroll container (not window scroll)
  function scrollToSection(id) {
    const target = sections[id];
    if (!target) return;
    frameScroll.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
  }

  // Nav section buttons
  allTriggers.forEach(btn => {
    btn.addEventListener('click', () => scrollToSection(btn.dataset.section));
  });

  // "Book Now" button → scroll to The Property
  const bookBtn = document.getElementById('btn-book-now');
  if (bookBtn) {
    bookBtn.addEventListener('click', () => scrollToSection('property'));
  }

  // IntersectionObserver: when landing section leaves view →
  //   fade hero headline, reveal widget, mark first section active
  if (landingSection) {
    const landingObs = new IntersectionObserver(entries => {
      const landingVisible = entries[0].isIntersecting;
      // Fade hero headline/pills
      heroContent?.classList.toggle('frame-scrolled', !landingVisible);
      // Show/hide widget column
      frameBorder?.classList.toggle('frame-landing', landingVisible);
      // Clear active nav when back on landing
      if (landingVisible) {
        allTriggers.forEach(btn => btn.classList.remove('nav__link--active'));
      }
    }, { root: frameScroll, threshold: 0.3 });
    landingObs.observe(landingSection);
  }

  // IntersectionObserver: update active nav link as content sections scroll
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id.replace('frame-section-', '');
        allTriggers.forEach(btn => {
          btn.classList.toggle('nav__link--active', btn.dataset.section === id);
        });
      }
    });
  }, { root: frameScroll, threshold: 0.5 });

  Object.values(sections).forEach(el => { if (el) sectionObs.observe(el); });
}

// ── Fetch + render reviews ────────────────────────────
async function loadReviews() {
  const container = document.getElementById('frame-reviews');
  const ratingSummary = document.getElementById('frame-rating-summary');
  if (!container) return;

  try {
    const data = await api.getReviews();
    const reviews = data.reviews || data || [];

    // Rating summary
    if (data.averageRating || data.average_rating) {
      const rating = data.averageRating || data.average_rating;
      const count  = data.totalReviews || data.total_reviews || reviews.length;
      const numEl  = document.getElementById('frame-rating-num');
      const cntEl  = document.getElementById('frame-rating-count');
      if (numEl) numEl.textContent = parseFloat(rating).toFixed(1);
      if (cntEl) cntEl.textContent = count > 0 ? `· ${count} review${count === 1 ? '' : 's'}` : '';
      if (ratingSummary) ratingSummary.style.display = '';
    }

    if (!reviews.length) {
      container.innerHTML = '<p class="frame-reviews__empty">Reviews coming soon.</p>';
      return;
    }

    container.innerHTML = '';
    reviews.forEach(r => {
      const card = document.createElement('div');
      card.className = 'frame-review-card';

      const stars = '★'.repeat(Math.round(r.rating || 5));
      const date  = r.created_at || r.date
        ? new Date(r.created_at || r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '';

      card.innerHTML = `
        <div class="frame-review-card__header">
          <span class="frame-review-card__name">${escapeHtml(r.reviewer_name || r.name || 'Guest')}</span>
          <span class="frame-review-card__stars">${stars}</span>
          ${date ? `<span class="frame-review-card__date">${date}</span>` : ''}
        </div>
        <p class="frame-review-card__body">${escapeHtml(r.public_review || r.comment || r.body || '')}</p>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.warn('Reviews not available:', err.message);
    container.innerHTML = '<p class="frame-reviews__empty">Reviews coming soon.</p>';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── House Rules ───────────────────────────────────────
function initHouseRules(houseRules, cancellationPolicy) {
  if (!houseRules?.length && !cancellationPolicy) return;

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
  const closeBtn = document.getElementById('rules-modal-close');
  const closeModal = () => { modal.style.display = 'none'; document.body.style.overflow = ''; };
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
}

// ── Property data ─────────────────────────────────────
async function loadProperty() {
  try {
    const data = await api.getProperty();
    const h = data.hospitable || {};
    const p = data.property   || {};
    const c = p.content       || {};

    const name        = c.heroHeadline || h.name || p.name || 'Our Retreat';
    const heroSubtitleText = c.heroSubtitle || '';
    const description = c.aboutBody || h.description || h.summary || '';
    const bedrooms    = p.bedrooms  || h.bedrooms  || '—';
    const bathrooms   = p.bathrooms || h.bathrooms || '—';
    const maxGuests   = p.maxGuests || h.maxGuests || '—';
    const amenities   = h.amenities || [];
    const photos      = h.photos    || [];
    const location    = p.location  || null;
    const houseRules         = h.houseRules         || [];
    const cancellationPolicy = h.cancellationPolicy || null;
    const heroPhoto   = c.heroPhoto || null;

    // Hero rating
    const heroRating      = c.heroRating      || null;
    const heroReviewCount = c.heroReviewCount || null;
    const ratingEl = document.querySelector('.hero__rating');
    if (ratingEl && heroRating) {
      document.querySelector('.rating-number').textContent = heroRating;
      document.querySelector('.rating-count').textContent  = heroReviewCount || '';
      ratingEl.style.display = '';
    }

    // Hero title fields
    const heroEyebrow     = c.heroEyebrow     || null;
    const heroTitleLine1  = c.heroTitleLine1  || null;
    const heroAccentWord  = c.heroAccentWord  || null;
    const heroTitleSuffix = c.heroTitleSuffix || null;
    const heroLandingPills = c.heroLandingPills || [];

    // Branding
    if (p.branding) {
      const r = document.documentElement.style;
      if (p.branding.primaryColor) r.setProperty('--color-primary', p.branding.primaryColor);
      if (p.branding.accentColor)  r.setProperty('--color-accent',  p.branding.accentColor);
    }
    if (c.heroAccentColor) {
      document.documentElement.style.setProperty('--color-accent', c.heroAccentColor);
    }

    updateSEO(name, description);

    // Hero title
    const titleMain   = document.querySelector('.hero__title-main');
    const titleAccent = document.querySelector('.hero__title-accent');
    const titleDim    = document.querySelector('.hero__title-dim');
    const eyebrowEl   = document.querySelector('.hero__eyebrow');
    const subtitleEl  = document.querySelector('.hero__subtitle');

    if (titleMain)   { titleMain.textContent   = heroTitleLine1  || ''; titleMain.style.display   = heroTitleLine1  ? '' : 'none'; }
    if (titleAccent) { titleAccent.textContent = heroAccentWord  || ''; titleAccent.style.display = heroAccentWord  ? '' : 'none'; }
    if (titleDim)    { titleDim.textContent    = heroTitleSuffix || ''; titleDim.style.display    = heroTitleSuffix ? '' : 'none'; }
    if (eyebrowEl && heroEyebrow) eyebrowEl.textContent = heroEyebrow;
    if (subtitleEl) {
      subtitleEl.textContent = heroSubtitleText;
      subtitleEl.style.display = heroSubtitleText ? '' : 'none';
    }

    // Property name in nav logo
    document.querySelectorAll('.property-name').forEach(el => el.textContent = name);

    // Also set hidden stat elements (used by house rules modal, etc.)
    const setMeta = (sel, val) => document.querySelectorAll(sel).forEach(el => el.textContent = val);
    setMeta('.stat-bedrooms',  bedrooms);
    setMeta('.stat-bathrooms', bathrooms);
    setMeta('.stat-guests',    maxGuests);
    setMeta('.stat-type',      h.propertyType || 'Entire home');

    // Hero slider photos
    const heroSliderPhotos = (c.heroSliderPhotos || []).filter(Boolean).map(url => ({ url }));
    let heroPhotos;
    if (heroSliderPhotos.length) {
      heroPhotos = heroSliderPhotos;
    } else if (heroPhoto) {
      heroPhotos = [{ url: heroPhoto, caption: name }, ...photos];
    } else {
      heroPhotos = photos;
    }

    initGallery(heroPhotos);
    initHeroPills(heroLandingPills);
    initHouseRules(houseRules, cancellationPolicy);

    // Frame sections
    initFrameSections({ photos, amenities, description, bedrooms, bathrooms, maxGuests, location, propertyName: name });
    initFrameNav();

    // Reviews (async, non-blocking) — uses config propertyId via api.getReviews()
    loadReviews();

  } catch (err) {
    console.error('Failed to load property:', err);
    showToast('Could not load property information. Please refresh.', 'error');
  }
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLightbox();
  loadProperty();
});
