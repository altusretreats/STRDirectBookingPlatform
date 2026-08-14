const SHOP_CONFIG = {
  propertyId: new URLSearchParams(window.location.search).get('property') || 'kentucky',
  apiBase: ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
    ? 'http://localhost:3001'
    : 'https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev',
};

const state = { categories: [], products: [], filter: 'all' };
const productsRoot = document.getElementById('shop-products');
const filtersRoot = document.getElementById('shop-filters');

async function fetchJson(path) {
  const response = await fetch(`${SHOP_CONFIG.apiBase}${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to load the shop');
  return data;
}

function setProperty(property) {
  const name = property?.name || property?.content?.heroHeadline || 'The Overhang';
  document.querySelectorAll('.property-name').forEach(node => { node.textContent = name; });
  document.title = `Shop Your Stay — ${name}`;
  const content = property?.content || {};
  const cached = property?.hospitable?.cached || property?.hospitable || {};
  const photos = content.heroSliderPhotos || cached.photos || property?.photos || [];
  const rawPhoto = content.guidebookHeroPhoto || content.heroPhoto || photos[0];
  const photo = typeof rawPhoto === 'string' ? rawPhoto : rawPhoto?.url;
  if (photo) document.getElementById('shop-hero-media').style.backgroundImage = `url("${String(photo).replace(/["\\]/g, '\\$&')}")`;
}

function renderFilters() {
  filtersRoot.replaceChildren();
  const filters = [
    { id: 'all', name: 'All' },
    ...(state.products.some(product => product.favorite) ? [{ id: 'favorites', name: 'Favorites' }] : []),
    ...state.categories,
  ];
  filters.forEach(filter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.filter = filter.id;
    button.textContent = filter.name;
    button.classList.toggle('is-active', state.filter === filter.id);
    button.setAttribute('aria-pressed', String(state.filter === filter.id));
    button.addEventListener('click', () => {
      state.filter = filter.id;
      renderFilters();
      renderProducts();
    });
    filtersRoot.append(button);
  });
}

function renderProducts() {
  productsRoot.replaceChildren();
  const filtered = state.products.filter(product => {
    if (state.filter === 'favorites') return product.favorite;
    if (state.filter !== 'all') return product.categoryId === state.filter;
    return true;
  });
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'shop-empty';
    const heading = document.createElement('h3');
    heading.textContent = state.products.length ? 'Nothing in this collection yet.' : 'The collection is coming together.';
    const copy = document.createElement('p');
    copy.textContent = state.products.length ? 'Choose another category to keep browsing.' : 'Check back soon for the pieces guests ask about most.';
    empty.append(heading, copy);
    productsRoot.append(empty);
    return;
  }

  const categories = state.filter === 'favorites'
    ? [{ id: 'favorites', name: 'Our Favorites' }]
    : state.categories.filter(category => state.filter === 'all' || state.filter === category.id);
  categories.forEach(category => {
    const products = filtered.filter(product => state.filter === 'favorites' || product.categoryId === category.id);
    if (!products.length) return;
    const section = document.createElement('section');
    section.className = 'shop-group';
    const heading = document.createElement('div');
    heading.className = 'shop-group__heading';
    const title = document.createElement('h3');
    title.textContent = category.name;
    const line = document.createElement('span');
    const count = document.createElement('small');
    count.textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'}`;
    heading.append(title, line, count);
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    products.forEach(product => grid.append(createProductCard(product)));
    section.append(heading, grid);
    productsRoot.append(section);
  });
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = `product-card${product.favorite ? ' is-favorite' : ''}`;
  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-card__image';
  const image = document.createElement('img');
  image.src = product.imageUrl;
  image.alt = product.name;
  image.loading = 'lazy';
  image.decoding = 'async';
  imageWrap.append(image);
  if (product.favorite) {
    const badge = document.createElement('span');
    badge.className = 'product-card__favorite';
    badge.textContent = 'Our favorite';
    imageWrap.append(badge);
  }
  const body = document.createElement('div');
  body.className = 'product-card__body';
  const room = document.createElement('span');
  room.className = 'product-card__room';
  room.textContent = product.room || '';
  const title = document.createElement('h4');
  title.textContent = product.name;
  const description = document.createElement('p');
  description.textContent = product.description;
  const link = document.createElement('a');
  link.href = product.affiliateUrl;
  link.target = '_blank';
  link.rel = 'sponsored noopener noreferrer';
  link.textContent = 'Shop this item';
  link.setAttribute('aria-label', `Shop ${product.name} (opens seller website)`);
  body.append(room, title, description, link);
  card.append(imageWrap, body);
  return card;
}

async function init() {
  try {
    const id = encodeURIComponent(SHOP_CONFIG.propertyId);
    const [shop, property] = await Promise.all([
      fetchJson(`/properties/${id}/shop`),
      fetchJson(`/properties/${id}`).catch(() => null),
    ]);
    state.categories = shop.categories || [];
    state.products = shop.products || [];
    setProperty(property);
    renderFilters();
    renderProducts();
  } catch (error) {
    productsRoot.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'shop-empty';
    const heading = document.createElement('h3');
    heading.textContent = 'We couldn’t load the collection.';
    const copy = document.createElement('p');
    copy.textContent = 'Please refresh the page in a moment.';
    empty.append(heading, copy);
    productsRoot.append(empty);
  }
}

init();
