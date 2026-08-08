const db = require('/opt/nodejs/lib/db');
const { getHospitableClient } = require('/opt/nodejs/lib/hospitable');
const { ok, notFound, serverError } = require('/opt/nodejs/lib/response');

const CACHE_TTL_SECONDS = 3600; // 1 hour

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters;

    // 1. Get property config
    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });
    if (!property || !property.active) return notFound(`Property not found: ${propertyId}`);

    // 2. Check Hospitable cache
    const { Item: cache } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'CACHE#HOSPITABLE',
    });

    const now = Math.floor(Date.now() / 1000);
    if (cache && cache.ttl > now) {
      return ok({ property, hospitable: cache });
    }

    // 3. Fetch fresh from Hospitable
    const hospitable = await getHospitableClient(propertyId);
    const listing = await hospitable.getListing(property.hospitable.listingId);

    // 4. Write cache
    const ttl = now + CACHE_TTL_SECONDS;
    const cacheItem = {
      PK: `PROPERTY#${propertyId}`,
      SK: 'CACHE#HOSPITABLE',
      entityType: 'HOSPITABLE_CACHE',
      propertyId,
      ...listing,
      cachedAt: new Date().toISOString(),
      ttl,
    };
    await db.put(cacheItem);

    return ok({ property, hospitable: cacheItem });
  } catch (err) {
    return serverError(err);
  }
};
