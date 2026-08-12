const db = require('/opt/nodejs/lib/db');
const { ok, badRequest, notFound, serverError } = require('/opt/nodejs/lib/response');

const REVIEW_PREFIX = 'REVIEW#MANUAL#';

function clean(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    const { propertyId, reviewId } = event.pathParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    const { Item: property } = await db.get({ PK: `PROPERTY#${propertyId}`, SK: 'METADATA' });
    if (!property) return notFound(`Property not found: ${propertyId}`);

    if (method === 'GET') {
      const { Items = [] } = await db.query({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': `PROPERTY#${propertyId}`, ':prefix': REVIEW_PREFIX },
      });
      const reviews = Items.sort((a, b) =>
        Number(b.featured) - Number(a.featured)
        || String(b.stayDate || b.createdAt).localeCompare(String(a.stayDate || a.createdAt))
      );
      return ok({ propertyId, reviews: reviews.map(stripKeys) });
    }

    if (method === 'PUT' && reviewId) {
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(reviewId)) return badRequest('Invalid review ID');
      const reviewerName = clean(body.reviewerName, 100);
      const reviewText = clean(body.reviewText, 3000);
      const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
      if (!reviewerName || !reviewText) return badRequest('Reviewer name and review text are required');

      const key = { PK: `PROPERTY#${propertyId}`, SK: `${REVIEW_PREFIX}${reviewId}` };
      const { Item: existing } = await db.get(key);
      const now = new Date().toISOString();
      const review = {
        ...key,
        entityType: 'MANUAL_REVIEW',
        reviewId,
        propertyId,
        reviewerName,
        reviewText,
        rating,
        stayDate: clean(body.stayDate, 10) || null,
        sourceLabel: clean(body.sourceLabel, 80) || 'Guest review',
        featured: Boolean(body.featured),
        published: Boolean(body.published),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await db.put(review);
      return ok({ review: stripKeys(review) });
    }

    if (method === 'DELETE' && reviewId) {
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(reviewId)) return badRequest('Invalid review ID');
      await db.delete({ PK: `PROPERTY#${propertyId}`, SK: `${REVIEW_PREFIX}${reviewId}` });
      return ok({ propertyId, reviewId, deleted: true });
    }

    return badRequest('Unsupported method/path combination');
  } catch (err) {
    return serverError(err);
  }
};

function stripKeys({ PK, SK, ...review }) { return review; }
