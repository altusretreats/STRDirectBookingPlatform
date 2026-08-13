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

// ── Branded Google map ──────────────────────────────────────
let googleMapsLoader;

function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (googleMapsLoader) return googleMapsLoader;

  const mapsConfig = window.ALTUS_MAPS_CONFIG || {};
  if (!mapsConfig.apiKey) return Promise.reject(new Error('Google Maps browser key is not configured.'));

  googleMapsLoader = new Promise((resolve, reject) => {
    const callbackName = `__altusMapsReady${Date.now()}`;
    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: mapsConfig.apiKey,
      v: 'weekly',
      loading: 'async',
      libraries: 'marker',
      callback: callbackName,
    });

    window[callbackName] = () => {
      let attempts = 0;
      const resolveWhenReady = () => {
        if (window.google?.maps?.importLibrary) {
          delete window[callbackName];
          resolve(window.google.maps);
          return;
        }
        if (attempts < 20) {
          attempts += 1;
          window.setTimeout(resolveWhenReady, 50);
          return;
        }
        delete window[callbackName];
        googleMapsLoader = null;
        reject(new Error('Google Maps initialized without its maps library.'));
      };
      resolveWhenReady();
    };
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      delete window[callbackName];
      googleMapsLoader = null;
      reject(new Error('Google Maps could not be loaded.'));
    };
    document.head.appendChild(script);
  });

  return googleMapsLoader;
}

function createPropertyMapMarker({ logoUrl, propertyName, iconOnly = false }) {
  const marker = document.createElement('div');
  marker.className = 'property-map-marker';
  marker.setAttribute('aria-label', propertyName);

  const art = document.createElement('span');
  art.className = `property-map-marker__art${iconOnly ? ' property-map-marker__art--icon' : ''}`;
  const logo = document.createElement('img');
  logo.src = logoUrl;
  logo.alt = '';
  art.appendChild(logo);

  const label = document.createElement('span');
  label.className = 'property-map-marker__label';
  label.textContent = propertyName;

  marker.append(art, label);
  return marker;
}

const PLACE_CATEGORY_META = {
  restaurant: { label: 'Eat & drink', singular: 'Restaurant' },
  attraction: { label: 'Attractions', singular: 'Attraction' },
  activity: { label: 'Things to do', singular: 'Activity' },
  shopping: { label: 'Shopping', singular: 'Shopping' },
  shop: { label: 'Shopping', singular: 'Shop' },
  services: { label: 'Services', singular: 'Service' },
  other: { label: 'Local favorites', singular: 'Local favorite' },
};

const PLACE_ICON_PATHS = {
  food: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 1 4 3.5 4 7h-4"/>',
  arch: '<path d="M3 20h4v-5a5 5 0 0 1 10 0v5h4"/><path d="M3 20C4 11 7 6 12 4c5 2 8 7 9 16"/>',
  climber: '<path d="M19 3v18M14 6l5-2M12 9l3 3M15 12l-2 5M15 12l3 3"/><circle cx="12" cy="6" r="1.5"/>',
  carabiner: '<path d="M8.7 3.2c4.8-1.8 9.4 1 10.4 5.6 1.1 5-1.6 10.2-6.2 11.8-4.1 1.4-8.3-.9-9.1-5-.5-2.7.4-5.4 2.6-7.2"/><rect x="4.8" y="6.5" width="5.2" height="7.1" rx="1" transform="rotate(-24 7.4 10)"/><path d="m6.2 8 3.1-1.4M7.9 12.8l3-1.4"/>',
  hiking: '<path d="M7 3v8l-3 4v4h16v-4l-7-1-2-4V3H7Z"/><path d="M8 7h4M8 10h4M5 16h14"/>',
  trail: '<path d="M5 18h4l-2-3h2L6 9l-3 6h2l-2 3h2v3M18 17h3l-2-3h2l-3-6-3 6h2l-2 3h3v4"/><path d="M10 21c0-5 5-6 5-10"/>',
  bridge: '<path d="M3 8c5 1 7-2 10-2s5 2 8 2v12h-4v-4a5 5 0 0 0-10 0v4H3V8Z"/><path d="M3 11h18"/>',
  paddle: '<path d="M3 15c4 4 14 4 18 0H3Z"/><path d="m7 4 10 16M5 3l4 2-2 3M19 21l-4-2 2-3"/>',
  offroad: '<path d="M4 16h16v-5l-3-4H8l-2 4H4v5ZM9 7v4h8M3 13h3M18 13h3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  shopping: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  services: '<path d="M5 3h9v18H5V3ZM7 6h5v4H7V6ZM14 8h3l2 3v7a2 2 0 0 1-4 0v-3"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
};

const DEFAULT_PLACE_ICONS = {
  restaurant: 'food',
  attraction: 'arch',
  activity: 'hiking',
  shopping: 'shopping',
  shop: 'shopping',
  services: 'services',
  other: 'pin',
};

function normalizePlaceCategory(place) {
  const category = String(place.category || '').toLowerCase();
  if (PLACE_CATEGORY_META[category]) return category;
  const types = (place.types || []).join(' ').toLowerCase();
  if (/restaurant|cafe|bakery|bar|food/.test(types)) return 'restaurant';
  if (/store|shopping|market/.test(types)) return 'shopping';
  if (/park|museum|tourist_attraction|landmark/.test(types)) return 'attraction';
  if (/activity|amusement|sports|trail|bridge/.test(types)) return 'activity';
  return 'other';
}

function extractGuidebookPlaces(guidebook) {
  const seen = new Set();
  return (guidebook?.sections || []).flatMap(section => (section.items || []).map(item => ({ section, item })))
    .filter(({ item }) => item.type === 'place' && item.place)
    .map(({ section, item }) => {
      const place = item.place;
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      const key = place.placeId || item.itemId || `${lat},${lng}`;
      return {
        ...place,
        key,
        lat,
        lng,
        category: normalizePlaceCategory(place),
        description: item.description || '',
        sectionTitle: section.title || '',
      };
    })
    .filter(place => {
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng) || seen.has(place.key)) return false;
      seen.add(place.key);
      return true;
    });
}

function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function placeMarkerIcon(place) {
  const requestedIcon = String(place?.mapIcon || '');
  const icon = PLACE_ICON_PATHS[requestedIcon]
    ? requestedIcon
    : (DEFAULT_PLACE_ICONS[place?.category] || 'pin');
  return `<svg class="place-marker-icon place-marker-icon--${icon}" viewBox="0 0 24 24" aria-hidden="true">${PLACE_ICON_PATHS[icon]}</svg>`;
}

function createPlaceMarker(place) {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = `place-map-marker place-map-marker--${place.category}`;
  marker.setAttribute('aria-label', `Show ${place.name} on the map`);
  marker.innerHTML = placeMarkerIcon(place);
  return marker;
}

function createPlaceCard(place, onSelect) {
  const card = document.createElement('article');
  card.className = 'location-place-card';
  card.dataset.placeKey = place.key;

  const photoUrl = safeExternalUrl(place.photoUrl);
  const directionsUrl = safeExternalUrl(place.directionsUrl || place.mapsUrl);
  const meta = [
    Number.isFinite(Number(place.distanceMiles)) ? `${Number(place.distanceMiles).toFixed(1).replace('.0', '')} mi` : '',
    Number.isFinite(Number(place.travelMinutes)) ? `${Math.round(Number(place.travelMinutes))} min` : '',
  ].filter(Boolean).join(' · ');
  const rating = Number(place.rating);

  card.innerHTML = `
    ${photoUrl ? `<img class="location-place-card__photo" src="${escapeHtml(photoUrl)}" alt="" loading="lazy">` : `<div class="location-place-card__photo location-place-card__photo--empty">${placeMarkerIcon(place)}</div>`}
    <div class="location-place-card__body">
      <span class="location-place-card__category">${escapeHtml(PLACE_CATEGORY_META[place.category]?.singular || 'Local favorite')}</span>
      <h4>${escapeHtml(place.name || 'Nearby favorite')}</h4>
      <div class="location-place-card__facts">
        ${Number.isFinite(rating) ? `<span><strong>★ ${rating.toFixed(1)}</strong>${place.totalRatings ? ` <small>(${Number(place.totalRatings).toLocaleString()})</small>` : ''}</span>` : ''}
        ${meta ? `<span>${escapeHtml(meta)}</span>` : ''}
      </div>
      ${directionsUrl ? `<a href="${escapeHtml(directionsUrl)}" target="_blank" rel="noopener" aria-label="Directions to ${escapeHtml(place.name)}">Directions <span aria-hidden="true">↗</span></a>` : ''}
    </div>`;

  const select = event => {
    if (event.target.closest('a')) return;
    onSelect(place);
  };
  card.addEventListener('click', select);
  card.querySelector('h4')?.setAttribute('tabindex', '0');
  card.querySelector('h4')?.setAttribute('role', 'button');
  card.querySelector('h4')?.setAttribute('aria-label', `Show ${place.name} on the map`);
  card.querySelector('h4')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(place);
  });
  return card;
}

function createPlaceInfoContent(place) {
  const content = document.createElement('div');
  content.className = 'place-map-info';
  const category = document.createElement('span');
  category.className = 'place-map-info__category';
  category.textContent = PLACE_CATEGORY_META[place.category]?.singular || 'Local favorite';
  const title = document.createElement('strong');
  title.textContent = place.name;
  const facts = document.createElement('span');
  facts.textContent = [
    Number.isFinite(Number(place.rating)) ? `★ ${Number(place.rating).toFixed(1)}` : '',
    Number.isFinite(Number(place.distanceMiles)) ? `${Number(place.distanceMiles).toFixed(1).replace('.0', '')} miles` : '',
    Number.isFinite(Number(place.travelMinutes)) ? `${Math.round(Number(place.travelMinutes))} min drive` : '',
  ].filter(Boolean).join(' · ');
  content.append(category, title, facts);

  const directionsUrl = safeExternalUrl(place.directionsUrl || place.mapsUrl);
  if (directionsUrl) {
    const link = document.createElement('a');
    link.href = directionsUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Get directions ↗';
    content.appendChild(link);
  }
  return content;
}

function setMapFallback(mapEl, location) {
  if (location.mapsEmbed) {
    mapEl.innerHTML = location.mapsEmbed;
    return;
  }

  const src = `https://maps.google.com/maps?q=${location.pinLat},${location.pinLng}&z=13&output=embed`;
  mapEl.innerHTML = `<iframe src="${src}" width="100%" height="100%" style="border:0" loading="lazy" title="Property location"></iframe>`;
}

function initPropertyMap({ mapEl, location, propertyName, places = [] }) {
  const lat = Number(location.pinLat);
  const lng = Number(location.pinLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const mapsConfig = window.ALTUS_MAPS_CONFIG || {};
  if (!mapsConfig.apiKey || !mapsConfig.mapId) {
    setMapFallback(mapEl, location);
    return;
  }

  const filterBar = document.getElementById('location-filter-bar');
  const cardsEl = document.getElementById('location-place-cards');
  const placesHeading = document.getElementById('location-places-heading');
  const viewAllButton = document.getElementById('location-view-all');
  const placesModal = document.getElementById('places-modal');
  const placesModalBody = document.getElementById('places-modal-body');
  const featuredPlaces = places.slice(0, 6);
  let activeCategory = 'all';
  let focusPlace = () => {};

  const visiblePlaces = () => places.filter(place => activeCategory === 'all' || place.category === activeCategory);
  const visibleFeaturedPlaces = () => featuredPlaces.filter(place => activeCategory === 'all' || place.category === activeCategory);

  const renderCards = () => {
    if (!cardsEl) return;
    cardsEl.replaceChildren(...visibleFeaturedPlaces().map(place => createPlaceCard(place, selected => focusPlace(selected))));
    cardsEl.hidden = visibleFeaturedPlaces().length === 0;
  };

  if (places.length) {
    if (placesHeading) placesHeading.hidden = false;
    const categories = [...new Set(places.map(place => place.category))];
    const filters = [{ key: 'all', label: 'All places' }, ...categories.map(key => ({ key, label: PLACE_CATEGORY_META[key]?.label || 'Local favorites' }))];
    filterBar?.replaceChildren(...filters.map(filter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `location-filter${filter.key === 'all' ? ' is-active' : ''}`;
      button.textContent = filter.label;
      button.dataset.category = filter.key;
      button.setAttribute('aria-pressed', String(filter.key === 'all'));
      button.addEventListener('click', () => {
        activeCategory = filter.key;
        filterBar.querySelectorAll('.location-filter').forEach(item => {
          const active = item.dataset.category === activeCategory;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        renderCards();
        focusPlace(null);
      });
      return button;
    }));
    renderCards();
  } else if (filterBar) {
    filterBar.hidden = true;
  }

  const closePlacesModal = () => {
    if (!placesModal) return;
    placesModal.style.display = 'none';
    document.body.style.overflow = '';
  };
  if (places.length > featuredPlaces.length && viewAllButton && placesModalBody) {
    viewAllButton.hidden = false;
    viewAllButton.textContent = `View all ${places.length} places`;
    placesModalBody.replaceChildren(...places.map(place => createPlaceCard(place, selected => {
      closePlacesModal();
      focusPlace(selected);
    })));
    viewAllButton.addEventListener('click', () => {
      placesModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      document.getElementById('places-modal-close')?.focus();
    });
    document.getElementById('places-modal-close')?.addEventListener('click', closePlacesModal);
    placesModal?.addEventListener('click', event => { if (event.target === placesModal) closePlacesModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && placesModal?.style.display !== 'none') closePlacesModal(); });
  }

  mapEl.innerHTML = `
    <div class="property-map-loading" role="status">
      <span class="property-map-loading__pulse" aria-hidden="true"></span>
      <span>Loading the neighborhood map…</span>
    </div>`;

  let initialized = false;
  const initialize = async () => {
    if (initialized) return;
    initialized = true;

    try {
      await loadGoogleMaps();
      const [{ Map, InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
      ]);

      mapEl.replaceChildren();
      const map = new Map(mapEl, {
        center: { lat, lng },
        zoom: 14,
        mapId: mapsConfig.mapId,
        tilt: 0,
        heading: 0,
        clickableIcons: false,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        keyboardShortcuts: false,
      });

      let wheelZoomActive = false;
      let wheelZoomTimer;
      let wheelRecenterTimers = [];
      const propertyPosition = { lat, lng };
      const recenterWheelZoom = () => map.setCenter(propertyPosition);
      mapEl.addEventListener('wheel', () => {
        wheelZoomActive = true;
        window.clearTimeout(wheelZoomTimer);
        wheelRecenterTimers.forEach(timer => window.clearTimeout(timer));
        recenterWheelZoom();
        wheelRecenterTimers = [60, 160, 320, 600].map(delay => window.setTimeout(recenterWheelZoom, delay));
        wheelZoomTimer = window.setTimeout(() => {
          recenterWheelZoom();
          wheelZoomActive = false;
          wheelRecenterTimers = [];
        }, 720);
      }, { capture: true, passive: true });
      map.addListener('zoom_changed', () => {
        if (wheelZoomActive) recenterWheelZoom();
      });
      map.addListener('idle', () => {
        if (wheelZoomActive) recenterWheelZoom();
      });

      const dedicatedLogoUrl = safeExternalUrl(mapsConfig.markerLogoUrl);
      const logoUrl = dedicatedLogoUrl || document.querySelector('.nav__logo-img')?.getAttribute('src') || '';
      new AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: propertyName,
        content: createPropertyMapMarker({ logoUrl, propertyName, iconOnly: Boolean(dedicatedLogoUrl) }),
        zIndex: 10,
      });

      const infoWindow = new InfoWindow({ disableAutoPan: false });
      const placeMarkers = places.map(place => {
        const content = createPlaceMarker(place);
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: place.lat, lng: place.lng },
          title: place.name,
          content,
          gmpClickable: true,
          zIndex: 2,
        });
        content.addEventListener('click', () => focusPlace(place));
        return { place, marker, content };
      });

      const fitPlaces = () => {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat, lng });
        visiblePlaces().forEach(place => bounds.extend({ lat: place.lat, lng: place.lng }));
        map.fitBounds(bounds, { top: 76, right: 62, bottom: 62, left: 62 });
        google.maps.event.addListenerOnce(map, 'idle', () => {
          if ((map.getZoom() || 0) > 14) map.setZoom(14);
        });
      };

      focusPlace = selectedPlace => {
        const filtered = visiblePlaces();
        placeMarkers.forEach(entry => {
          const visible = filtered.some(place => place.key === entry.place.key);
          entry.marker.map = visible ? map : null;
          entry.content.classList.toggle('is-active', selectedPlace?.key === entry.place.key);
        });
        document.querySelectorAll('.location-place-card').forEach(card => card.classList.toggle('is-active', card.dataset.placeKey === selectedPlace?.key));

        if (!selectedPlace) {
          infoWindow.close();
          fitPlaces();
          return;
        }
        const entry = placeMarkers.find(item => item.place.key === selectedPlace.key);
        if (!entry) return;
        map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
        if ((map.getZoom() || 0) < 14) map.setZoom(14);
        infoWindow.setContent(createPlaceInfoContent(selectedPlace));
        infoWindow.open({ map, anchor: entry.marker });
      };

      focusPlace(null);
    } catch (error) {
      console.warn('Branded property map unavailable; using the embed fallback.', error);
      setMapFallback(mapEl, location);
    }
  };

  if (!('IntersectionObserver' in window)) {
    initialize();
    return;
  }

  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    initialize();
  }, { rootMargin: '600px 0px' });
  observer.observe(mapEl);
}

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

  let paused = false;
  function startTimer() { clearInterval(timer); timer = setInterval(() => { if (!paused) goToSlide(current + 1); }, 5000); }
  startTimer();

  slidesEl.addEventListener('mouseenter', () => clearInterval(timer));
  slidesEl.addEventListener('mouseleave', startTimer);

  // Expose freeze/resume so the scroll handler can pause cycling in "site" mode
  window.__heroGallery = {
    pause()  { paused = true;  },
    resume() { paused = false; },
  };
}

// ── Hero editorial statement ───────────────────────────
function initHeroStatement(statement) {
  const statementEl = document.querySelector('.hero__statement');
  if (!statementEl) return;
  statementEl.textContent = statement;
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
const AMENITY_GROUPS = [
  { key: 'standout', title: 'Standout features', pattern: /hot tub|fire pit|outdoor|patio|balcony|deck|grill|bbq|view|pool|sauna|plunge|trail|waterfront|lake/i },
  { key: 'comfort', title: 'Sleep & comfort', pattern: /bed|bedroom|linen|pillow|blanket|air conditioning|heating|fan|fireplace|blackout/i },
  { key: 'kitchen', title: 'Kitchen & dining', pattern: /kitchen|refrigerator|freezer|microwave|oven|stove|dishwasher|coffee|toaster|dining|dishes|cook|wine glass|kettle/i },
  { key: 'bath', title: 'Bath & essentials', pattern: /bath|shower|shampoo|conditioner|soap|hot water|towel|hair dryer|toilet|body wash/i },
  { key: 'connected', title: 'Entertainment & connectivity', pattern: /wifi|wi-fi|internet|tv|television|game|sound|speaker|workspace|ethernet|books/i },
  { key: 'safety', title: 'Family & safety', pattern: /smoke|carbon|extinguisher|first aid|security|alarm|safe|children|crib|high chair|baby|pet/i },
  { key: 'access', title: 'Parking & access', pattern: /parking|entrance|check-in|keypad|lockbox|wheelchair|stairs|single level|ev charger/i },
  { key: 'essentials', title: 'Home essentials', pattern: /.*/i },
];

function amenityGroupIcon(key) {
  const paths = {
    standout: '<path d="m12 3 2.2 4.7 5.1.7-3.7 3.6.9 5.1-4.5-2.4-4.5 2.4.9-5.1-3.7-3.6 5.1-.7L12 3Z"/>',
    comfort: '<path d="M4 12V7.5M20 12V9.5A2.5 2.5 0 0 0 17.5 7H12v5M4 12h16v5H4v-5Zm2-5h4a2 2 0 0 1 2 2v3H4V9a2 2 0 0 1 2-2Z"/>',
    kitchen: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 1 4 3.5 4 7h-4"/>',
    bath: '<path d="M12 3s5 5.4 5 10a5 5 0 0 1-10 0c0-4.6 5-10 5-10Z"/>',
    connected: '<path d="M5 9a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 15a2 2 0 0 1 2 0M12 19h.01"/>',
    safety: '<path d="M12 3 5 6v5c0 4.8 2.9 8 7 10 4.1-2 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    access: '<path d="M4 15h16l-1.5-5h-13L4 15Zm2-5 2-4h8l2 4M7 15v3M17 15v3M7.5 13h.01M16.5 13h.01"/>',
    essentials: '<path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4v-9Z"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[key] || paths.essentials}</svg>`;
}

function groupAmenities(amenities) {
  const grouped = AMENITY_GROUPS.map(group => ({ ...group, items: [] }));
  amenities.forEach(amenity => {
    const name = typeof amenity === 'string' ? amenity : (amenity.name || String(amenity));
    const group = grouped.find(item => item.pattern.test(name)) || grouped[grouped.length - 1];
    group.items.push(name);
  });
  return grouped.filter(group => group.items.length);
}

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

// ── Photo viewer: gallery grid ("View all X photos") + single-photo lightbox ──
// Grid is the base view; the lightbox opens on top of it. Closing the
// lightbox returns to the grid (if it was open); closing the grid returns
// to the page.
let lightboxPhotos = [];
let lightboxIndex  = 0;

function openLightbox(photos, startIndex = 0) {
  lightboxPhotos = photos;
  lightboxIndex  = startIndex;
  const thumbs = document.getElementById('lightbox-thumbs');
  if (thumbs) {
    thumbs.innerHTML = '';
    photos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.className = 'lightbox__thumb';
      button.type = 'button';
      button.setAttribute('aria-label', `View photo ${index + 1}`);
      const image = document.createElement('img');
      image.src = photo.url;
      image.alt = '';
      image.loading = 'lazy';
      button.appendChild(image);
      button.addEventListener('click', () => {
        lightboxIndex = index;
        updateLightboxImg();
      });
      thumbs.appendChild(button);
    });
  }
  updateLightboxImg();
  const lb = document.getElementById('lightbox');
  if (lb) {
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('lightbox-close')?.focus();
  }
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.style.display = 'none';
  const gm = document.getElementById('gallery-modal');
  // Only restore page scroll if the grid isn't still open underneath
  if (!gm || gm.style.display === 'none') document.body.style.overflow = '';
}

function updateLightboxImg() {
  const photo = lightboxPhotos[lightboxIndex];
  if (!photo) return;
  const img   = document.getElementById('lightbox-img');
  const cap   = document.getElementById('lightbox-caption');
  const count = document.getElementById('lightbox-count');
  if (img) {
    img.src = photo.url;
    img.alt = photo.caption || `Property photo ${lightboxIndex + 1}`;
  }
  if (cap) cap.textContent = photo.caption || '';
  if (count) count.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  document.querySelectorAll('.lightbox__thumb').forEach((thumb, index) => {
    const active = index === lightboxIndex;
    thumb.classList.toggle('is-active', active);
    thumb.setAttribute('aria-current', active ? 'true' : 'false');
    if (active) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
}

function openGalleryModal() {
  const gm = document.getElementById('gallery-modal');
  if (gm) {
    gm.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('gallery-modal-close')?.focus();
  }
}

function closeGalleryModal() {
  document.getElementById('gallery-modal')?.style.setProperty('display', 'none');
  closeLightbox();
  document.body.style.overflow = '';
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

  document.getElementById('gallery-modal-close')?.addEventListener('click', closeGalleryModal);

  const lightboxImage = document.getElementById('lightbox-img');
  let touchStartX = 0;
  lightboxImage?.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0]?.clientX || 0;
  }, { passive: true });
  lightboxImage?.addEventListener('touchend', event => {
    const distance = (event.changedTouches[0]?.clientX || 0) - touchStartX;
    if (Math.abs(distance) < 45 || lightboxPhotos.length < 2) return;
    lightboxIndex = distance > 0
      ? (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length
      : (lightboxIndex + 1) % lightboxPhotos.length;
    updateLightboxImg();
  }, { passive: true });

  document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    const gm = document.getElementById('gallery-modal');
    const lbOpen = lb && lb.style.display !== 'none';
    const gmOpen = gm && gm.style.display !== 'none';
    if (!lbOpen && !gmOpen) return;
    if (e.key === 'Escape') { if (lbOpen) closeLightbox(); else closeGalleryModal(); }
    if (lbOpen && e.key === 'ArrowLeft')  { lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length; updateLightboxImg(); }
    if (lbOpen && e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length; updateLightboxImg(); }
  });
}

// ── Frame: populate sections ──────────────────────────
function initFrameSections({ photos, amenities, description, bedrooms, bathrooms, maxGuests, location, propertyName, places = [], content = {} }) {

  // ── Photo grid: large main left + 2×2 thumbnails right ──
  const photoGrid = document.getElementById('frame-photo-grid');
  if (photoGrid && photos?.length) {
    // Main photo (left column, spans both rows)
    const mainItem = document.createElement('button');
    mainItem.className = 'prop-photo-item prop-photo-item--main';
    mainItem.type = 'button';
    mainItem.setAttribute('aria-label', 'Open the first property photo');
    const mainImg = document.createElement('img');
    mainImg.src = photos[0].url;
    mainImg.alt = photos[0].caption || '';
    mainItem.appendChild(mainImg);
    const galleryTrigger = document.createElement('span');
    galleryTrigger.className = 'prop-photo__view-all prop-photo__view-all--main';
    galleryTrigger.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/></svg> View all ${photos.length} photos`;
    galleryTrigger.addEventListener('click', event => {
      event.stopPropagation();
      openGalleryModal();
    });
    mainItem.appendChild(galleryTrigger);
    mainItem.addEventListener('click', () => openLightbox(photos, 0));
    photoGrid.appendChild(mainItem);

    // 4 sub photos in 2×2 right columns (slots 1-4)
    const subPhotos = photos.slice(1, 5);
    subPhotos.forEach((photo, i) => {
      const item = document.createElement('button');
      item.className = 'prop-photo-item';
      item.type = 'button';
      item.setAttribute('aria-label', `Open property photo ${i + 2}`);

      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.caption || '';
      img.loading = 'lazy';
      item.appendChild(img);

      item.addEventListener('click', () => openLightbox(photos, i + 1));
      photoGrid.appendChild(item);
    });

    // Grid gallery modal — every photo, opened via "View all X photos"
    const galleryGrid = document.getElementById('gallery-modal-grid');
    if (galleryGrid) {
      galleryGrid.innerHTML = '';
      photos.forEach((photo, i) => {
        const item = document.createElement('button');
        item.className = 'gallery-modal__item';
        item.type = 'button';
        item.setAttribute('aria-label', `Open photo ${i + 1} of ${photos.length}`);
        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = photo.caption || '';
        img.loading = 'lazy';
        item.appendChild(img);
        const number = document.createElement('span');
        number.className = 'gallery-modal__number';
        number.textContent = String(i + 1).padStart(2, '0');
        item.appendChild(number);
        item.addEventListener('click', () => openLightbox(photos, i));
        galleryGrid.appendChild(item);
      });
    }
    const galleryTitle = document.getElementById('gallery-modal-title');
    if (galleryTitle && propertyName) galleryTitle.textContent = propertyName;
    const gallerySubtitle = document.getElementById('gallery-modal-subtitle');
    if (gallerySubtitle) gallerySubtitle.textContent = `${photos.length} photos · Select one to view full screen`;
  }

  // ── Property header ──
  const locEl = document.getElementById('frame-prop-location');
  if (locEl && location?.neighborhood) locEl.textContent = location.neighborhood;

  const nameEl = document.getElementById('frame-prop-name');
  if (nameEl && propertyName) nameEl.textContent = propertyName;

  const pageCopy = {
    'overview-kicker': content.overviewKicker,
    'overview-title': content.overviewTitle,
    'amenities-title': content.amenitiesTitle,
    'experience-kicker': content.experienceKicker,
    'experience-title': content.experienceTitle,
    'experience-primary-title': content.experiencePrimaryTitle,
    'experience-secondary-title': content.experienceSecondaryTitle,
    'reviews-kicker': content.reviewsKicker,
    'reviews-title': content.reviewsTitle,
    'location-kicker': content.locationKicker,
    'location-title': content.locationTitle,
    'promise-kicker': content.promiseKicker,
    'promise-title': content.promiseTitle,
    'promise-intro': content.promiseIntro,
  };
  Object.entries(pageCopy).forEach(([id, value]) => {
    if (value) document.getElementById(id)?.replaceChildren(document.createTextNode(value));
  });

  // Reuse the active site's logo rather than hardcoding a property-specific
  // asset into the editorial title lockup.
  const titleLogo = document.querySelector('.prop-title-logo');
  const navLogo = document.querySelector('.nav__logo-img');
  if (titleLogo && navLogo?.getAttribute('src')) {
    titleLogo.src = navLogo.getAttribute('src');
    titleLogo.hidden = false;
  }

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

  // Editorial facts — mirrors the same dynamic property data used above.
  const guestFact = document.getElementById('prop-fact-guests');
  const bedroomFact = document.getElementById('prop-fact-bedrooms');
  const bathroomFact = document.getElementById('prop-fact-bathrooms');
  if (guestFact) guestFact.textContent = maxGuests && maxGuests !== '—'
    ? `${maxGuests} guest${Number(maxGuests) === 1 ? '' : 's'}`
    : 'Private retreat';
  if (bedroomFact) bedroomFact.textContent = bedrooms && bedrooms !== '—'
    ? `${bedrooms} bedroom${Number(bedrooms) === 1 ? '' : 's'}`
    : 'Private bedrooms';
  if (bathroomFact) bathroomFact.textContent = bathrooms && bathrooms !== '—'
    ? `${bathrooms} bathroom${Number(bathrooms) === 1 ? '' : 's'}`
    : 'Private bathrooms';

  // Experience photography remains property-driven and falls back gracefully.
  const experiencePrimary = document.getElementById('experience-photo-primary');
  const experienceSecondary = document.getElementById('experience-photo-secondary');
  if (experiencePrimary && photos?.length) {
    const photo = photos[Math.min(2, photos.length - 1)];
    experiencePrimary.src = photo.url;
    experiencePrimary.alt = photo.caption || `${propertyName || 'Property'} experience`;
  }
  if (experienceSecondary && photos?.length) {
    const photo = photos[Math.min(4, photos.length - 1)];
    experienceSecondary.src = photo.url;
    experienceSecondary.alt = photo.caption || `${propertyName || 'Property'} interior`;
  }

  const amenityNames = (amenities || []).map(a =>
    String(typeof a === 'string' ? a : (a.name || '')).toLowerCase()
  );
  const outdoorHighlights = [];
  if (amenityNames.some(name => /jacuzzi|hot tub/.test(name))) outdoorHighlights.push('hot tub');
  if (amenityNames.some(name => /sauna/.test(name))) outdoorHighlights.push('sauna');
  if (amenityNames.some(name => /fire pit/.test(name))) outdoorHighlights.push('fire pit');
  const primaryCopy = document.getElementById('experience-copy-primary');
  if (primaryCopy) {
    primaryCopy.textContent = content.experiencePrimaryBody || (outdoorHighlights.length
      ? `${outdoorHighlights.slice(0, -1).join(', ')}${outdoorHighlights.length > 1 ? ' and ' : ''}${outdoorHighlights.slice(-1)} — ready when the day winds down.`
      : 'Thoughtful outdoor spaces made for slow evenings and unhurried mornings.');
  }
  const secondaryCopy = document.getElementById('experience-copy-secondary');
  if (secondaryCopy) secondaryCopy.textContent = content.experienceSecondaryBody || 'Comfortable private bedrooms designed for a restorative night away.';

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
    const groups = groupAmenities(amenities);
    groups.slice(0, 6).forEach(group => {
      const card = document.createElement('section');
      card.className = 'amenity-group-card';
      card.innerHTML = `
        <div class="amenity-group-card__heading">
          <span class="amenity-group-card__icon">${amenityGroupIcon(group.key)}</span>
          <h4>${escapeHtml(group.title)}</h4>
        </div>
        <ul>${group.items.slice(0, 3).map(name => `<li>${escapeHtml(name)}</li>`).join('')}</ul>
        ${group.items.length > 3 ? `<span class="amenity-group-card__more">+${group.items.length - 3} more</span>` : ''}
      `;
      amenEl.appendChild(card);
    });

    const modal = document.getElementById('amenities-modal');
    const modalGroups = document.getElementById('amenities-modal-groups');
    const amenitySearch = document.getElementById('amenities-search-input');
    const amenitySearchEmpty = document.getElementById('amenities-search-empty');
    if (modalGroups) {
      modalGroups.innerHTML = groups.map(group => `
        <section class="amenities-modal-group">
          <div class="amenity-group-card__heading">
            <span class="amenity-group-card__icon">${amenityGroupIcon(group.key)}</span>
            <h3>${escapeHtml(group.title)}</h3>
          </div>
          <ul>${group.items.map(name => `<li>${escapeHtml(name)}</li>`).join('')}</ul>
        </section>
      `).join('');
    }

    const toggle = document.createElement('button');
    toggle.className = 'amenities-toggle amenities-toggle--button';
    toggle.type = 'button';
    toggle.textContent = `Show all ${amenities.length} amenities`;
    amenEl.insertAdjacentElement('afterend', toggle);

    const closeModal = () => {
      if (!modal) return;
      modal.style.display = 'none';
      document.body.style.overflow = '';
      if (amenitySearch) {
        amenitySearch.value = '';
        amenitySearch.dispatchEvent(new Event('input'));
      }
      toggle.focus();
    };
    toggle.addEventListener('click', () => {
      if (!modal) return;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      amenitySearch?.focus();
    });
    amenitySearch?.addEventListener('input', () => {
      const query = amenitySearch.value.trim().toLocaleLowerCase();
      let visibleCount = 0;
      modalGroups?.querySelectorAll('.amenities-modal-group').forEach(group => {
        let groupMatches = 0;
        group.querySelectorAll('li').forEach(item => {
          const matches = !query || item.textContent.toLocaleLowerCase().includes(query);
          item.hidden = !matches;
          if (matches) groupMatches += 1;
        });
        group.hidden = groupMatches === 0;
        visibleCount += groupMatches;
      });
      if (amenitySearchEmpty) amenitySearchEmpty.hidden = visibleCount !== 0;
    });
    document.getElementById('amenities-modal-close')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal?.style.display !== 'none') closeModal();
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
      if (location.pinLat && location.pinLng) {
        initPropertyMap({ mapEl, location, propertyName, places });
      } else if (location.neighborhood) {
        mapEl.innerHTML = `<div class="property-map-empty">📍 ${escapeHtml(location.neighborhood)}</div>`;
      }
    }

    const mapLink = document.getElementById('frame-map-link');
    if (mapLink && location.pinLat && location.pinLng) {
      mapLink.href = `https://www.google.com/maps?q=${location.pinLat},${location.pinLng}`;
      mapLink.style.display = '';
    }
  }
}

function initEditorialDetails({ description, summary, bedrooms, maxGuests, houseRules }) {
  const sourceText = `${description || ''} ${summary || ''}`;
  const inferredGuests = maxGuests && maxGuests !== '—'
    ? maxGuests
    : (sourceText.match(/sleeps?\s+(\d+)/i)?.[1] || '—');

  const guestFact = document.getElementById('prop-fact-guests');
  if (guestFact && inferredGuests !== '—') {
    guestFact.textContent = `${inferredGuests} guest${Number(inferredGuests) === 1 ? '' : 's'}`;
  }

  const rulesText = (houseRules || []).map(rule =>
    typeof rule === 'string' ? rule : (rule.body || rule.rule || rule.text || rule.name || '')
  ).join(' ');
  const petFriendly = /pets? allowed|pet friendly/i.test(`${rulesText} ${sourceText}`);
  const petFact = document.getElementById('prop-fact-pets');
  if (petFact) petFact.hidden = !petFriendly;

  const bothKing = Number(bedrooms) === 2 && (
    /two\s+king\s+(?:beds?|bedrooms?)/i.test(sourceText) ||
    /2\s+bedrooms?\s*\(king beds?\)/i.test(sourceText) ||
    /both\s+(?:rooms?|bedrooms?)\s+(?:have|feature|include).*king/i.test(sourceText)
  );
  const kingCallout = document.getElementById('king-bed-callout');
  const bedFact = document.getElementById('prop-fact-beds');
  if (kingCallout) kingCallout.hidden = !bothKing;
  if (bedFact && bothKing) bedFact.textContent = 'King bed in each';
  const secondaryCopy = document.getElementById('experience-copy-secondary');
  if (secondaryCopy && bothKing) {
    secondaryCopy.textContent = 'Two private king bedrooms make recovery feel as good as the adventure.';
  }
}

function initScrollReveals() {
  const items = document.querySelectorAll('.reveal-on-scroll, .experience-card, .frame-review-card, .prop-photo-item');
  if (!items.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  items.forEach(item => observer.observe(item));
}

// ── Site scroll: frame→site transition, sticky nav, active link, gallery freeze ──
// Deliberately no scroll-linked math (no per-frame opacity/transform, no
// programmatic scrollTo while the user is scrolling) — that fought the
// browser's native scroll and caused jank in Chrome. Landing vs. site mode
// is one binary state, flipped by an IntersectionObserver on the landing
// section, with plain CSS transitions doing the fade.
function initSiteScroll() {
  const nav         = document.getElementById('site-nav');
  const heroContent = document.getElementById('hero-content');
  const heroBg      = document.querySelector('.bg');
  const frame       = document.querySelector('.frame');
  const landing     = document.querySelector('.site__landing');
  const logo        = document.querySelector('.nav__logo');
  const scrollCue   = document.querySelector('.scroll-down');
  const backToTop   = document.getElementById('back-to-top');
  const photoGrid   = document.getElementById('frame-photo-grid');
  const triggers    = document.querySelectorAll('[data-section]');

  const navSections = [
    { key: 'overview', target: document.getElementById('frame-photo-grid') },
    { key: 'amenities', target: document.getElementById('section-amenities') },
    { key: 'reviews', target: document.getElementById('section-reviews') },
    { key: 'location', target: document.getElementById('section-location') },
  ].filter(section => section.target);

  // Nav links → smooth-scroll to a precise point below the compact header.
  function scrollToSection(id) {
    // The overview begins with the photo story; the other links land on their
    // corresponding content heading below the compact header.
    const target = id === 'overview'
      ? document.getElementById('frame-photo-grid')
      : document.getElementById('section-' + id);
    if (target) {
      const headerClearance = window.matchMedia('(max-width: 900px)').matches ? 64 : 84;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - headerClearance;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  }
  triggers.forEach(btn => btn.addEventListener('click', () => scrollToSection(btn.dataset.section)));
  scrollCue?.addEventListener('click', () => scrollToSection('property'));
  backToTop?.addEventListener('click', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  document.getElementById('btn-book-now')?.addEventListener('click', () => {
    const widget = document.querySelector('.site__widget');
    if (!widget) {
      scrollToSection('overview');
      return;
    }

    const nav = document.getElementById('site-nav');
    const navClearance = (nav?.getBoundingClientRect().height || 0) + 16;
    const targetTop = window.scrollY + widget.getBoundingClientRect().top - navClearance;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // Logo → back to the landing page
  logo?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Landing vs. site mode — the background drifts subtly while the landing
  // elements ease away, then the compact property header takes over.
  let inSite = false;
  function setSiteMode(on) {
    if (on === inSite) return;
    inSite = on;
    nav?.classList.toggle('is-scrolled', on);
    frame?.classList.toggle('is-hidden', on);
    heroContent?.classList.toggle('is-hidden', on);
    if (on) window.__heroGallery?.pause();
    else    window.__heroGallery?.resume();
  }
  if (landing) {
    let scrollTicking = false;
    const updateLandingTransition = () => {
      const landingHeight = Math.max(landing.offsetHeight, window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, window.scrollY / landingHeight));
      document.documentElement.style.setProperty('--hero-progress', progress.toFixed(3));
      heroBg?.classList.toggle('is-transitioning', progress > 0 && progress < 1);
      const galleryHasPassed = photoGrid && photoGrid.getBoundingClientRect().bottom <= 84;
      backToTop?.classList.toggle('is-visible', Boolean(galleryHasPassed));
      setSiteMode(progress >= 0.78);
      scrollTicking = false;
    };
    const requestLandingUpdate = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(updateLandingTransition);
    };
    window.addEventListener('scroll', requestLandingUpdate, { passive: true });
    window.addEventListener('resize', requestLandingUpdate);
    updateLandingTransition();
  }

  // Active nav link — use ordered anchors so nested sections update correctly
  // in both scroll directions (the previous observer could leave Amenities active).
  let activeNavTicking = false;
  const updateActiveNav = () => {
    const activationLine = window.matchMedia('(max-width: 900px)').matches ? 86 : 112;
    let activeKey = null;
    navSections.forEach(section => {
      if (section.target.getBoundingClientRect().top <= activationLine) activeKey = section.key;
    });
    triggers.forEach(button => {
      button.classList.toggle('nav__link--active', button.dataset.section === activeKey);
    });
    activeNavTicking = false;
  };
  const requestActiveNavUpdate = () => {
    if (activeNavTicking) return;
    activeNavTicking = true;
    window.requestAnimationFrame(updateActiveNav);
  };
  window.addEventListener('scroll', requestActiveNavUpdate, { passive: true });
  window.addEventListener('resize', requestActiveNavUpdate);
  updateActiveNav();
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
      const reviewMeta = [r.source, date].filter(Boolean).join(' · ');

      card.innerHTML = `
        <div class="frame-review-card__header">
          <span class="frame-review-card__name">${escapeHtml(r.reviewer_name || r.name || 'Guest')}</span>
          <span class="frame-review-card__stars">${stars}</span>
          ${reviewMeta ? `<span class="frame-review-card__date">${escapeHtml(reviewMeta)}</span>` : ''}
        </div>
        <p class="frame-review-card__body">${escapeHtml(r.public_review || r.comment || r.body || '')}</p>
      `;
      container.appendChild(card);
    });

    initScrollReveals();

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
    const [data, guidebook] = await Promise.all([
      api.getProperty(),
      api.getGuidebook().catch(error => {
        console.warn('Guidebook places are not available for the location map.', error);
        return null;
      }),
    ]);
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
    const places      = extractGuidebookPlaces(guidebook);
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
    const heroLandingStatement = c.heroLandingStatement
      || 'Thoughtfully designed for slow mornings, memorable nights, and everything in between.';

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
    initHeroStatement(heroLandingStatement);
    initHouseRules(houseRules, cancellationPolicy);

    // Frame sections
    initFrameSections({ photos, amenities, description, bedrooms, bathrooms, maxGuests, location, propertyName: name, places, content: c });
    initEditorialDetails({
      description,
      summary: h.summary,
      bedrooms,
      maxGuests,
      houseRules
    });
    initSiteScroll();
    initScrollReveals();

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
