/**
 * POST /admin/properties/{propertyId}/sync
 *
 * Fetches the full listing from Hospitable and stores it under
 * the property record in DynamoDB. Sets lastSyncedAt timestamp.
 * Protected by Cognito — admin only.
 */
const db = require('/opt/nodejs/lib/db');
const { getHospitableClient } = require('/opt/nodejs/lib/hospitable');
const { ok, notFound, serverError } = require('/opt/nodejs/lib/response');
const logger = require('/opt/nodejs/lib/logger');

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters || {};
    if (!propertyId) return { statusCode: 400, body: JSON.stringify({ error: 'propertyId required' }) };

    // Load property record from DynamoDB to get the Hospitable property UUID
    const { Item: property } = await db.get({ PK: `PROPERTY#${propertyId}`, SK: 'METADATA' });
    if (!property) return notFound(`Property not found: ${propertyId}`);

    const hospPropertyId = property.hospitable?.propertyId;
    if (!hospPropertyId) {
      return { statusCode: 422, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No Hospitable propertyId configured for this property. Set hospitable.propertyId in the property record first.' }) };
    }

    logger.info('Syncing property from Hospitable', { propertyId, hospPropertyId });

    const client = await getHospitableClient(propertyId);
    const listing = await client.getListing(hospPropertyId);

    // Normalize the data we store — keep it clean and consistent
    const synced = {
      name:               listing.name              ?? null,
      summary:            listing.summary           ?? listing.description ?? null,
      description:        listing.description       ?? null,
      propertyType:       listing.propertyType      ?? null,
      roomType:           listing.roomType          ?? null,
      tags:               listing.tags              ?? [],
      bedrooms:           listing.bedrooms          ?? null,
      bathrooms:          listing.bathrooms         ?? null,
      maxGuests:          listing.maxGuests         ?? null,
      checkInTime:        listing.checkInTime       ?? null,
      checkOutTime:       listing.checkOutTime      ?? null,
      minimumStay:        listing.minimumStay       ?? 2,
      amenities:          listing.amenities         ?? [],
      photos:             (listing.photos ?? []).map(p => ({
                            url:     p.url || p.large || p.original || p,
                            caption: p.caption || p.description || '',
                          })),
      houseRules:         listing.houseRules        ?? [],
      cancellationPolicy: listing.cancellationPolicy ?? null,
      goodToKnow:         listing.goodToKnow        ?? null,
      otherDetails:       listing.otherDetails      ?? null,
      location:           listing.location          ?? null,
    };

    const now = new Date().toISOString();

    await db.update({
      Key: { PK: `PROPERTY#${propertyId}`, SK: 'METADATA' },
      UpdateExpression: 'SET #h = :h, #updatedAt = :now',
      ExpressionAttributeNames: { '#h': 'hospitable', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: {
        ':h': {
          ...property.hospitable,   // preserve propertyId and any other config fields
          cached: synced,
          lastSyncedAt: now,
        },
        ':now': now,
      },
    });

    logger.info('Sync complete', { propertyId, photos: synced.photos.length, amenities: synced.amenities.length });

    return ok({
      propertyId,
      lastSyncedAt: now,
      summary: {
        name:      synced.name,
        photos:    synced.photos.length,
        amenities: synced.amenities.length,
        bedrooms:  synced.bedrooms,
        bathrooms: synced.bathrooms,
        maxGuests: synced.maxGuests,
      },
    });
  } catch (err) {
    return serverError(err);
  }
};
