const { getSecret } = require('./secrets');
const logger = require('./logger');

const BASE_URL = 'https://api.hospitable.com';

// ─── Mock data (used when PAT is REPLACE_ME or MOCK) ─────────────────────────
const MOCK_LISTING = {
  id: 'mock-listing-kentucky',
  name: 'Altus Kentucky Retreat',
  description: `Escape to this stunning Kentucky retreat nestled among rolling hills. 
Perfect for families and groups, this spacious property features breathtaking views, 
a fully equipped kitchen, and luxurious amenities throughout.`,
  propertyType: 'Entire home',
  bedrooms: 4,
  bathrooms: 3,
  maxGuests: 10,
  amenities: [
    'WiFi', 'Full kitchen', 'Free parking', 'Hot tub', 'Fire pit',
    'Washer/dryer', 'Air conditioning', 'Heating', 'Smart TV',
    'Outdoor dining area', 'BBQ grill', 'Game room', 'Fireplace',
  ],
  photos: [
    { url: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200', caption: 'Front exterior' },
    { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200', caption: 'Living room' },
    { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200', caption: 'Master bedroom' },
    { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200', caption: 'Kitchen' },
    { url: 'https://images.unsplash.com/photo-1565623507740-8e5c7b7e0b58?w=1200', caption: 'Hot tub at sunset' },
  ],
  checkInTime: '15:00',
  checkOutTime: '11:00',
  minimumStay: 2,
};

function generateMockCalendar(listingId, startDate, endDate) {
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Simulate some blocked dates (every 3rd weekend for demo)
  const blockedRanges = [
    { start: '2026-08-22', end: '2026-08-25' },
    { start: '2026-09-05', end: '2026-09-08' },
    { start: '2026-09-19', end: '2026-09-22' },
    { start: '2026-10-10', end: '2026-10-14' },
  ];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const isBlocked = blockedRanges.some(r => dateStr >= r.start && dateStr < r.end);
    days.push({
      date: dateStr,
      available: !isBlocked,
      price: isBlocked ? null : 29500, // $295/night in cents
      minimumStay: 2,
    });
  }
  return { listingId, days };
}

// ─── Real Hospitable API client ───────────────────────────────────────────────
async function fetchHospitable(pat, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hospitable ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Factory: returns client for a property (real or mock) ───────────────────
async function getHospitableClient(propertyId) {
  const env = process.env.ENVIRONMENT || 'local';
  let pat = 'MOCK';

  try {
    const secrets = await getSecret(`altus-retreats/${env}/hospitable`);
    pat = secrets[propertyId] || secrets['default'] || 'MOCK';
  } catch (err) {
    logger.warn('Could not load Hospitable secret, using mock', { error: err.message });
  }

  const useMock = !pat || pat === 'REPLACE_ME' || pat === 'MOCK';
  if (useMock) {
    logger.info('Using Hospitable mock client', { propertyId });
  }

  return {
    getListing: async (listingId) => {
      if (useMock) return MOCK_LISTING;
      return fetchHospitable(pat, 'GET', `/v1/listings/${listingId}`);
    },

    getCalendar: async (listingId, startDate, endDate) => {
      if (useMock) return generateMockCalendar(listingId, startDate, endDate);
      return fetchHospitable(pat, 'GET',
        `/v1/listings/${listingId}/calendar?start_date=${startDate}&end_date=${endDate}`);
    },

    createReservation: async (listingId, data) => {
      if (useMock) {
        logger.info('Mock: would create Hospitable reservation', { listingId, ...data });
        return { id: `mock-res-${Date.now()}`, status: 'confirmed' };
      }
      return fetchHospitable(pat, 'POST', `/v1/listings/${listingId}/reservations`, data);
    },
  };
}

module.exports = { getHospitableClient };
