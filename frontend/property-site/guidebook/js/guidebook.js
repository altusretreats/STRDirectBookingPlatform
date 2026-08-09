/**
 * Altus Retreats — Digital Guidebook
 * Fetches guidebook sections from API and renders them.
 */

// ── Config ────────────────────────────────────────────
const GB_CONFIG = {
  propertyId: new URLSearchParams(window.location.search).get('property') || 'kentucky',
  apiBase: window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev',
  bookingUrl: '../index.html',
};

// ── State ─────────────────────────────────────────────
let state = { sections: [], property: null, activeSection: null };

// ── API ───────────────────────────────────────────────
async function fetchGuidebook() {
  const res = await fetch(`${GB_CONFIG.apiBase}/properties/${GB_CONFIG.propertyId}/guidebook`);
  if (!res.ok) throw new Error(`Failed to fetch guidebook: ${res.status}`);
  return res.json();
}

// ── DOM helpers ───────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function applyBranding(branding) {
  if (!branding) return;
  const r = document.documentElement.style;
  if (branding.primaryColor) r.setProperty('--color-primary', branding.primaryColor);
  if (branding.accentColor)  r.setProperty('--color-accent',  branding.accentColor);
}

// ── Render nav ────────────────────────────────────────
function renderNav(sections) {
  const nav = $('#gb-nav-items');
  if (!nav) return;
  nav.innerHTML = '';
  sections.forEach(section => {
    const btn = document.createElement('button');
    btn.className = 'gb-nav__item';
    btn.dataset.sectionId = section.sectionId;
    btn.innerHTML = `<span class="gb-nav__icon">${section.icon || '📄'}</span>${section.title}`;
    btn.addEventListener('click', () => {
      scrollToSection(section.sectionId);
      closeNav();
    });
    nav.appendChild(btn);
  });
}

// ── Render quick links ────────────────────────────────
function renderQuickLinks(sections) {
  const grid = $('#gb-quick');
  if (!grid) return;
  grid.innerHTML = '';
  sections.slice(0, 6).forEach(section => {
    const btn = document.createElement('button');
    btn.className = 'gb-quick__item';
    btn.innerHTML = `<div class="gb-quick__icon">${section.icon || '📄'}</div><div class="gb-quick__label">${section.title}</div>`;
    btn.addEventListener('click', () => scrollToSection(section.sectionId));
    grid.appendChild(btn);
  });
}

// ── Render sections ───────────────────────────────────
function renderSections(sections) {
  const container = $('#gb-sections');
  if (!container) return;
  container.innerHTML = '';

  sections.forEach(section => {
    const el = document.createElement('section');
    el.className = 'gb-section';
    el.id = `section-${section.sectionId}`;

    el.innerHTML = `
      <div class="gb-section__header">
        <div class="gb-section__icon">${section.icon || '📄'}</div>
        <h2 class="gb-section__title">${section.title}</h2>
      </div>
      <div class="gb-section__items"></div>
    `;

    const itemsEl = el.querySelector('.gb-section__items');
    const isRecs  = section.sectionType === 'recommendations'
      || (section.items || []).some(i => i.type === 'place');

    if (isRecs) {
      const grid = document.createElement('div');
      grid.className = 'gb-place-grid';
      (section.items || []).forEach(item => {
        if (item.type === 'place') grid.appendChild(renderPlaceCard(item));
        else                       itemsEl.appendChild(renderItem(item));
      });
      if (grid.children.length) itemsEl.appendChild(grid);
    } else {
      (section.items || []).forEach(item => {
        itemsEl.appendChild(renderItem(item));
      });
    }

    container.appendChild(el);
  });
}

function renderItem(item) {
  const el = document.createElement('div');
  el.className = `gb-item gb-item--${item.type || 'text'}`;

  const label = item.label
    ? `<div class="gb-item__label">${item.label}</div>`
    : '';

  let body = '';
  switch (item.type) {
    case 'text':
      // Check if it looks like a short code/password → make it copyable
      const isCode = item.content && item.content.length < 40 && !item.content.includes('\n')
        && (item.label?.toLowerCase().includes('code') || item.label?.toLowerCase().includes('password')
            || item.label?.toLowerCase().includes('wifi') || item.label?.toLowerCase().includes('network'));
      if (isCode) {
        body = `<div class="gb-item__body">
          <button class="gb-copy" data-value="${item.content}" onclick="copyText(this)">
            <span class="gb-copy__icon">📋</span>${item.content}
          </button>
        </div>`;
      } else {
        body = `<div class="gb-item__body">${escapeHtml(item.content || '')}</div>`;
      }
      break;

    case 'image':
      body = `<div class="gb-item__body">
        <img src="${item.s3Key ? `https://media.altusretreats.net/${item.s3Key}` : item.content}"
             alt="${item.label || ''}" loading="lazy">
      </div>`;
      break;

    case 'video':
      if (item.s3Key) {
        body = `<div class="gb-item__body">
          <video controls preload="metadata">
            <source src="https://media.altusretreats.net/${item.s3Key}" type="video/mp4">
          </video>
        </div>`;
      } else if (item.content) {
        // YouTube/Vimeo embed
        const embedUrl = getEmbedUrl(item.content);
        body = embedUrl
          ? `<div class="gb-item__body"><iframe src="${embedUrl}" allowfullscreen></iframe></div>`
          : `<div class="gb-item__body"><div class="gb-item__body-placeholder">🎥 Video: <a href="${item.content}" target="_blank">${item.content}</a></div></div>`;
      } else {
        body = `<div class="gb-item__body"><div class="gb-item__body-placeholder">🎥 Video coming soon</div></div>`;
      }
      break;

    case 'map':
      const mapUrl = item.content || '';
      const isGoogleMaps = mapUrl.includes('google.com/maps') || mapUrl.includes('maps.app.goo.gl');
      body = `<div class="gb-item__body">
        <a href="${mapUrl}" target="_blank" rel="noopener">
          🗺️ ${isGoogleMaps ? 'Open in Google Maps' : 'View on map'}
        </a>
      </div>`;
      break;

    case 'link':
      body = `<div class="gb-item__body">
        <a href="${item.content}" target="_blank" rel="noopener">
          🔗 ${item.label || item.content}
        </a>
      </div>`;
      break;

    default:
      body = `<div class="gb-item__body">${escapeHtml(item.content || '')}</div>`;
  }

  el.innerHTML = label + body;
  return el;
}


// ── Render place card ─────────────────────────────────
function renderPlaceCard(item) {
  const p   = item.place || {};
  const cat = p.category || 'place';
  const catIcon = { restaurant: '🍽️', attraction: '🏞️', activity: '🧗', shop: '🛒', services: '⛽' }[cat] || '📍';

  const card = document.createElement('div');
  card.className = 'gb-place-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  card.innerHTML = `
    <div class="gb-place-card__photo">
      ${p.photoUrl
        ? `<img src="${p.photoUrl}" alt="${escapeHtml(p.name || '')}" loading="lazy">`
        : `<div class="gb-place-card__photo-placeholder">${catIcon}</div>`}
    </div>
    <div class="gb-place-card__body">
      <div class="gb-place-card__cat">${catIcon} ${cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
      <div class="gb-place-card__name">${escapeHtml(p.name || item.label || 'Place')}</div>
      ${item.description ? `<div class="gb-place-card__desc">${escapeHtml(item.description)}</div>` : ''}
      <div class="gb-place-card__meta">
        ${p.rating ? `<span>⭐ ${p.rating}</span>` : ''}
        ${p.distanceMiles != null ? `<span>🚗 ${p.distanceMiles} mi</span>` : ''}
        ${p.travelMinutes  != null ? `<span>~${p.travelMinutes} min</span>` : ''}
        ${p.priceLabelString ? `<span>${p.priceLabelString}</span>` : ''}
      </div>
    </div>
  `;

  function openModal() { showPlaceModal(item); }
  card.addEventListener('click', openModal);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(); });

  return card;
}

// ── Place detail modal ────────────────────────────────
function showPlaceModal(item) {
  const p = item.place || {};

  // Remove existing
  document.querySelector('.gb-place-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'gb-place-modal';

  const catIcon = { restaurant: '🍽️', attraction: '🏞️', activity: '🧗', shop: '🛒', services: '⛽' }[p.category] || '📍';

  overlay.innerHTML = `
    <div class="gb-place-modal__inner">
      <button class="gb-place-modal__close" aria-label="Close">✕</button>
      ${p.photoUrl ? `<img class="gb-place-modal__photo" src="${p.photoUrl}" alt="${escapeHtml(p.name || '')}">` : ''}
      <div class="gb-place-modal__body">
        <div class="gb-place-modal__cat">${catIcon} ${(p.category || 'place').charAt(0).toUpperCase() + (p.category || 'place').slice(1)}</div>
        <h2 class="gb-place-modal__name">${escapeHtml(p.name || item.label || 'Place')}</h2>
        ${item.description ? `<p class="gb-place-modal__desc">${escapeHtml(item.description)}</p>` : ''}
        <div class="gb-place-modal__chips">
          ${p.rating        ? `<span class="gb-chip">⭐ ${p.rating}${p.totalRatings ? ` (${p.totalRatings.toLocaleString()})` : ''}</span>` : ''}
          ${p.priceLabelString ? `<span class="gb-chip">${p.priceLabelString}</span>` : ''}
          ${p.distanceMiles != null ? `<span class="gb-chip">🚗 ${p.distanceMiles} miles away</span>` : ''}
          ${p.travelMinutes  != null ? `<span class="gb-chip">~${p.travelMinutes} min drive</span>` : ''}
        </div>
        ${p.address ? `<div class="gb-place-modal__info"><span>📍</span>${escapeHtml(p.address)}</div>` : ''}
        ${p.phone   ? `<div class="gb-place-modal__info"><span>📞</span><a href="tel:${p.phone}">${escapeHtml(p.phone)}</a></div>` : ''}
        ${p.website ? `<div class="gb-place-modal__info"><span>🌐</span><a href="${p.website}" target="_blank" rel="noopener">${escapeHtml(p.website.replace(/^https?:\/\/(www\.)?/, ''))}</a></div>` : ''}
        ${p.directionsUrl ? `
          <a class="gb-place-modal__directions" href="${p.directionsUrl}" target="_blank" rel="noopener">
            Get Directions
          </a>` : ''}
      </div>
    </div>
  `;

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.gb-place-modal__close').addEventListener('click', () => overlay.remove());
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
}

function getEmbedUrl(url) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Copy to clipboard ─────────────────────────────────
window.copyText = function(btn) {
  const value = btn.dataset.value;
  navigator.clipboard.writeText(value).then(() => {
    btn.classList.add('copied');
    const icon = btn.querySelector('.gb-copy__icon');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="gb-copy__icon">✓</span>Copied!';
    setTimeout(() => { btn.innerHTML = originalHtml; btn.classList.remove('copied'); }, 2000);
  });
};

// ── Scroll + active nav ───────────────────────────────
function scrollToSection(sectionId) {
  const el = $(`#section-${sectionId}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateActiveNav() {
  const sections = $$('.gb-section');
  let current = null;
  sections.forEach(section => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 100) current = section.id.replace('section-', '');
  });
  $$('.gb-nav__item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sectionId === current);
  });
}

// ── Search ────────────────────────────────────────────
function initSearch(sections) {
  const searchBtn = $('#gb-search-btn');
  const overlay   = $('#gb-search');
  const input     = $('#gb-search-input');
  const results   = $('#gb-search-results');
  const clearBtn  = $('#gb-search-clear');

  // Build search index
  const index = [];
  sections.forEach(section => {
    index.push({ type: 'section', icon: section.icon, title: section.title, sectionId: section.sectionId, sub: `${section.items?.length || 0} items` });
    (section.items || []).forEach(item => {
      index.push({ type: 'item', icon: section.icon, title: item.label || item.type, sectionId: section.sectionId, sub: section.title, content: item.content });
    });
  });

  function openSearch() { overlay.classList.add('open'); setTimeout(() => input?.focus(), 50); }
  function closeSearch() { overlay.classList.remove('open'); if(input) input.value = ''; renderSearchResults(''); }

  searchBtn?.addEventListener('click', openSearch);
  clearBtn?.addEventListener('click', closeSearch);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch();
  });

  input?.addEventListener('input', () => renderSearchResults(input.value));

  function renderSearchResults(query) {
    if (!results) return;
    const q = query.toLowerCase().trim();
    if (!q) { results.innerHTML = `<div class="gb-search__empty">Type to search the guidebook…</div>`; return; }

    const matches = index.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.sub?.toLowerCase().includes(q) ||
      item.content?.toLowerCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) { results.innerHTML = `<div class="gb-search__empty">No results for "${query}"</div>`; return; }

    results.innerHTML = '';
    matches.forEach(match => {
      const btn = document.createElement('button');
      btn.className = 'gb-search__result';
      btn.innerHTML = `
        <span class="gb-search__result-icon">${match.icon || '📄'}</span>
        <div>
          <div class="gb-search__result-title">${match.title}</div>
          <div class="gb-search__result-sub">${match.sub}</div>
        </div>`;
      btn.addEventListener('click', () => {
        closeSearch();
        scrollToSection(match.sectionId);
      });
      results.appendChild(btn);
    });
  }

  renderSearchResults('');
}

// ── Mobile nav toggle ─────────────────────────────────
function initMobileNav() {
  const menuBtn = $('#gb-menu-btn');
  const nav     = $('#gb-nav');
  const overlay = $('#gb-nav-overlay');

  menuBtn?.addEventListener('click', () => { nav?.classList.toggle('open'); overlay?.classList.toggle('open'); });
  overlay?.addEventListener('click', closeNav);
}

function closeNav() {
  $('#gb-nav')?.classList.remove('open');
  $('#gb-nav-overlay')?.classList.remove('open');
}

// ── Boot ──────────────────────────────────────────────
async function boot() {
  try {
    const data = await fetchGuidebook();
    state.sections = data.sections || [];
    state.property = { name: data.propertyName, branding: data.branding };

    applyBranding(data.branding);

    // Update page title + welcome
    document.title = `${data.propertyName} — Guest Guidebook`;
    const nameEls = document.querySelectorAll('.property-name');
    nameEls.forEach(el => el.textContent = data.propertyName);

    renderNav(state.sections);
    renderQuickLinks(state.sections);
    renderSections(state.sections);
    initSearch(state.sections);
    initMobileNav();

    // Remove loading state
    document.body.classList.remove('loading');
    $('#gb-loading')?.remove();

    // Scroll spy
    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav();

    // Deep link to section
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => scrollToSection(hash), 100);

  } catch (err) {
    console.error('Guidebook load failed:', err);
    const main = $('#gb-main');
    if (main) main.innerHTML = `<div style="text-align:center;padding:80px 24px;color:#6B7280;">
      <div style="font-size:3rem;margin-bottom:16px">😕</div>
      <h2>Couldn't load the guidebook</h2>
      <p style="margin-top:8px">Please try refreshing the page.</p>
    </div>`;
  }
}

document.addEventListener('DOMContentLoaded', boot);
