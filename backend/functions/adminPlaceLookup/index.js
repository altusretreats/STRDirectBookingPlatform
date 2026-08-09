/**
 * adminPlaceLookup — POST /admin/properties/{propertyId}/places/lookup
 *
 * Parses a Google Maps URL, calls the Places API, calculates distance from the
 * property, and returns enriched place data for the admin to review/override
 * before saving to the guidebook.
 *
 * Body: { googleUrl: "https://maps.google.com/..." }
 *
 * Returns:
 *   { name, placeId, address, phone, website, rating, totalRatings, priceLevel,
 *     priceLabelString, types, category, photoUrl, mapsUrl, directionsUrl,
 *     distanceMiles, travelMinutes, lat, lng }
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
  const parsed = JSON.parse(res.SecretString);
  _googleKey = parsed.placesApiKey;
  return _googleKey;
}

// ── Haversine distance (miles) ────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R    = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Drive time estimate (rural roads — ~30 mph average) ──────────────────────
function estimateDriveMinutes(miles) {
  return Math.max(5, Math.round((miles / 30) * 60 / 5) * 5);
}

// ── Derive human category from Place types ────────────────────────────────────
function deriveCategory(types = []) {
  if (types.some(t => ['restaurant', 'food', 'cafe', 'bakery', 'bar',
    'meal_delivery', 'meal_takeaway', 'brewery'].includes(t))) return 'restaurant';
  if (types.some(t => ['tourist_attraction', 'amusement_park', 'museum',
    'park', 'natural_feature', 'campground', 'rv_park', 'hiking_area'].includes(t))) return 'attraction';
  if (types.some(t => ['store', 'shopping_mall', 'grocery_or_supermarket',
    'supermarket', 'convenience_store', 'hardware_store'].includes(t))) return 'shop';
  if (types.some(t => ['gas_station', 'car_repair', 'car_wash'].includes(t))) return 'services';
  return 'activity';
}

const PRICE_LABELS = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// ── Parse a Google Maps URL → { name, lat, lng, placeId } ────────────────────
async function parseGoogleUrl(rawUrl) {
  let url = rawUrl.trim();

  // Resolve short links (maps.app.goo.gl, goo.gl)
  if (url.includes('goo.gl') || url.includes('maps.app')) {
    try {
      const res = await fetch(url, { redirect: 'follow', method: 'HEAD' });
      url = res.url;
    } catch {
      // fall through with original URL
    }
  }

  const parsed = new URL(url);
  const path   = parsed.pathname;  // e.g. /maps/place/Miguel's+Pizza/@37.78,-83.67,17z/data=...

  // Extract place_id from data param: !1s<PLACE_ID>
  const dataParam = parsed.searchParams.get('data') || '';
  const placeIdMatch = dataParam.match(/!1s([^!]+)/);
  const placeId = placeIdMatch ? decodeURIComponent(placeIdMatch[1]) : null;

  // Extract name from path
  const namePath = path.match(/\/maps\/place\/([^/@]+)/);
  const nameRaw  = namePath ? decodeURIComponent(namePath[1].replace(/\+/g, ' ')) : null;

  // Extract coords from @lat,lng or from path
  const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const lat = coordsMatch ? parseFloat(coordsMatch[1]) : null;
  const lng = coordsMatch ? parseFloat(coordsMatch[2]) : null;

  return { name: nameRaw, lat, lng, placeId };
}

// ── Resolve a photo reference → final CDN URL (no API key in stored URL) ─────
async function resolvePhotoUrl(photoReference, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    // The response URL after redirects is the final CDN URL — no API key
    return res.url || null;
  } catch {
    return null;
  }
}

// ── Main Places API lookup ────────────────────────────────────────────────────
async function lookupPlace(parsed, propertyLat, propertyLng, apiKey) {
  let placeId = parsed.placeId;

  // If we have a placeId from the URL, skip text search
  if (!placeId) {
    // Build text search query
    let query = parsed.name || '';
    const locationBias = (parsed.lat && parsed.lng)
      ? `&location=${parsed.lat},${parsed.lng}&radius=50000`
      : (propertyLat && propertyLng ? `&location=${propertyLat},${propertyLng}&radius=80000` : '');

    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}${locationBias}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.results?.length) {
      throw new Error(`No places found for "${query}". Try a more specific search term.`);
    }
    placeId = searchData.results[0].place_id;
  }

  // Get place details
  const fields = 'name,place_id,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,types,geometry,photos,url';
  const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();

  if (detailData.status !== 'OK') {
    throw new Error(`Places API error: ${detailData.status} — ${detailData.error_message || 'Unknown error'}`);
  }

  const p = detailData.result;
  const placeLat = p.geometry?.location?.lat;
  const placeLng = p.geometry?.location?.lng;

  // Distance & drive time
  let distanceMiles  = null;
  let travelMinutes  = null;
  if (propertyLat && propertyLng && placeLat && placeLng) {
    distanceMiles = Math.round(haversine(propertyLat, propertyLng, placeLat, placeLng) * 10) / 10;
    travelMinutes = estimateDriveMinutes(distanceMiles);
  }

  // Resolve first photo
  let photoUrl = null;
  if (p.photos?.length) {
    photoUrl = await resolvePhotoUrl(p.photos[0].photo_reference, apiKey);
  }

  const category = deriveCategory(p.types || []);

  return {
    name:            p.name,
    placeId:         p.place_id,
    address:         p.formatted_address,
    phone:           p.formatted_phone_number || null,
    website:         p.website || null,
    rating:          p.rating || null,
    totalRatings:    p.user_ratings_total || null,
    priceLevel:      p.price_level ?? null,
    priceLabelString: p.price_level != null ? PRICE_LABELS[p.price_level] : null,
    types:           p.types || [],
    category,
    photoUrl,
    mapsUrl:         p.url || `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    directionsUrl:   `https://www.google.com/maps/dir/?api=1&destination_place_id=${p.place_id}`,
    lat:             placeLat,
    lng:             placeLng,
    distanceMiles,
    travelMinutes,
  };
}

// ── Mock (no API key yet) ─────────────────────────────────────────────────────
function mockLookup(parsed, propertyLat, propertyLng) {
  const name         = parsed.name || 'Sample Place';
  const placeLat     = parsed.lat  || (propertyLat ? propertyLat + 0.05 : 37.82);
  const placeLng     = parsed.lng  || (propertyLng ? propertyLng + 0.02 : -83.71);
  const distanceMiles = (propertyLat && propertyLng)
    ? Math.round(haversine(propertyLat, propertyLng, placeLat, placeLng) * 10) / 10
    : 3.2;
  return {
    name,
    placeId:         'MOCK_PLACE_ID',
    address:         '123 Main St, Slade, KY 40376',
    phone:           '+1-606-663-0000',
    website:         null,
    rating:          4.5,
    totalRatings:    312,
    priceLevel:      1,
    priceLabelString: '$',
    types:           ['restaurant', 'food'],
    category:        'restaurant',
    photoUrl:        null,
    mapsUrl:         `https://www.google.com/maps/place/${encodeURIComponent(name)}`,
    directionsUrl:   `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name)}`,
    lat:             placeLat,
    lng:             placeLng,
    distanceMiles,
    travelMinutes:   estimateDriveMinutes(distanceMiles),
    _mock:           true,
  };
}

// ── CORS helper ───────────────────────────────────────────────────────────────
function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
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

    // Parse the Google URL
    const parsed = await parseGoogleUrl(googleUrl);

    // Try real Google Places API; fall back to mock if no key
    let placeData;
    try {
      const apiKey = await getGoogleKey();
      placeData    = await lookupPlace(parsed, propertyLat, propertyLng, apiKey);
    } catch (keyErr) {
      if (keyErr.name === 'ResourceNotFoundException' || keyErr.message?.includes('secret')) {
        // No key configured yet — return mock
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
