/**
 * GET /properties/{propertyId}
 *
 * Returns property data for the public booking site.
 * Data is composed from:
 *   1. DynamoDB METADATA record (authoritative config + admin-edited content)
 *   2. hospitable.cached — Hospitable data written by syncProperty Lambda
 *
 * The response shape expected by the frontend:
 *   { property, hospitable }
 *   property.content  — admin overrides (heroHeadline, heroPhoto, aboutBody…)
 *   property.location — admin-edited location fields
 *   hospitable        — cached Hospitable data (photos, amenities, rules…)
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

    // Hospitable cached data lives on the METADATA record itself (written by syncProperty)
    // Merge admin location overrides on top of Hospitable location data
    const hospCached   = property.hospitable?.cached ?? null;
    const adminContent = property.content  ?? {};
    const adminLocation= property.location ?? {};

    // Resolve location: admin overrides Hospitable
    const resolvedLocation = hospCached?.location
      ? { ...hospCached.location, ...stripEmpty(adminLocation) }
      : stripEmpty(adminLocation) || null;

    return ok({
      property: {
        slug:      property.slug,
        name:      property.name,
        domain:    property.domain,
        active:    property.active,
        bedrooms:  property.bedrooms,
        bathrooms: property.bathrooms,
        maxGuests: property.maxGuests,
        content:   adminContent,
        location:  resolvedLocation,
        branding:  property.branding ?? {},
        pricing:   property.pricing  ?? {},
      },
      hospitable: hospCached,
      meta: {
        lastSyncedAt: property.hospitable?.lastSyncedAt ?? null,
      },
    });
  } catch (err) {
    return serverError(err);
  }
};

// Remove null/undefined/empty-string values so we don't clobber Hospitable data with blanks
function stripEmpty(obj) {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
}
