const db = require('/opt/nodejs/lib/db');
const { ok, created, badRequest, notFound, serverError } = require('/opt/nodejs/lib/response');

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    const { propertyId } = event.pathParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    // GET /admin/properties — list all
    if (method === 'GET' && !propertyId) {
      const { Items } = await db.query({
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :type',
        ExpressionAttributeValues: { ':type': 'ENTITY_TYPE#PROPERTY' },
      });
      return ok({ properties: Items ?? [] });
    }

    // GET /admin/properties/{propertyId} — get single
    if (method === 'GET' && propertyId) {
      const { Item } = await db.get({ PK: `PROPERTY#${propertyId}`, SK: 'METADATA' });
      if (!Item) return notFound(`Property not found: ${propertyId}`);
      return ok(Item);
    }

    // POST /admin/properties — create
    if (method === 'POST') {
      const { slug, name, domain, hospitable, branding, address } = body;
      if (!slug || !name) return badRequest('slug and name are required');

      const now = new Date().toISOString();
      const item = {
        PK: `PROPERTY#${slug}`,
        SK: 'METADATA',
        GSI1PK: 'ENTITY_TYPE#PROPERTY',
        GSI1SK: `PROPERTY#${slug}`,
        entityType: 'PROPERTY',
        slug,
        name,
        domain: domain ?? null,
        hospitable: hospitable ?? {},
        branding: branding ?? {},
        address: address ?? {},
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await db.put(item);
      return created(item);
    }

    // PUT /admin/properties/{propertyId} — update
    if (method === 'PUT' && propertyId) {
      const { Item: existing } = await db.get({
        PK: `PROPERTY#${propertyId}`,
        SK: 'METADATA',
      });
      if (!existing) return notFound(`Property not found: ${propertyId}`);

      const now = new Date().toISOString();
      const updates = { ...body, updatedAt: now };
      delete updates.PK; delete updates.SK; delete updates.entityType;

      const expr = Object.keys(updates).map((k) => `#${k} = :${k}`).join(', ');
      const names = Object.fromEntries(Object.keys(updates).map((k) => [`#${k}`, k]));
      const values = Object.fromEntries(Object.entries(updates).map(([k, v]) => [`:${k}`, v]));

      await db.update({
        Key: { PK: `PROPERTY#${propertyId}`, SK: 'METADATA' },
        UpdateExpression: `SET ${expr}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      });
      return ok({ propertyId, updated: updates });
    }

    return badRequest('Unsupported method/path combination');
  } catch (err) {
    return serverError(err);
  }
};
