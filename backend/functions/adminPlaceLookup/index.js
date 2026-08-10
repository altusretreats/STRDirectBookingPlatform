/**
 * adminPlaceLookup — POST /admin/properties/{propertyId}/places/lookup
 *
 * Parses a Google Maps URL, calls the Places API v2, calculates distance
 * from the property, and returns enriched place data for the admin to
 * review/override before saving to the guidebook.
 *
 * Body: { googleUrl: "https://maps.google.com/..." }
 */

const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const TABLE = process.env.TABLE_NAME;
const ENV   = process.env.ENVIRONMENT || 'dev';

const dynamo  = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const secrets = new SecretsManagerClient({});

// ── Secret cache ──────────────────────────────────────────────────────────────
let _googleKey = null;
async function getGoogleKey() {
  if (_googleKey) return _googleKey;
  const res = await secrets.send(new GetSecretValueCommand({
    SecretId: `altus-retreats/${ENV}/google`,
  }));
  _googleKey = JSON.parse(res.SecretString).placesApiKey;
  return _googleKey;
}

// ── Haversine distance (miles) ────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R    = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDriveMinutes(miles) {
  // Rural/mountain roads — ~30 mph average
  return Math.max(5, Math.round((miles / 30) * 60 / 5) * 5);
}

// ── Category from place types ─────────────────────────────────────────────────
function deriveCategory(types = []) {
  if (types.some(t => ['restaurant', 'food', 'cafe', 'bakery', 'bar',
    'meal_delivery', 'meal_takeaway', 'brewery', 'coffee_shop'].includes(t))) return 'restaurant';
  if (types.some(t => ['tourist_attraction', 'amusement_park', 'museum',
    'park', 'natural_feature', 'campground', 'hiking_area', 'national_park'].includes(t))) return 'attraction';
  if (types.some(t => ['store', 'shopping_mall', 'grocery_store',
    'supermarket', 'convenience_store', 'hardware_store'].includes(t))) return 'shop';
  if (types.some(t => ['gas_station', 'car_repair', 'car_wash'].includes(t))) return 'services';
  return 'activity';
}

const PRICE_LABELS = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// ── Parse Google Maps URL → { name, lat, lng, placeId } ──────────────────────
async function parseGoogleUrl(rawUrl) {
  let url = rawUrl.trim();

  // Resolve short links (maps.app.goo.gl, goo.gl)
  if (url.includes('goo.gl') || url.includes('maps.app')) {
    try {
      const res = await fetch(url, { redirect: 'follow', method: 'HEAD' });
      url = res.url;
    } catch { /* fall through */ }
  }

  const parsed = new URL(url);
  const path   = parsed.pathname;

  // Extract place_id from data param: !1s<PLACE_ID>
  const dataParam    = parsed.searchParams.get('data') || '';
  const placeIdMatch = dataParam.match(/!1s([^!]+)/);
  const placeId      = placeIdMatch ? decodeURIComponent(placeIdMatch[1]) : null;

  // Name from path /maps/place/Name/@lat,lng
  const namePath = path.match(/\/maps\/place\/([^/@]+)/);
  const name     = namePath ? decodeURIComponent(namePath[1].replace(/\+/g, ' ')) : null;

  // Coordinates from @lat,lng
  const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const lat = coordsMatch ? parseFloat(coordsMatch[1]) : null;
  const lng = coordsMatch ? parseFloat(coordsMatch[2]) : null;

  return { name, lat, lng, placeId };
}

// ── Places API v2 lookup ──────────────────────────────────────────────────────
const PLACES_BASE  = 'https://places.googleapis.com/v1';
const FIELD_MASK   = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.types',
  'places.location',
  'places.photos',
  'places.googleMapsUri',
].join(',');

async function lookupPlace(parsed, propertyLat, propertyLng, apiKey) {
  const headers = {
    'Content-Type':   'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': FIELD_MASK,
  };

  let place;

  // If we have a placeId from the URL, fetch details directly
  if (parsed.placeId) {
    const detailMask = FIELD_MASK.replace(/places\./g, '');
    const res = await fetch(`${PLACES_BASE}/places/${parsed.placeId}`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': detailMask },
    });
    const data = await res.json();
    if (data.error) throw new Error(`Places API: ${data.error.message}`);
    place = data;
  } else {
    // Text search using name + location bias
    const body = { textQuery: parsed.name || '' };
    if (parsed.lat && parsed.lng) {
      body.locationBias = {
        circle: { center: { latitude: parsed.lat, longitude: parsed.lng }, radius: 50000 },
      };
    } else if (propertyLat && propertyLng) {
      body.locationBias = {
        circle: { center: { latitude: propertyLat, longitude: propertyLng }, radius: 80000 },
      };
    }

    const res  = await fetch(`${PLACES_BASE}/places:searchText`, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) throw new Error(`Places API: ${data.error.message}`);
    if (!data.places?.length) throw new Error(`No places found for "${parsed.name}". Try a more specific search term.`);
    place = data.places[0];
  }

  // Coordinates
  const placeLat = place.location?.latitude;
  const placeLng = place.location?.longitude;

  // Distance + drive time
  let distanceMiles = null;
  let travelMinutes = null;
  if (propertyLat && propertyLng && placeLat && placeLng) {
    distanceMiles = Math.round(haversine(propertyLat, propertyLng, placeLat, placeLng) * 10) / 10;
    travelMinutes = estimateDriveMinutes(distanceMiles);
  }

  // Photo — v2 returns a photo resource name; fetch the media URI directly
  let photoUrl = null;
  if (place.photos?.length) {
    const photoName = place.photos[0].name;
    const photoRes  = await fetch(
      `${PLACES_BASE}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${apiKey}`
    );
    const photoData = await photoRes.json();
    photoUrl = photoData.photoUri || null;
  }

  // Price level — v2 returns a string enum e.g. "PRICE_LEVEL_MODERATE"
  const priceLevelMap = {
    PRICE_LEVEL_FREE:           0,
    PRICE_LEVEL_INEXPENSIVE:    1,
    PRICE_LEVEL_MODERATE:       2,
    PRICE_LEVEL_EXPENSIVE:      3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  const priceLevelNum = priceLevelMap[place.priceLevel] ?? null;

  const types    = place.types || [];
  const category = deriveCategory(types);

  return {
    name:             place.displayName?.text || parsed.name,
    placeId:          place.id,
    address:          place.formattedAddress,
    phone:            place.internationalPhoneNumber || null,
    website:          place.websiteUri || null,
    rating:           place.rating || null,
    totalRatings:     place.userRatingCount || null,
    priceLevel:       priceLevelNum,
    priceLabelString: priceLevelNum != null ? PRICE_LABELS[priceLevelNum] : null,
    types,
    category,
    photoUrl,
    mapsUrl:          place.googleMapsUri || null,
    directionsUrl:    (placeLat && placeLng)
      ? `https://www.google.com/maps/dir/?api=1&destination=${placeLat},${placeLng}${place.id ? `&destination_place_id=${place.id}` : ''}`
      : (place.id ? `https://www.google.com/maps/dir/?api=1&destination_place_id=${place.id}` : null),
    lat:              placeLat,
    lng:              placeLng,
    distanceMiles,
    travelMinutes,
  };
}

// ── Mock (no API key / key not yet valid) ─────────────────────────────────────
function mockLookup(parsed, propertyLat, propertyLng) {
  const name        = parsed.name || 'Sample Place';
  const placeLat    = parsed.lat  || (propertyLat ? propertyLat + 0.05 : 37.82);
  const placeLng    = parsed.lng  || (propertyLng ? propertyLng + 0.02 : -83.71);
  const distanceMiles = (propertyLat && propertyLng)
    ? Math.round(haversine(propertyLat, propertyLng, placeLat, placeLng) * 10) / 10
    : 3.2;
  return {
    name,
    placeId:          'MOCK_PLACE_ID',
    address:          '123 Main St, Slade, KY 40376',
    phone:            '+1-606-663-0000',
    website:          null,
    rating:           4.5,
    totalRatings:     312,
    priceLevel:       1,
    priceLabelString: '$',
    types:            ['restaurant', 'food'],
    category:         'restaurant',
    photoUrl:         null,
    mapsUrl:          `https://www.google.com/maps/place/${encodeURIComponent(name)}`,
    directionsUrl:    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name)}`,
    lat:              placeLat,
    lng:              placeLng,
    distanceMiles,
    travelMinutes:    estimateDriveMinutes(distanceMiles),
    _mock:            true,
  };
}

// ── CORS helper ───────────────────────────────────────────────────────────────
function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});

  const propertyId = event.pathParameters?.propertyId;
  if (!propertyId) return respond(400, { error: 'Missing propertyId' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { /* ok */ }

  const { googleUrl } = body;
  if (!googleUrl) return respond(400, { error: 'Missing googleUrl in request body' });

  try {
    // Load property to get its coordinates
    const propResult = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PROPERTY#${propertyId}`, SK: 'METADATA' },
    }));
    const prop = propResult.Item;
    if (!prop) return respond(404, { error: `Property "${propertyId}" not found` });

    const propertyLat = prop.location?.pinLat || prop.hospitable?.cached?.location?.pinLat || null;
    const propertyLng = prop.location?.pinLng || prop.hospitable?.cached?.location?.pinLng || null;

    const parsed = await parseGoogleUrl(googleUrl);

    let placeData;
    try {
      const apiKey = await getGoogleKey();
      placeData    = await lookupPlace(parsed, propertyLat, propertyLng, apiKey);
    } catch (keyErr) {
      if (keyErr.name === 'ResourceNotFoundException' || keyErr.message?.includes('secret')) {
        placeData = mockLookup(parsed, propertyLat, propertyLng);
      } else {
        throw keyErr;
      }
    }

    return respond(200, { place: placeData });

  } catch (err) {
    console.error('adminPlaceLookup error:', err);
    return respond(500, { error: err.message || 'Internal server error' });
  }
};
