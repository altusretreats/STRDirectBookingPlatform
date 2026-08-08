'use strict';
const db = require('/opt/nodejs/lib/db');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

exports.handler = async (event) => {
  const method = event.httpMethod;

  // ── POST /waitlist (public) ──────────────────────────────────────
  if (method === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

    const email  = (body.email  || '').trim().toLowerCase();
    const source = (body.source || 'unknown').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) };
    }

    const now = new Date().toISOString();

    await db.put({
      PK:        'WAITLIST',
      SK:        `${source}#${now}`,
      email,
      source,
      createdAt: now,
      type:      'WAITLIST_ENTRY',
    });

    return { statusCode: 201, headers, body: JSON.stringify({ ok: true }) };
  }

  // ── GET /admin/waitlist (Cognito protected) ──────────────────────
  if (method === 'GET') {
    const source = event.queryStringParameters?.source;

    const params = {
      KeyConditionExpression: source
        ? 'PK = :pk AND begins_with(SK, :src)'
        : 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'WAITLIST',
        ...(source ? { ':src': source } : {}),
      },
      ScanIndexForward: false, // newest first
    };

    const { Items = [] } = await db.query(params);
    const entries = Items.map(({ email, source, createdAt }) => ({ email, source, createdAt }));

    return { statusCode: 200, headers, body: JSON.stringify({ entries, count: entries.length }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
