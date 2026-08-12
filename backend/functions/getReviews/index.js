/**
 * GET /properties/{propertyId}/reviews
 *
 * Returns published, property-scoped reviews managed in the Altus admin.
 * Third-party channel reviews are intentionally not imported.
 */
const db = require('/opt/nodejs/lib/db');
const { ok, notFound, serverError } = require('/opt/nodejs/lib/response');

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters;
    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });

    if (!property || !property.active) {
      return notFound(`Property not found: ${propertyId}`);
    }

    const reviews = await fetchPublishedReviews(propertyId);
    return ok(summarizeReviews(reviews));
  } catch (err) {
    return serverError(err);
  }
};

async function fetchPublishedReviews(propertyId) {
  const { Items = [] } = await db.query({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    FilterExpression: 'published = :published',
    ExpressionAttributeValues: {
      ':pk': `PROPERTY#${propertyId}`,
      ':prefix': 'REVIEW#MANUAL#',
      ':published': true,
    },
  });

  return Items.map(review => ({
    id: review.reviewId,
    reviewer_name: review.reviewerName,
    rating: review.rating,
    public_review: review.reviewText,
    created_at: review.stayDate || review.createdAt,
    source: review.sourceLabel || 'Guest review',
    featured: Boolean(review.featured),
  }));
}

function summarizeReviews(reviews = []) {
  const sortedReviews = [...reviews].sort((a, b) =>
    Number(Boolean(b.featured)) - Number(Boolean(a.featured))
    || String(b.created_at || '').localeCompare(String(a.created_at || ''))
  );
  const ratings = sortedReviews
    .map(review => Number(review.rating))
    .filter(Number.isFinite);
  const averageRating = ratings.length
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
    : null;

  return {
    reviews: sortedReviews,
    averageRating,
    totalReviews: sortedReviews.length,
  };
}

exports._test = { summarizeReviews };
