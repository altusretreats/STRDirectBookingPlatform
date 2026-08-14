/**
 * Responsive guest stay guide.
 * The guest UI consumes only published, guest-safe guidebook content.
 */

const GUIDE_CONFIG = {
  propertyId: new URLSearchParams(window.location.search).get('property') || 'kentucky',
  apiBase: window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev',
};

const JOURNEYS = {
  arriving: {
    label: 'Arrival guide',
    title: 'From the road to relaxed.',
    mobileTitle: 'Arriving at your retreat',
    context: 'Everything for a smooth arrival',
  },
  staying: {
    label: 'Home essentials',
    title: 'Settle in and switch off.',
    mobileTitle: 'Make yourself at home',
    context: 'Property essentials and how-tos',
  },
  eating: {
    label: 'Eat nearby',
    title: 'Good food, close by.',
    mobileTitle: 'Find something delicious',
    context: 'Restaurants and local favorites',
  },
  exploring: {
    label: 'Explore nearby',
    title: 'Make a day of it.',
    mobileTitle: 'Explore like a local',
    context: 'Host-curated places and activities',
  },
  leaving: {
    label: 'Departure guide',
    title: 'A simple send-off.',
    mobileTitle: 'Checking out',
    context: 'Everything you need before you go',
  },
};

const CATEGORY_ORDER = ['restaurant', 'attraction', 'activity', 'shop', 'services'];
const CATEGORY_LABELS = {
  restaurant: 'Restaurants',
  attraction: 'Attractions',
  activity: 'Activities',
  shop: 'Shopping',
  services: 'Services',
};
const CATEGORY_ICON_NAMES = {
  restaurant: 'utensils',
  attraction: 'landmark',
  activity: 'compass',
  shop: 'shopping-bag',
  services: 'fuel',
};
const INTERESTS = {
  hikers: { label: 'For you hikers', shortLabel: 'Hikers', icon: 'hiking' },
  climbers: { label: 'For you climbers', shortLabel: 'Climbers', icon: 'climbing' },
  offroaders: { label: 'For you off-roaders', shortLabel: 'Off-roaders', icon: 'offroad' },
  golfers: { label: 'For golfers', shortLabel: 'Golfers', icon: 'golf' },
  families: { label: 'For families', shortLabel: 'Families', icon: 'family' },
  nightlife: { label: 'For nightlife', shortLabel: 'Nightlife', icon: 'nightlife' },
};

const state = {
  sections: [],
  property: null,
  hospitable: null,
  groups: { arriving: [], staying: [], eating: [], exploring: [], leaving: [] },
  activeJourney: 'arriving',
  activeInterest: 'all',
  searchIndex: [],
  places: new Map(),
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const icon = (name, className = '') => `<svg${className ? ` class="${className}"` : ''} aria-hidden="true"><use href="#icon-${name}"></use></svg>`;

async function fetchJson(path) {
  const response = await fetch(`${GUIDE_CONFIG.apiBase}${path}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function mediaUrl(item) {
  if (item.s3Key) return `https://media.altusretreats.net/${encodeURI(item.s3Key)}`;
  return safeUrl(item.content);
}

function isPlaceholder(value) {
  return !value || /REPLACE_ME|coming soon|add your/i.test(String(value));
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const SEARCH_SYNONYM_GROUPS = [
  ['food', 'eat', 'eating', 'dining', 'restaurant', 'restaurants', 'cafe', 'coffee', 'breakfast', 'lunch', 'dinner', 'takeout'],
  ['wifi', 'wi fi', 'internet', 'network'],
  ['arrival', 'arrive', 'checkin', 'check in', 'entry', 'access'],
  ['departure', 'leave', 'leaving', 'checkout', 'check out'],
  ['trash', 'garbage', 'rubbish'],
  ['shop', 'shopping', 'store', 'stores', 'grocery', 'groceries'],
];

function searchAlternatives(term) {
  const group = SEARCH_SYNONYM_GROUPS.find(words => words.includes(term));
  return group || [term];
}

function sectionJourney(section) {
  const items = section.items || [];
  const text = normalize(`${section.sectionId} ${section.title} ${section.sectionType}`);
  const placeItems = items.filter(item => item.type === 'place');
  if (placeItems.length && placeItems.every(item => item.place?.category === 'restaurant')) return 'eating';
  if ((section.audiences || []).some(audience => INTERESTS[audience])) return 'exploring';
  if (section.sectionType === 'recommendations' || items.some(item => item.type === 'place')) return 'exploring';
  if (/checkout|check out|departure|leaving|before you go/.test(text)) return 'leaving';
  if (/welcome|checkin|check in|arrival|arriving|parking|direction|entry|access/.test(text)) return 'arriving';
  if (/local|recommend|restaurant|dining|outdoor|shopping|explore|attraction|activity/.test(text)) return 'exploring';
  return 'staying';
}

function sectionIconName(section) {
  if (section.guideJourney === 'eating') return 'utensils';
  if (section.audiences?.length === 1 && INTERESTS[section.audiences[0]]) return INTERESTS[section.audiences[0]].icon;
  const text = normalize(`${section.sectionId} ${section.title}`);
  if (/welcome|hello/.test(text)) return 'heart-home';
  if (/wifi|tech|internet/.test(text)) return 'wifi';
  if (/hot tub|pool|sauna|water/.test(text)) return 'waves';
  if (/fire|grill/.test(text)) return 'flame';
  if (/emergency|safety|contact/.test(text)) return 'shield-alert';
  if (/checkin|check in|entry|access/.test(text)) return 'key';
  if (/checkout|check out|departure/.test(text)) return 'door';
  if (/rule|instruction|before you go/.test(text)) return 'clipboard';
  if (/local|recommend|explore|restaurant|activity/.test(text)) return 'map';
  return 'home';
}

function sectionSummary(section) {
  const items = section.items || [];
  if (!items.length) return 'Open for details';
  const placeCount = items.filter(item => item.type === 'place').length;
  if (placeCount) return `${placeCount} host-curated ${placeCount === 1 ? 'place' : 'places'}`;
  if (items.length === 1 && items[0].label) return items[0].label;
  return `${items.length} quick answers`;
}

function applyPropertyPresentation(guideData, propertyData) {
  const property = propertyData?.property || null;
  const hospitable = propertyData?.hospitable || null;
  const propertyName = property?.name || guideData.propertyName || 'Your retreat';
  state.property = property;
  state.hospitable = hospitable;

  document.title = `${propertyName} — Guest Stay Guide`;
  $$('.property-name').forEach(element => { element.textContent = propertyName; });

  const accent = property?.content?.heroAccentColor || property?.branding?.guidebookAccentColor;
  const primary = property?.branding?.guidebookPrimaryColor;
  if (accent) document.documentElement.style.setProperty('--guide-accent', accent);
  if (primary) document.documentElement.style.setProperty('--guide-primary', primary);

  const customPhotos = property?.content?.heroSliderPhotos || [];
  const heroPhoto = property?.content?.guidebookHeroPhoto
    || customPhotos[0]
    || property?.content?.heroPhoto
    || hospitable?.photos?.[0]?.url;
  if (safeUrl(heroPhoto)) $('#guide-hero-media').style.backgroundImage = `url("${safeUrl(heroPhoto)}")`;

  const welcomeSection = state.sections.find(section => section.sectionType === 'welcome')
    || state.sections.find(section => /welcome/.test(normalize(`${section.sectionId} ${section.title}`)));
  const welcomeText = welcomeSection?.items?.find(item => item.type === 'text' && !isPlaceholder(item.content))?.content;
  if (welcomeText) {
    // Welcome sections own the full hero message; CSS handles wrapping.
    const sentence = String(welcomeText);
    $('#hero-message').textContent = sentence;
  }

  const checkIn = findSection(/checkin|check in|arrival/);
  const checkInText = checkIn?.items?.map(item => item.content).find(content => /\d{1,2}(:\d{2})?\s*(am|pm)/i.test(content || ''));
  if (checkInText) {
    const time = checkInText.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM)/i)?.[0];
    if (time) $('#mobile-now-title').textContent = `Check-in begins at ${time.toUpperCase()}`;
  }
}

function groupSections() {
  state.groups = { arriving: [], staying: [], eating: [], exploring: [], leaving: [] };
  state.sections.forEach(section => {
    const items = section.items || [];
    const foodPlaces = items.filter(item => item.type === 'place' && item.place?.category === 'restaurant');
    const explorePlaces = items.filter(item => item.type === 'place' && item.place?.category !== 'restaurant');
    const regularItems = items.filter(item => item.type !== 'place');

    if (!foodPlaces.length && !explorePlaces.length) {
      state.groups[sectionJourney(section)].push(section);
      return;
    }

    if (foodPlaces.length) {
      state.groups.eating.push({
        ...section,
        guideJourney: 'eating',
        items: [...(explorePlaces.length ? [] : regularItems), ...foodPlaces],
      });
    }
    if (explorePlaces.length || (!foodPlaces.length && regularItems.length)) {
      state.groups.exploring.push({
        ...section,
        guideJourney: 'exploring',
        items: [...regularItems, ...explorePlaces],
      });
    }
  });
}

function renderJourney(journey, options = {}) {
  if (!JOURNEYS[journey]) return;
  if (state.activeJourney !== journey) state.activeInterest = 'all';
  state.activeJourney = journey;
  const copy = JOURNEYS[journey];

  $$('.journey-card').forEach(button => {
    const active = button.dataset.journey === journey;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#journey-label').textContent = copy.label;
  $('#journey-title').textContent = copy.title;
  $('#journey-context').textContent = copy.context;
  $('#mobile-detail-label').textContent = copy.label;
  $('#mobile-detail-title').textContent = copy.mobileTitle;

  const sourceSections = state.groups[journey];
  renderInterestFilter(journey, sourceSections);
  const sections = journey === 'exploring' && state.activeInterest !== 'all'
    ? sourceSections.map(section => filterSectionByInterest(section, state.activeInterest)).filter(Boolean)
    : sourceSections;
  const container = $('#guide-sections');
  if (!sections.length) {
    container.innerHTML = `<div class="empty-journey"><strong>Nothing needed here yet.</strong><span>This part of the stay guide will appear when content is added.</span></div>`;
  } else {
    container.innerHTML = '';
    sections.forEach((section, index) => container.appendChild(renderSection(section, index, options.sectionId)));
  }

  if (options.mobile) {
    document.body.classList.add('mobile-content-open');
    setMobileTab(journey === 'eating' ? 'food' : '');
  }

  if (options.sectionId) {
    requestAnimationFrame(() => revealSection(options.sectionId, options.scroll !== false));
  } else if (options.scrollTop) {
    requestAnimationFrame(() => $('#guide-workspace').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

function filterSectionByInterest(section, interest) {
  if ((section.audiences || []).includes(interest)) return section;
  const matchingItems = (section.items || []).filter(item => (item.audiences || []).includes(interest));
  return matchingItems.length ? { ...section, items: matchingItems } : null;
}

function renderInterestFilter(journey, sections) {
  const root = $('#interest-filter');
  if (journey !== 'exploring') {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }

  const available = Object.keys(INTERESTS).filter(interest => sections.some(section =>
    (section.audiences || []).includes(interest)
      || (section.items || []).some(item => (item.audiences || []).includes(interest))
  ));
  if (!available.length) {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }

  root.hidden = false;
  root.innerHTML = `
    <div class="interest-filter__heading"><small>Make it yours</small><strong>What sounds like you?</strong></div>
    <div class="interest-filter__options" role="group" aria-label="Filter recommendations by interest">
      <button type="button" data-interest="all" aria-pressed="${state.activeInterest === 'all'}">${icon('compass')}<span>Everything nearby</span></button>
      ${available.map(interest => `<button type="button" data-interest="${escapeHtml(interest)}" aria-pressed="${state.activeInterest === interest}">${icon(INTERESTS[interest].icon)}<span>${escapeHtml(INTERESTS[interest].label)}</span></button>`).join('')}
    </div>`;
  $$('[data-interest]', root).forEach(button => button.addEventListener('click', () => {
    state.activeInterest = button.dataset.interest;
    renderJourney('exploring');
  }));
}

function renderSection(section, index, requestedSectionId) {
  const article = document.createElement('article');
  article.className = `guide-topic${section.important ? ' guide-topic--important' : ''}`;
  article.id = `section-${section.sectionId}`;
  article.dataset.sectionId = section.sectionId;
  const expanded = section.sectionId === requestedSectionId
    || section.important
    || (!window.matchMedia('(max-width: 760px)').matches && index === 0);
  const panelId = `topic-panel-${section.sectionId}`;
  article.innerHTML = `
    <button type="button" class="topic-toggle" aria-expanded="${expanded}" aria-controls="${escapeHtml(panelId)}">
      <span class="topic-icon">${icon(sectionIconName(section))}</span>
      <span>${section.important ? `<em class="topic-important">${icon('alert-circle')}Important</em>` : ''}<strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(sectionSummary(section))}</small></span>
      ${icon('down', 'topic-chevron')}
    </button>
    <div class="topic-body" id="${escapeHtml(panelId)}"${expanded ? '' : ' hidden'}>
      <div class="topic-items"></div>
    </div>`;

  const itemsContainer = $('.topic-items', article);
  const normalItems = (section.items || []).filter(item => item.type !== 'place');
  normalItems.forEach(item => itemsContainer.appendChild(renderItem(item)));
  renderPlaces((section.items || []).filter(item => item.type === 'place'), itemsContainer);

  if (!section.items?.length) {
    itemsContainer.innerHTML = '<div class="guide-item__placeholder">Details will appear here when they are ready.</div>';
  }

  $('.topic-toggle', article).addEventListener('click', () => toggleTopic(article));
  return article;
}

function toggleTopic(article, forceOpen) {
  const button = $('.topic-toggle', article);
  const body = $('.topic-body', article);
  const next = forceOpen ?? button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(next));
  body.hidden = !next;
}

function renderItem(item) {
  const element = document.createElement('div');
  element.className = `guide-item guide-item--${escapeHtml(item.type || 'text')}`;
  const label = item.label ? `<div class="guide-item__label">${escapeHtml(item.label)}</div>` : '';
  let body = '';

  if (item.type === 'guide') {
    body = isPlaceholder(item.content)
      ? '<div class="guide-item__placeholder">Guide details coming soon.</div>'
      : `<div class="guide-item__guide">${renderGuideMarkdown(item.content)}</div>`;
  } else if (item.type === 'text' || item.type === 'highlight' || !item.type) {
    if (isPlaceholder(item.content)) {
      body = `<div class="guide-item__placeholder">${icon('lock')}<span>This detail will appear when it is ready for your stay.</span></div>`;
    } else {
      const looksCopyable = item.content.length < 80
        && /code|password|wifi|wi-fi|network/i.test(item.label || '');
      body = looksCopyable
        ? `<button type="button" class="copy-value" data-copy-value="${escapeHtml(item.content)}"><span>${escapeHtml(item.content)}</span><em>${icon('copy')}Copy</em></button>`
        : `<div class="guide-item__text">${escapeHtml(item.content)}</div>`;
    }
  } else if (item.type === 'image') {
    const url = mediaUrl(item);
    body = url
      ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.label || '')}" loading="lazy">`
      : '<div class="guide-item__placeholder">Image coming soon.</div>';
  } else if (item.type === 'video') {
    const url = mediaUrl(item);
    const embed = getEmbedUrl(url);
    if (item.s3Key && url) body = `<video controls preload="metadata"><source src="${escapeHtml(url)}" type="video/mp4"></video>`;
    else if (embed) body = `<iframe src="${escapeHtml(embed)}" title="${escapeHtml(item.label || 'Guide video')}" allowfullscreen loading="lazy"></iframe>`;
    else if (url) body = `<a class="guide-item__link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${icon('play')}Watch video</a>`;
    else body = '<div class="guide-item__placeholder">Video coming soon.</div>';
  } else if (item.type === 'map') {
    const url = safeUrl(item.content);
    body = url
      ? `<a class="guide-item__link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${icon('navigation')}Open in Maps</a>`
      : '<div class="guide-item__placeholder">Map details coming soon.</div>';
  } else if (item.type === 'link') {
    const url = safeUrl(item.content);
    body = url
      ? `<a class="guide-item__link guide-item__link--solid" href="${escapeHtml(url)}" target="_blank" rel="noopener">${icon('external')}${escapeHtml(item.label || 'Open link')}</a>`
      : '<div class="guide-item__placeholder">Link coming soon.</div>';
  } else {
    body = isPlaceholder(item.content)
      ? '<div class="guide-item__placeholder">Details coming soon.</div>'
      : `<div class="guide-item__text">${escapeHtml(item.content)}</div>`;
  }

  element.innerHTML = label + body;
  return element;
}

function renderGuideMarkdown(content) {
  const lines = String(content || '').replace(/\r\n?/g, '\n').split('\n');
  let html = '';
  let listOpen = false;
  const closeList = () => {
    if (listOpen) html += '</ul>';
    listOpen = false;
  };

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      return;
    }
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      if (!listOpen) html += '<ul>';
      listOpen = true;
      html += `<li>${renderInlineGuideMarkdown(bullet[1])}</li>`;
    } else {
      closeList();
      html += `<p>${renderInlineGuideMarkdown(line)}</p>`;
    }
  });
  closeList();
  return html;
}

function renderInlineGuideMarkdown(value) {
  const source = String(value || '');
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let html = '';
  let cursor = 0;
  let match;
  while ((match = pattern.exec(source))) {
    html += escapeHtml(source.slice(cursor, match.index));
    const url = safeUrl(match[2]);
    html += url
      ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener sponsored">${escapeHtml(match[1])}</a>`
      : escapeHtml(match[1]);
    cursor = match.index + match[0].length;
  }
  return html + escapeHtml(source.slice(cursor));
}

function renderPlaces(items, container) {
  if (!items.length) return;
  const grouped = {};
  items.forEach(item => {
    const category = item.place?.category || 'activity';
    (grouped[category] ||= []).push(item);
    state.places.set(item.itemId, item);
  });

  const categories = [...CATEGORY_ORDER, ...Object.keys(grouped).filter(category => !CATEGORY_ORDER.includes(category))];
  categories.forEach(category => {
    if (!grouped[category]) return;
    const section = document.createElement('section');
    section.className = 'place-category';
    section.innerHTML = `<h3>${escapeHtml(CATEGORY_LABELS[category] || 'Places')}</h3><div class="place-grid"></div>`;
    const grid = $('.place-grid', section);
    grouped[category]
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      .forEach(item => grid.appendChild(renderPlaceCard(item)));
    container.appendChild(section);
  });
}

function renderPlaceCard(item) {
  const place = item.place || {};
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `place-card${item.featured ? ' is-featured' : ''}`;
  button.dataset.placeId = item.itemId;
  const photo = safeUrl(place.photoUrl);
  button.innerHTML = `
    <div class="place-card__photo">${photo
      ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(place.name || item.label || '')}" loading="lazy">`
      : `<div class="place-card__placeholder">${icon(CATEGORY_ICON_NAMES[place.category] || 'pin')}</div>`}
      ${item.featured ? '<span class="place-card__badge">Our Pick</span>' : ''}
    </div>
    <div class="place-card__body">
      <small>${escapeHtml(CATEGORY_LABELS[place.category] || 'Local favorite')}</small>
      <strong>${escapeHtml(place.name || item.label || 'Local place')}</strong>
      ${renderAudienceLabels(item.audiences)}
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      <div class="place-card__meta">
        ${place.rating ? `<span>${escapeHtml(place.rating)} ★</span>` : ''}
        ${place.distanceMiles != null ? `<span>${escapeHtml(place.distanceMiles)} mi</span>` : ''}
        ${place.travelMinutes != null ? `<span>About ${escapeHtml(place.travelMinutes)} min</span>` : ''}
        ${place.priceLabelString ? `<span>${escapeHtml(place.priceLabelString)}</span>` : ''}
      </div>
    </div>`;
  button.addEventListener('click', () => openPlaceDialog(item));
  return button;
}

function openPlaceDialog(item) {
  const place = item.place || {};
  const root = $('#place-dialog-root');
  const photo = safeUrl(place.photoUrl);
  const website = safeUrl(place.website);
  const directions = safeUrl(place.directionsUrl || place.mapsUrl);
  const phoneHref = place.phone ? `tel:${String(place.phone).replace(/[^+\d]/g, '')}` : '';
  root.innerHTML = `
    <div class="place-dialog" role="dialog" aria-modal="true" aria-labelledby="place-dialog-title">
      <div class="place-dialog__panel">
        <div class="place-dialog__photo">
          ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(place.name || item.label || '')}">` : ''}
          <button type="button" class="dialog-close" data-close-place aria-label="Close place details">${icon('close')}</button>
        </div>
        <div class="place-dialog__body">
          ${item.featured ? '<span class="place-dialog__badge">Our Pick</span>' : ''}
          <small>${escapeHtml(CATEGORY_LABELS[place.category] || 'Local favorite')}</small>
          <h2 id="place-dialog-title">${escapeHtml(place.name || item.label || 'Local place')}</h2>
          ${renderAudienceLabels(item.audiences, 'place-dialog__audiences')}
          ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
          <div class="place-chips">
            ${place.rating ? `<span>${escapeHtml(place.rating)} ★${place.totalRatings ? ` · ${Number(place.totalRatings).toLocaleString()} reviews` : ''}</span>` : ''}
            ${place.distanceMiles != null ? `<span>${escapeHtml(place.distanceMiles)} miles away</span>` : ''}
            ${place.travelMinutes != null ? `<span>About ${escapeHtml(place.travelMinutes)} min</span>` : ''}
            ${place.priceLabelString ? `<span>${escapeHtml(place.priceLabelString)}</span>` : ''}
          </div>
          ${place.address ? `<div class="place-info">${icon('map')}<span>${escapeHtml(place.address)}</span></div>` : ''}
          ${place.phone ? `<div class="place-info">${icon('phone')}<a href="${escapeHtml(phoneHref)}">${escapeHtml(place.phone)}</a></div>` : ''}
          ${website ? `<div class="place-info">${icon('external')}<a href="${escapeHtml(website)}" target="_blank" rel="noopener">Visit website</a></div>` : ''}
          ${directions ? `<a class="place-directions" href="${escapeHtml(directions)}" target="_blank" rel="noopener">${icon('navigation')}Get directions</a>` : ''}
        </div>
      </div>
    </div>`;
  document.body.classList.add('dialog-open');
  const dialog = $('.place-dialog', root);
  $('[data-close-place]', root).addEventListener('click', closePlaceDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closePlaceDialog(); });
  $('[data-close-place]', root).focus();
}

function renderAudienceLabels(audiences = [], className = 'place-card__audiences') {
  const labels = audiences.filter(value => INTERESTS[value]).map(value => INTERESTS[value].shortLabel);
  return labels.length ? `<div class="${className}">${labels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div>` : '';
}

function closePlaceDialog() {
  $('#place-dialog-root').innerHTML = '';
  document.body.classList.remove('dialog-open');
}

function getEmbedUrl(url) {
  if (!url) return '';
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return '';
}

function findSection(pattern) {
  return state.sections.find(section => pattern.test(normalize(`${section.sectionId} ${section.title}`)));
}

function renderEssentials() {
  const preferred = [
    { pattern: /wifi|wi fi|tech|internet/, icon: 'wifi', note: 'Network and devices' },
    { pattern: /hot tub|sauna|pool/, icon: 'waves', note: 'Controls and care' },
    { pattern: /checkin|check in|entry|access/, icon: 'key', note: 'Arrival and access' },
    { pattern: /emergency|safety|contact/, icon: 'shield', note: 'Help when it matters' },
  ];
  const used = new Set();
  const links = [];
  state.sections.filter(section => section.important).forEach(section => {
    if (links.length >= 4) return;
    used.add(section.sectionId);
    links.push({ section, icon: 'alert-circle', note: 'Important for your stay' });
  });
  preferred.forEach(preference => {
    const section = state.sections.find(candidate => !used.has(candidate.sectionId)
      && preference.pattern.test(normalize(`${candidate.sectionId} ${candidate.title}`)));
    if (section) {
      used.add(section.sectionId);
      links.push({ section, icon: preference.icon, note: preference.note });
    }
  });
  state.sections.forEach(section => {
    if (links.length >= 4 || used.has(section.sectionId)) return;
    used.add(section.sectionId);
    links.push({ section, icon: sectionIconName(section), note: sectionSummary(section) });
  });

  $('#essential-links').innerHTML = links.map(({ section, icon: iconName, note }) => `
    <button type="button" class="essential-link${section.important ? ' essential-link--important' : ''}" data-section-link="${escapeHtml(section.sectionId)}">
      <span class="essential-link__icon">${icon(iconName)}</span>
      <span><strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(note)}</small></span>
      ${icon('chevron')}
    </button>`).join('');
}

function buildSearchIndex() {
  state.searchIndex = [];
  state.sections.forEach(section => {
    const journey = sectionJourney(section);
    state.searchIndex.push({
      sectionId: section.sectionId,
      journey,
      iconName: sectionIconName(section),
      title: section.title,
      subtitle: sectionSummary(section),
      haystack: normalize(`${section.title} ${section.sectionId} ${(section.audiences || []).join(' ')}`),
    });
    (section.items || []).forEach(item => {
      const place = item.place || {};
      const itemJourney = item.type === 'place' && place.category === 'restaurant' ? 'eating' : journey;
      const title = place.name || item.label || section.title;
      const searchable = [title, item.content, item.description, place.category, place.address, section.title, ...(item.audiences || []), ...(section.audiences || [])]
        .filter(Boolean).join(' ');
      state.searchIndex.push({
        sectionId: section.sectionId,
        journey: itemJourney,
        iconName: item.type === 'place'
          ? (CATEGORY_ICON_NAMES[place.category] || 'pin')
          : sectionIconName(section),
        title,
        subtitle: section.title,
        haystack: normalize(searchable),
      });
    });
  });
}

function openSearch(initialQuery = '') {
  const dialog = $('#search-dialog');
  const input = $('#guide-search-input');
  dialog.hidden = false;
  document.body.classList.add('dialog-open');
  input.value = initialQuery;
  renderSearchResults(initialQuery);
  requestAnimationFrame(() => input.focus());
}

function closeSearch() {
  $('#search-dialog').hidden = true;
  document.body.classList.remove('dialog-open');
}

function renderSearchResults(query) {
  const results = $('#guide-search-results');
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    results.innerHTML = '<p>Search check-in details, property instructions and local recommendations.</p>';
    return;
  }
  const termGroups = normalizedQuery.split(' ').map(searchAlternatives);
  const matches = state.searchIndex
    .filter(entry => termGroups.every(alternatives => alternatives.some(term => entry.haystack.includes(term))))
    .slice(0, 10);
  if (!matches.length) {
    results.innerHTML = `<p>No guidebook answers found for “${escapeHtml(query)}”. Try a shorter phrase or contact your host.</p>`;
    return;
  }
  results.innerHTML = matches.map(match => `
    <button type="button" class="search-result" data-search-section="${escapeHtml(match.sectionId)}" data-search-journey="${escapeHtml(match.journey)}">
      <span class="search-result__icon">${icon(match.iconName)}</span>
      <span><strong>${escapeHtml(match.title)}</strong><small>${escapeHtml(match.subtitle)}</small></span>
      ${icon('chevron')}
    </button>`).join('');
}

function revealSection(sectionId, shouldScroll = true) {
  const article = $(`#section-${CSS.escape(sectionId)}`);
  if (!article) return;
  toggleTopic(article, true);
  if (shouldScroll) article.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${encodeURIComponent(sectionId)}`);
}

function navigateToSection(sectionId, options = {}) {
  const section = state.sections.find(candidate => candidate.sectionId === sectionId);
  if (!section) return;
  state.activeInterest = 'all';
  renderJourney(options.journey || sectionJourney(section), {
    mobile: window.matchMedia('(max-width: 760px)').matches,
    sectionId,
    scroll: options.scroll !== false,
  });
}

function openHelp() {
  $('#help-dialog').hidden = false;
  document.body.classList.add('dialog-open');
  requestAnimationFrame(() => $('[data-close-help]').focus());
}

function closeHelp() {
  $('#help-dialog').hidden = true;
  document.body.classList.remove('dialog-open');
}

function showMobileHome() {
  document.body.classList.remove('mobile-content-open');
  setMobileTab('home');
  history.replaceState(null, '', window.location.pathname + window.location.search);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setMobileTab(name) {
  $$('.mobile-tabs button').forEach(button => button.removeAttribute('aria-current'));
  const selector = name === 'home' ? '[data-mobile-home]' : name === 'food' ? '[data-mobile-journey="eating"]' : null;
  if (selector) $(selector, $('.mobile-tabs'))?.setAttribute('aria-current', 'page');
}

function installEvents() {
  $$('.journey-card').forEach(button => button.addEventListener('click', () => {
    renderJourney(button.dataset.journey, { scrollTop: true });
  }));
  $$('[data-mobile-journey]').forEach(button => button.addEventListener('click', () => {
    renderJourney(button.dataset.mobileJourney, { mobile: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  $$('[data-open-search]').forEach(button => button.addEventListener('click', () => openSearch()));
  $$('[data-open-help]').forEach(button => button.addEventListener('click', openHelp));
  $('[data-close-search]').addEventListener('click', closeSearch);
  $('[data-close-help]').addEventListener('click', closeHelp);
  $('#search-dialog').addEventListener('click', event => { if (event.target.id === 'search-dialog') closeSearch(); });
  $('#help-dialog').addEventListener('click', event => { if (event.target.id === 'help-dialog') closeHelp(); });
  $('#guide-search-input').addEventListener('input', event => renderSearchResults(event.target.value));
  $('#guide-search-results').addEventListener('click', event => {
    const button = event.target.closest('[data-search-section]');
    if (!button) return;
    closeSearch();
    navigateToSection(button.dataset.searchSection, { journey: button.dataset.searchJourney });
  });
  $('#essential-links').addEventListener('click', event => {
    const button = event.target.closest('[data-section-link]');
    if (button) navigateToSection(button.dataset.sectionLink);
  });
  $('#guide-sections').addEventListener('click', event => {
    const copyButton = event.target.closest('[data-copy-value]');
    if (copyButton) copyValue(copyButton);
  });
  $('#mobile-back').addEventListener('click', showMobileHome);
  $('[data-mobile-home]').addEventListener('click', showMobileHome);
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
    if (event.key === 'Escape') {
      if (!$('#search-dialog').hidden) closeSearch();
      if (!$('#help-dialog').hidden) closeHelp();
      if ($('.place-dialog')) closePlaceDialog();
    }
  });
}

async function copyValue(button) {
  const value = button.dataset.copyValue;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    button.classList.add('is-copied');
    const action = $('em', button);
    const original = action.innerHTML;
    action.innerHTML = `${icon('shield')}Copied`;
    setTimeout(() => { action.innerHTML = original; button.classList.remove('is-copied'); }, 1800);
  } catch {
    button.classList.remove('is-copied');
  }
}

function renderError() {
  document.body.classList.remove('loading');
  $('#guide-sections').innerHTML = `
    <div class="guide-error"><h2>We couldn’t load the stay guide.</h2><p>Please check your connection and try again.</p><button type="button" onclick="window.location.reload()">Try again</button></div>`;
  $('#essential-links').innerHTML = '';
}

async function boot() {
  installEvents();
  try {
    const [guideData, propertyData] = await Promise.all([
      fetchJson(`/properties/${encodeURIComponent(GUIDE_CONFIG.propertyId)}/guidebook`),
      fetchJson(`/properties/${encodeURIComponent(GUIDE_CONFIG.propertyId)}`).catch(() => null),
    ]);

    state.sections = guideData.sections || [];
    groupSections();
    applyPropertyPresentation(guideData, propertyData);
    renderEssentials();
    buildSearchIndex();

    const requestedSection = decodeURIComponent(window.location.hash.slice(1));
    if (requestedSection && state.sections.some(section => section.sectionId === requestedSection)) {
      const section = state.sections.find(candidate => candidate.sectionId === requestedSection);
      renderJourney(sectionJourney(section), { sectionId: requestedSection, scroll: false });
    } else {
      const initialJourney = state.groups.arriving.length
        ? 'arriving'
        : Object.keys(state.groups).find(key => state.groups[key].length) || 'staying';
      renderJourney(initialJourney);
    }

    document.body.classList.remove('loading');
  } catch (error) {
    console.error('Guidebook load failed:', error);
    renderError();
  }
}

document.addEventListener('DOMContentLoaded', boot);
