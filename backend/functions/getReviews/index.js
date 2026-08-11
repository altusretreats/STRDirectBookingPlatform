/**
 * GET /properties/{propertyId}/reviews
 *
 * Returns guest reviews for a property, fetched from Hospitable API.
 * Falls back to mock data if the API is unavailable or the property
 * uses mock credentials.
 */
const db = require('/opt/nodejs/lib/db');
const { getHospitableClient } = require('/opt/nodejs/lib/hospitable');
const { ok, notFound, serverError } = require('/opt/nodejs/lib/response');
const logger = require('/opt/nodejs/lib/logger');

// ── Mock reviews for dev/mock mode ────────────────────
const MOCK_REVIEWS = [
  {
    id: 'mock-1',
    reviewer_name: 'Sarah M.',
    rating: 5,
    public_review: 'Absolutely stunning retreat. The hot tub at night with stars overhead was unforgettable. The property exceeded every expectation — so well-appointed and thoughtfully designed. Will definitely be back.',
    created_at: '2026-06-15T00:00:00Z',
  },
  {
    id: 'mock-2',
    reviewer_name: 'James T.',
    rating: 5,
    public_review: 'We spent four nights here and didn\'t want to leave. The location inside the gorge is magical, and the host\'s communication was excellent. Booking direct saved us real money compared to other platforms.',
    created_at: '2026-05-02T00:00:00Z',
  },
  {
    id: 'mock-3',
    reviewer_name: 'Elena R.',
    rating: 5,
    public_review: 'Perfect for our anniversary getaway. The fire pit, the sauna, the views — everything was exactly as described. The digital guidebook made exploring the area so easy. Highly recommend.',
    created_at: '2026-04-18T00:00:00Z',
  },
  {
    id: 'mock-4',
    reviewer_name: 'Daniel K.',
    rating: 5,
    public_review: 'Came for the climbing, stayed for everything else. This place is a gem. Immaculately clean, beautifully designed, and the host clearly cares deeply about the guest experience.',
    created_at: '2026-03-29T00:00:00Z',
  },
];

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters;

    // Verify property exists and get Hospitable property ID
    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });

    if (!property || !property.active) {
      return notFound(`Property not found: ${propertyId}`);
    }

    const hospPropertyId = property.hospitable?.propertyId;
    if (!hospPropertyId) {
      logger.warn('No Hospitable property ID configured', { propertyId });
      return ok({ reviews: [], averageRating: null, totalReviews: 0 });
    }

    const client = await getHospitableClient(propertyId);

    // Check if mock mode (client has no real API access)
    // The mock client doesn't expose a flag, so we check env
    const env = process.env.ENVIRONMENT || 'local';
    const isMock = env === 'local';

    if (isMock) {
      return ok({
        reviews: MOCK_REVIEWS,
        averageRating: 5.0,
        totalReviews: MOCK_REVIEWS.length,
      });
    }

    // Real Hospitable API: GET /v2/properties/{id}/reviews
    try {
      const data = await fetchHospitableReviews(propertyId, hospPropertyId);
      return ok(data);
    } catch (apiErr) {
      logger.warn('Hospitable reviews API error, returning empty', {
        error: apiErr.message,
        propertyId,
      });
      return ok({ reviews: [], averageRating: null, totalReviews: 0 });
    }

  } catch (err) {
    return serverError(err);
  }
};

async function fetchHospitableReviews(propertyId, hospPropertyId) {
  const { getSecret } = require('/opt/nodejs/lib/secrets');
  const env = process.env.ENVIRONMENT || 'dev';

  const secrets = await getSecret(`altus-retreats/${env}/hospitable`);
  const pat = secrets[propertyId] || secrets['default'];

  if (!pat || pat === 'MOCK' || pat === 'REPLACE_ME') {
    return { reviews: MOCK_REVIEWS, averageRating: 5.0, totalReviews: MOCK_REVIEWS.length };
  }

  const BASE_URL = 'https://public.api.hospitable.com';

  const res = await fetch(`${BASE_URL}/v2/properties/${hospPropertyId}/reviews?limit=20`, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hospitable reviews ${res.status}: ${text}`);
  }

  const data = await res.json();
  const rawReviews = data.data || data.reviews || [];

  const reviews = rawReviews.map(r => ({
    id:            r.id,
    reviewer_name: r.reviewer_name || r.guest_name || r.reviewer?.name || 'Guest',
    rating:        r.overall_rating || r.rating || 5,
    public_review: r.public_review || r.comment || r.body || '',
    created_at:    r.created_at || r.submitted_at || null,
  })).filter(r => r.public_review);

  // Compute average rating
  const validRatings = reviews.filter(r => r.rating);
  const averageRating = validRatings.length
    ? (validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length).toFixed(1)
    : null;

  return {
    reviews,
    averageRating: averageRating ? parseFloat(averageRating) : null,
    totalReviews: reviews.length,
  };
}
