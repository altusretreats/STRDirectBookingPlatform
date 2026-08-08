const { getSecret } = require('./secrets');
const logger = require('./logger');

// Hospitable Public API v2 — https://developer.hospitable.com/
// The ID used throughout is Hospitable's own *property UUID* (found in the
// Hospitable dashboard URL: app.hospitable.com/properties/{uuid}).
// It is NOT the Airbnb/VRBO listing ID.
const BASE_URL = 'https://public.api.hospitable.com';

// ─── Mock data (used when PAT is REPLACE_ME or MOCK) ─────────────────────────
const MOCK_LISTING = {
  id: 'mock-listing-kentucky',
  name: 'The Overhang',
  summary: 'A two-bedroom luxury retreat nestled deep inside Daniel Boone National Forest — where world-class climbing crags, ancient arches, and hidden waterfalls are minutes from your front door.',
  description: 'A two-bedroom luxury retreat nestled deep inside Daniel Boone National Forest — where world-class climbing crags, ancient arches, and hidden waterfalls are minutes from your front door.',
  propertyType: 'Entire home',
  roomType: 'Entire place',
  tags: ['luxury', 'nature', 'climbing', 'adventure', 'forest', 'retreat'],
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 4,
  amenities: [
    'Hot Tub', 'Sauna', 'Cold Plunge', 'Fire Pit', 'Full Kitchen',
    'WiFi', 'Smart TV', 'EV Charger', 'Trail Access', 'World-Class Climbing Nearby',
  ],
  photos: [
    { url: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200', caption: 'Front exterior' },
    { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200', caption: 'Living room' },
    { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200', caption: 'Master bedroom' },
    { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200', caption: 'Kitchen' },
    { url: 'https://images.unsplash.com/photo-1565623507740-8e5c7b7e0b58?w=1200', caption: 'Hot tub at sunset' },
  ],
  houseRules: [
    'No smoking',
    'No parties or events',
    'Pets allowed (with prior approval)',
    'Quiet hours after 10pm',
    'Check-in: 4:00 PM – 10:00 PM',
    'Check-out: 11:00 AM',
  ],
  cancellationPolicy: 'Moderate: Full refund up to 5 days before check-in. 50% refund after that.',
  goodToKnow: 'The property is located on a gravel road. A high-clearance vehicle is recommended in winter months.',
  otherDetails: 'This is a remote property. Cell service is limited but WiFi is available.',
  checkInTime: '16:00',
  checkOutTime: '11:00',
  minimumStay: 2,
  location: {
    neighborhood: 'Red River Gorge',
    neighborhoodDescription: 'Nestled in the heart of the Red River Gorge Geological Area — a National Natural Landmark renowned for its ancient rock shelters, natural arches, and world-class climbing.',
    directions: 'From the Bert T. Combs Mountain Parkway, take exit 33 toward Campton. Follow KY-15 south for 8 miles, then turn left on KY-77. Continue 4 miles and follow the signs to the property.',
    gettingAround: 'A car is essential. The nearest town (Campton) is 12 miles away. Stanton has a grocery store 18 miles out.',
    pinLat: 37.7918,
    pinLng: -83.6832,
  },
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
    // hospPropertyId = Hospitable's own property UUID (NOT the Airbnb listing ID)
    getListing: async (hospPropertyId) => {
      if (useMock) return MOCK_LISTING;
      // v2 API: GET /v2/properties/{id}?includes=listings,details
      const data = await fetchHospitable(pat, 'GET',
        `/v2/properties/${hospPropertyId}?includes=listings,details`);
      const prop = data.data || data;
      const details = prop.details?.data || prop.details || {};
      const listings = prop.listings?.data || prop.listings || [];
      const firstListing = listings[0] || {};
      return {
        id:           prop.id || hospPropertyId,
        name:         prop.name || prop.title,
        description:  details.description || prop.description || '',
        bedrooms:     details.bedrooms    || prop.bedrooms,
        bathrooms:    details.bathrooms   || prop.bathrooms,
        maxGuests:    details.accommodates || details.max_guests || prop.max_guests,
        amenities:    details.amenities   || [],
        photos:       (details.photos || details.images || []).map(p => ({
                        url:     p.url || p.large || p.original,
                        caption: p.caption || p.description || '',
                      })),
        checkInTime:  details.check_in_time  || '15:00',
        checkOutTime: details.check_out_time || '11:00',
        minimumStay:  details.minimum_stay   || firstListing.minimum_stay || 2,
      };
    },

    getCalendar: async (hospPropertyId, startDate, endDate) => {
      if (useMock) return generateMockCalendar(hospPropertyId, startDate, endDate);
      // v2 API: GET /v2/properties/{id}/calendar
      const data = await fetchHospitable(pat, 'GET',
        `/v2/properties/${hospPropertyId}/calendar?start_date=${startDate}&end_date=${endDate}`);
      const days = (data.data || data.days || []).map(d => ({
        date:        d.date,
        available:   d.status === 'available' || d.available === true,
        price:       d.price ? Math.round(Number(d.price) * 100) : null, // normalize to cents
        minimumStay: d.minimum_stay || d.minimumStay || 2,
      }));
      return { propertyId: hospPropertyId, days };
    },

    createReservation: async (hospPropertyId, reservationData) => {
      if (useMock) {
        logger.info('Mock: would create Hospitable reservation', { hospPropertyId, ...reservationData });
        return { id: `mock-res-${Date.now()}`, status: 'confirmed' };
      }
      // v2 API: POST /v2/properties/{id}/reservations
      return fetchHospitable(pat, 'POST', `/v2/properties/${hospPropertyId}/reservations`, {
        check_in:   reservationData.checkIn,
        check_out:  reservationData.checkOut,
        guests:     reservationData.guests,
        first_name: reservationData.guestName?.split(' ')[0],
        last_name:  reservationData.guestName?.split(' ').slice(1).join(' '),
        email:      reservationData.guestEmail,
      });
    },
  };
}

module.exports = { getHospitableClient };
