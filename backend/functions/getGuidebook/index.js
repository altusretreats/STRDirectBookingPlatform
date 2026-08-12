const db = require('/opt/nodejs/lib/db');
const { ok, notFound, serverError } = require('/opt/nodejs/lib/response');

function sanitizeItem(item = {}) {
  const { aiContext, hostNotes, ...guestItem } = item;
  return guestItem;
}

function sanitizeSection(section = {}) {
  return {
    sectionId: section.sectionId,
    title: section.title,
    icon: section.icon ?? null,
    order: section.order,
    sectionType: section.sectionType ?? 'general',
    items: (section.items ?? []).map(sanitizeItem),
  };
}

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters;

    // Verify property exists and is active
    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });
    if (!property || !property.active) return notFound(`Property not found: ${propertyId}`);

    // Fetch all published guidebook sections (sorted by SK order prefix)
    const { Items: sections } = await db.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'published = :true',
      ExpressionAttributeValues: {
        ':pk': `PROPERTY#${propertyId}`,
        ':prefix': 'GUIDEBOOK#SECTION#',
        ':true': true,
      },
    });

    return ok({
      propertyId,
      propertyName: property.name,
      branding: property.branding,
      // AI context and private host notes belong to future agent/admin feeds,
      // never the public guest endpoint.
      sections: (sections ?? []).map(sanitizeSection),
    });
  } catch (err) {
    return serverError(err);
  }
};
