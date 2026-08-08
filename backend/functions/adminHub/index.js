/**
 * GET  /admin/hub  — get hub site content
 * PUT  /admin/hub  — update hub site content
 *
 * Stores content for the altusretreats.net hub site.
 * Protected by Cognito — admin only.
 */
const db = require('/opt/nodejs/lib/db');
const { ok, serverError } = require('/opt/nodejs/lib/response');

const HUB_PK = 'HUB#altusretreats';
const HUB_SK = 'CONTENT';

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;

    if (method === 'GET') {
      const { Item } = await db.get({ PK: HUB_PK, SK: HUB_SK });
      return ok(Item ?? { PK: HUB_PK, SK: HUB_SK, content: {}, updatedAt: null });
    }

    if (method === 'PUT') {
      const body = event.body ? JSON.parse(event.body) : {};
      const now = new Date().toISOString();

      // Merge the incoming content fields
      const { Item: existing } = await db.get({ PK: HUB_PK, SK: HUB_SK });
      const updated = {
        PK: HUB_PK,
        SK: HUB_SK,
        GSI1PK: 'ENTITY_TYPE#HUB',
        GSI1SK: HUB_PK,
        entityType: 'HUB',
        content: {
          ...(existing?.content ?? {}),
          ...(body.content ?? body),
        },
        updatedAt: now,
        createdAt: existing?.createdAt ?? now,
      };
      await db.put(updated);
      return ok(updated);
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return serverError(err);
  }
};
