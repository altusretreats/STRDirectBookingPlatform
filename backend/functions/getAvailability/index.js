const db = require('/opt/nodejs/lib/db');
const { getHospitableClient } = require('/opt/nodejs/lib/hospitable');
const { ok, badRequest, notFound, serverError } = require('/opt/nodejs/lib/response');

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters;
    const { start_date, end_date } = event.queryStringParameters || {};

    if (!start_date || !end_date) {
      return badRequest('start_date and end_date query params are required (YYYY-MM-DD)');
    }

    // Verify property exists
    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });
    if (!property || !property.active) return notFound(`Property not found: ${propertyId}`);

    // Fetch calendar from Hospitable (live — no cache, guests need real-time availability)
    // Falls back to mock if no listing ID configured
    const hospPropertyId = property.hospitable?.listingId;
    const hospitable = await getHospitableClient(propertyId);
    const calendar = await hospitable.getCalendar(
      hospPropertyId || 'mock',
      start_date,
      end_date
    );

    return ok({ propertyId, start_date, end_date, calendar });
  } catch (err) {
    return serverError(err);
  }
};
