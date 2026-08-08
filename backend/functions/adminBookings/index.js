'use strict';
const db = require('/opt/nodejs/lib/db');
const { ok, badRequest, serverError } = require('/opt/nodejs/lib/response');
const { withMiddleware } = require('/opt/nodejs/lib/middleware');
const { logger } = require('/opt/nodejs/lib/logger');

/**
 * GET /admin/properties/{propertyId}/bookings
 * Query params:
 *   status  - filter by status (CONFIRMED|PENDING|CANCELLED|FAILED); optional
 *   from    - ISO date, lower bound for check-in; optional
 *   to      - ISO date, upper bound for check-in; optional
 *   limit   - max items (default 50, max 200)
 */
const handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters || {};
    if (!propertyId) return badRequest('Missing propertyId');

    const qs = event.queryStringParameters || {};
    const limit = Math.min(parseInt(qs.limit || '50', 10), 200);
    const statusFilter = qs.status?.toUpperCase();

    logger.info('List admin bookings', { propertyId, statusFilter, limit });

    const params = {
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `PROPERTY#${propertyId}` },
      Limit: limit,
      ScanIndexForward: false, // most recent check-in first
    };

    if (qs.from && qs.to) {
      params.KeyConditionExpression += ' AND GSI1SK BETWEEN :from AND :to';
      params.ExpressionAttributeValues[':from'] = `CHECKIN#${qs.from}`;
      params.ExpressionAttributeValues[':to'] = `CHECKIN#${qs.to}`;
    } else if (qs.from) {
      params.KeyConditionExpression += ' AND GSI1SK >= :from';
      params.ExpressionAttributeValues[':from'] = `CHECKIN#${qs.from}`;
    }

    if (statusFilter) {
      params.FilterExpression = '#status = :status';
      params.ExpressionAttributeNames = { '#status': 'status' };
      params.ExpressionAttributeValues[':status'] = statusFilter;
    }

    const { Items = [] } = await db.query(params);

    const bookings = Items.map(({ PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest }) => rest);

    return ok({ bookings, count: bookings.length });
  } catch (err) {
    return serverError(err);
  }
};

module.exports = { handler: withMiddleware(handler) };
