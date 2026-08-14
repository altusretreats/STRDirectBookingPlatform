const db = require('/opt/nodejs/lib/db');
const { ok, badRequest, notFound, serverError } = require('/opt/nodejs/lib/response');

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    const { propertyId, sectionId } = event.pathParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    // Verify property exists
    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });
    if (!property) return notFound(`Property not found: ${propertyId}`);

    // GET — list all sections
    if (method === 'GET') {
      const { Items } = await db.query({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `PROPERTY#${propertyId}`,
          ':prefix': 'GUIDEBOOK#SECTION#',
        },
      });
      return ok({ propertyId, sections: Items ?? [] });
    }

    // PUT — upsert section
    if (method === 'PUT' && sectionId) {
      const { title, icon, order, items, published, aiPublished, sectionType, aiContext, audiences, important } = body;
      if (!title || order == null) return badRequest('title and order are required');

      const orderPadded = String(order).padStart(3, '0');
      const now = new Date().toISOString();

      await db.put({
        PK: `PROPERTY#${propertyId}`,
        SK: `GUIDEBOOK#SECTION#${orderPadded}#${sectionId}`,
        entityType: 'GUIDEBOOK_SECTION',
        sectionId,
        propertyId,
        order,
        title,
        icon: icon ?? null,
        sectionType: sectionType ?? 'general',
        aiContext: aiContext ?? '',
        audiences: Array.isArray(audiences) ? audiences : [],
        important: important === true,
        items: items ?? [],
        published: published ?? false,
        // Preserve the migration default shown in admin: existing guest-visible
        // sections are agent-visible until explicitly opted out.
        aiPublished: aiPublished ?? published ?? false,
        updatedAt: now,
      });
      return ok({ propertyId, sectionId, updated: true });
    }

    // DELETE — remove section
    if (method === 'DELETE' && sectionId) {
      // Find the exact SK (order prefix may vary)
      const { Items } = await db.query({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'sectionId = :sid',
        ExpressionAttributeValues: {
          ':pk': `PROPERTY#${propertyId}`,
          ':prefix': 'GUIDEBOOK#SECTION#',
          ':sid': sectionId,
        },
      });
      if (!Items?.length) return notFound(`Section not found: ${sectionId}`);

      await db.delete({ PK: Items[0].PK, SK: Items[0].SK });
      return ok({ propertyId, sectionId, deleted: true });
    }

    return badRequest('Unsupported method/path combination');
  } catch (err) {
    return serverError(err);
  }
};
