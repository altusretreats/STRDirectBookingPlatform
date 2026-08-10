const { getSecret } = require('./secrets');
const logger = require('./logger');

// Hospitable Public API v2 — https://developer.hospitable.com/
// The ID used throughout is Hospitable's own *property UUID* (found in the
// Hospitable dashboard URL: app.hospitable.com/properties/{uuid}).
// It is NOT the Airbnb/VRBO listing ID.
const BASE_URL = 'https://public.api.hospitable.com';

// ─── Amenity slug → { name, category } ──────────────────────────────────────
// Hospitable returns Airbnb-style slugs. Map them to human-readable names + categories.
const AMENITY_MAP = {
  // Bathroom
  bathtub:                    { name: 'Bathtub',                   category: 'Bathroom' },
  body_soap:                  { name: 'Body soap',                 category: 'Bathroom' },
  conditioner:                { name: 'Conditioner',               category: 'Bathroom' },
  hair_dryer:                 { name: 'Hair dryer',                category: 'Bathroom' },
  hot_water:                  { name: 'Hot water',                 category: 'Bathroom' },
  outdoor_shower:             { name: 'Outdoor shower',            category: 'Bathroom' },
  shampoo:                    { name: 'Shampoo',                   category: 'Bathroom' },
  shower_gel:                 { name: 'Shower gel',                category: 'Bathroom' },
  // Bedroom & Laundry
  bed_linens:                 { name: 'Bed linens',                category: 'Bedroom' },
  extra_pillows_and_blankets: { name: 'Extra pillows & blankets',  category: 'Bedroom' },
  hangers:                    { name: 'Hangers',                   category: 'Bedroom' },
  iron:                       { name: 'Iron',                      category: 'Bedroom' },
  room_darkening_shades:      { name: 'Room-darkening shades',     category: 'Bedroom' },
  dryer:                      { name: 'Dryer',                     category: 'Laundry' },
  washer:                     { name: 'Washer',                    category: 'Laundry' },
  // Entertainment
  cable_tv:                   { name: 'Cable TV',                  category: 'Entertainment' },
  game_console:               { name: 'Game console',              category: 'Entertainment' },
  smart_tv:                   { name: 'Smart TV',                  category: 'Entertainment' },
  tv:                         { name: 'TV',                        category: 'Entertainment' },
  // Family
  childrens_books_and_toys:   { name: "Children's books & toys",   category: 'Family' },
  childrens_dinnerware:       { name: "Children's dinnerware",     category: 'Family' },
  crib:                       { name: 'Crib',                      category: 'Family' },
  high_chair:                 { name: 'High chair',                category: 'Family' },
  pack_n_play_travel_crib:    { name: "Pack 'n play / travel crib",category: 'Family' },
  // Heating & Cooling
  ac:                         { name: 'Air conditioning',          category: 'Heating & cooling' },
  ceiling_fan:                { name: 'Ceiling fan',               category: 'Heating & cooling' },
  heating:                    { name: 'Heating',                   category: 'Heating & cooling' },
  portable_fans:              { name: 'Portable fans',             category: 'Heating & cooling' },
  // Home Safety
  carbon_monoxide_detector:   { name: 'Carbon monoxide alarm',     category: 'Home safety' },
  fire_extinguisher:          { name: 'Fire extinguisher',         category: 'Home safety' },
  first_aid_kit:              { name: 'First aid kit',             category: 'Home safety' },
  smoke_alarm:                { name: 'Smoke alarm',               category: 'Home safety' },
  // Internet & Office
  dedicated_workspace:        { name: 'Dedicated workspace',       category: 'Internet & office' },
  wifi:                       { name: 'Wifi',                      category: 'Internet & office' },
  // Kitchen
  baking_sheet:               { name: 'Baking sheet',              category: 'Kitchen' },
  barbeque_utensils:          { name: 'BBQ utensils',              category: 'Kitchen' },
  blender:                    { name: 'Blender',                   category: 'Kitchen' },
  coffee:                     { name: 'Coffee',                    category: 'Kitchen' },
  coffee_maker:               { name: 'Coffee maker',              category: 'Kitchen' },
  cooking_basics:             { name: 'Cooking basics',            category: 'Kitchen' },
  dining_table:               { name: 'Dining table',              category: 'Kitchen' },
  dishes_and_silverware:      { name: 'Dishes & silverware',       category: 'Kitchen' },
  dishwasher:                 { name: 'Dishwasher',                category: 'Kitchen' },
  freezer:                    { name: 'Freezer',                   category: 'Kitchen' },
  hot_water_kettle:           { name: 'Hot water kettle',          category: 'Kitchen' },
  kitchen:                    { name: 'Kitchen',                   category: 'Kitchen' },
  microwave:                  { name: 'Microwave',                 category: 'Kitchen' },
  oven:                       { name: 'Oven',                      category: 'Kitchen' },
  refrigerator:               { name: 'Refrigerator',              category: 'Kitchen' },
  rice_maker:                 { name: 'Rice maker',                category: 'Kitchen' },
  stove:                      { name: 'Stove',                     category: 'Kitchen' },
  toaster:                    { name: 'Toaster',                   category: 'Kitchen' },
  wine_glasses:               { name: 'Wine glasses',              category: 'Kitchen' },
  // Outdoor
  alfresco_dining:            { name: 'Alfresco dining area',      category: 'Outdoor' },
  bbq:                        { name: 'BBQ grill',                 category: 'Outdoor' },
  bbq_grill:                  { name: 'BBQ grill',                 category: 'Outdoor' },
  fire_pit:                   { name: 'Fire pit',                  category: 'Outdoor' },
  outdoor_dining_area:        { name: 'Outdoor dining area',       category: 'Outdoor' },
  outdoor_furniture:          { name: 'Outdoor furniture',         category: 'Outdoor' },
  patio_or_balcony:           { name: 'Patio or balcony',          category: 'Outdoor' },
  pool:                       { name: 'Pool',                      category: 'Outdoor' },
  private_backyard:           { name: 'Private backyard',          category: 'Outdoor' },
  // Parking & Facilities
  ev_charger:                 { name: 'EV charger',                category: 'Parking & facilities' },
  free_on_premise_parking:    { name: 'Free on-premise parking',   category: 'Parking & facilities' },
  free_street_parking:        { name: 'Free street parking',       category: 'Parking & facilities' },
  gym:                        { name: 'Gym',                       category: 'Parking & facilities' },
  hot_tub:                    { name: 'Hot tub',                   category: 'Parking & facilities' },
  sauna:                      { name: 'Sauna',                     category: 'Parking & facilities' },
  // Essentials
  essentials:                 { name: 'Essentials',                category: 'Essentials' },
  lockbox:                    { name: 'Lockbox',                   category: 'Essentials' },
  luggage_dropoff_allowed:    { name: 'Luggage drop-off allowed',  category: 'Essentials' },
  self_checkin:               { name: 'Self check-in',             category: 'Essentials' },
};

function resolveAmenity(raw) {
  if (typeof raw === 'string') {
    const slug = raw.toLowerCase().trim();
    if (AMENITY_MAP[slug]) return AMENITY_MAP[slug];
    // Prettify unknown slugs: replace underscores, title-case
    const name = slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return { name, category: 'Other' };
  }
  // Already an object with name/category
  const name = raw.name || raw.label || String(raw);
  const category = raw.category || raw.type || raw.group || 'Other';
  return { name, category };
}

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
  // Mock amenities as slugs (same format as real Hospitable API)
  amenities: ['hot_tub','sauna','fire_pit','bbq','outdoor_furniture','kitchen','coffee_maker',
    'dishwasher','wifi','smart_tv','ev_charger','washer','dryer','ac','heating'],
  photos: [
    { url: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200', caption: 'Front exterior' },
    { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200', caption: 'Living room' },
    { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200', caption: 'Master bedroom' },
    { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200', caption: 'Kitchen' },
    { url: 'https://images.unsplash.com/photo-1565623507740-8e5c7b7e0b58?w=1200', caption: 'Hot tub at sunset' },
  ],
  houseRules: [
    'No smoking inside',
    'No parties or events',
    'Pets allowed with prior approval',
    'Quiet hours 10pm–8am',
    'Check-in: 4:00 PM',
    'Check-out: 11:00 AM',
    'Minimum age to rent: 25',
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
      // v2 API — try to include photos in the main property call
      const data = await fetchHospitable(pat, 'GET',
        `/v2/properties/${hospPropertyId}?includes=photos,media,pictures`);

      const _prop0    = data.data || data;
      const _details0 = _prop0.details?.data || _prop0.details || {};
      const _listing0 = (_prop0.listings?.data || _prop0.listings || [])[0] || {};
      logger.info('Hospitable raw response keys', {
        topKeys:      Object.keys(data),
        dataKeys:     Object.keys(_prop0),
        detailKeys:   Object.keys(_details0),
        listingKeys:  Object.keys(_listing0),
        // Dump raw samples so we can see the exact Hospitable field structure
        pictureRaw:         JSON.stringify(_prop0.picture ?? null),
        photosKey:          JSON.stringify(_prop0.photos ?? _prop0.media ?? _prop0.pictures ?? null),
        amenitySample:      JSON.stringify((_details0.amenities   || _listing0.amenities   || _prop0.amenities   || []).slice?.(0, 2) ?? _details0.amenities),
        houseRulesRaw:      JSON.stringify(_details0.house_rules ?? _listing0.house_rules ?? _prop0.house_rules ?? _details0.rules ?? _listing0.rules ?? null),
        houseRulesType:     typeof (_details0.house_rules ?? _listing0.house_rules ?? _prop0.house_rules ?? null),
        // Photos: log count at each path + full first object so we know the structure
        photosAtDetails:    Array.isArray(_details0.photos) ? _details0.photos.length : typeof _details0.photos,
        photosAtImages:     Array.isArray(_details0.images) ? _details0.images.length : typeof _details0.images,
        photosAtListing:    Array.isArray(_listing0.photos) ? _listing0.photos.length : typeof _listing0.photos,
        photosAtProp:       Array.isArray(_prop0.photos)    ? _prop0.photos.length    : typeof _prop0.photos,
        firstPhotoRaw:      JSON.stringify((_details0.photos?.[0] || _details0.images?.[0] || _listing0.photos?.[0] || _prop0.photos?.[0]) ?? null),
      });

      // Hospitable v2 returns flat structure at data.data — no nested details/listings
      const prop = data.data || data;

      // Amenities — array of slugs e.g. ["ac", "fire_pit"]
      const amenities = Array.isArray(prop.amenities)
        ? prop.amenities.map(resolveAmenity).filter(a => a.name)
        : [];

      // House rules — boolean object: {pets_allowed, smoking_allowed, events_allowed}
      const rawRules = prop.house_rules ?? null;
      let houseRules = [];
      if (rawRules && typeof rawRules === 'object' && !Array.isArray(rawRules)) {
        const RULE_LABELS = {
          pets_allowed:    v => v ? 'Pets allowed' : 'No pets',
          smoking_allowed: v => v ? 'Smoking allowed' : 'No smoking',
          events_allowed:  v => v ? 'Events allowed' : 'No parties or events',
        };
        houseRules = Object.entries(rawRules)
          .map(([k, v]) => RULE_LABELS[k] ? RULE_LABELS[k](v) : null)
          .filter(Boolean);
      } else if (Array.isArray(rawRules)) {
        houseRules = rawRules.map(r => typeof r === 'string' ? r.trim() : (r.body || r.rule || r.text || String(r)).trim()).filter(Boolean);
      } else if (typeof rawRules === 'string') {
        houseRules = rawRules.split('\n').map(r => r.trim()).filter(Boolean);
      }

      // Photos — v2 base endpoint only returns data.picture (single URL).
      // Fetch the dedicated photos endpoint for the full gallery.
      let photos = [];
      try {
        // GET /v2/properties/{id}/images — only returns Direct-channel images
        const imgData = await fetchHospitable(pat, 'GET', `/v2/properties/${hospPropertyId}/images`);
        logger.info('Images endpoint raw', {
          topKeys:   Object.keys(imgData),
          dataIsArr: Array.isArray(imgData.data),
          dataLen:   Array.isArray(imgData.data) ? imgData.data.length : null,
          firstItem: JSON.stringify((imgData.data || [])[0] ?? null),
        });
        const imgList = Array.isArray(imgData.data) ? imgData.data : [];
        photos = imgList
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
          .map(p => ({
            url:          p.url || (typeof p === 'string' ? p : ''),
            thumbnail_url: p.thumbnail_url || p.url || '',
            caption:      p.caption || '',
            order:        p.order ?? 0,
          })).filter(p => p.url);
      } catch (listingErr) {
        logger.warn('Could not fetch listings for photos', { error: listingErr.message });
      }
      // Fall back to single picture field on property
      if (photos.length === 0 && prop.picture) {
        photos = [{ url: prop.picture, caption: '' }];
      }

      // Capacity: {guests, bedrooms, beds, bathrooms}
      const capacity = prop.capacity || {};

      // Check-in / check-out times
      const checkin  = prop.checkin  || {};
      const checkout = prop.checkout || {};

      // Address / location
      const address = prop.address || {};

      return {
        id:                 prop.id || hospPropertyId,
        name:               prop.name || prop.public_name || null,
        summary:            prop.summary || prop.description?.slice(0, 300) || null,
        description:        prop.description || null,
        propertyType:       prop.property_type || null,
        roomType:           prop.room_type     || null,
        bedrooms:           capacity.bedrooms  ?? null,
        bathrooms:          capacity.bathrooms ?? null,
        maxGuests:          capacity.guests    ?? null,
        checkInTime:        checkin.from  || checkin.time  || '15:00',
        checkOutTime:       checkout.until || checkout.time || '11:00',
        minimumStay:        prop.minimum_stay ?? 2,
        amenities,
        photos,
        houseRules,
        cancellationPolicy: prop.cancellation_policy?.name || prop.cancellation_policy || null,
        location: {
          neighborhood:            null, // not in v2 base — admin override
          neighborhoodDescription: null,
          directions:              null,
          gettingAround:           null,
          pinLat:                  address.lat ?? null,
          pinLng:                  address.lng ?? null,
        },
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
