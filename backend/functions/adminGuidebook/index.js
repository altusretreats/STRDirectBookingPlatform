const db = require('/opt/nodejs/lib/db');
const { ok, badRequest, notFound, serverError } = require('/opt/nodejs/lib/response');

async function findSectionRecords(propertyId, sectionId) {
  const params = {
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `PROPERTY#${propertyId}`,
      ':prefix': 'GUIDEBOOK#SECTION#',
    },
  };

  if (sectionId) {
    params.FilterExpression = 'sectionId = :sid';
    params.ExpressionAttributeValues[':sid'] = sectionId;
  }

  const { Items } = await db.query(params);
  return Items ?? [];
}

function latestUniqueSections(items) {
  const bySectionId = new Map();
  for (const item of items) {
    const current = bySectionId.get(item.sectionId);
    if (!current || String(item.updatedAt ?? '') > String(current.updatedAt ?? '')) {
      bySectionId.set(item.sectionId, item);
    }
  }
  return [...bySectionId.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

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
      const items = await findSectionRecords(propertyId);
      return ok({ propertyId, sections: latestUniqueSections(items) });
    }

    // PUT — upsert section
    if (method === 'PUT' && sectionId) {
      const { title, icon, order, items, published, aiPublished, sectionType, aiContext, audiences, important } = body;
      if (!title || order == null) return badRequest('title and order are required');

      const orderPadded = String(order).padStart(3, '0');
      const now = new Date().toISOString();

      const item = {
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
      };

      // Since order is part of the sort key, replace all keys for this logical
      // section atomically whenever it is saved or moved.
      const existing = await findSectionRecords(propertyId, sectionId);
      const stale = existing.filter(record => record.SK !== item.SK);
      await db.transactWrite([
        ...stale.map(record => ({ Delete: { Key: { PK: record.PK, SK: record.SK } } })),
        { Put: { Item: item } },
      ]);
      return ok({ propertyId, sectionId, updated: true });
    }

    // DELETE — remove section
    if (method === 'DELETE' && sectionId) {
      // Remove every matching key so legacy reorder duplicates cannot survive.
      const items = await findSectionRecords(propertyId, sectionId);
      if (!items.length) return notFound(`Section not found: ${sectionId}`);

      await db.transactWrite(items.map(item => ({ Delete: { Key: { PK: item.PK, SK: item.SK } } })));
      return ok({ propertyId, sectionId, deleted: true });
    }

    return badRequest('Unsupported method/path combination');
  } catch (err) {
    return serverError(err);
  }
};
