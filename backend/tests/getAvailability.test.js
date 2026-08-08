'use strict';
const { mockDdb, mockHospitable, makeEvent, makeContext, SAMPLE_PROPERTY } = require('./mocks');

describe('getAvailability', () => {
  let handler;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'altus-retreats-test';
    process.env.ENVIRONMENT = 'test';
    handler = require('../functions/getAvailability/index').handler;
  });

  test('returns 200 with calendar data', async () => {
    mockDdb.get.mockResolvedValueOnce({ Item: SAMPLE_PROPERTY });
    mockHospitable.getCalendar.mockResolvedValue({
      days: [
        { date: '2026-10-01', available: true, price: 29500 },
        { date: '2026-10-02', available: false, price: null },
      ],
    });

    const event = makeEvent({
      pathParameters: { propertyId: 'kentucky' },
      queryStringParameters: { start_date: '2026-10-01', end_date: '2026-10-31' },
    });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.calendar.days).toHaveLength(2);
    expect(body.propertyId).toBe('kentucky');
  });

  test('returns 400 when dates are missing', async () => {
    const event = makeEvent({
      pathParameters: { propertyId: 'kentucky' },
      queryStringParameters: {},
    });
    const result = await handler(event, makeContext());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/start_date/i);
  });

  test('returns 404 for unknown property', async () => {
    mockDdb.get.mockResolvedValueOnce({ Item: null });
    const event = makeEvent({
      pathParameters: { propertyId: 'nowhere' },
      queryStringParameters: { start_date: '2026-10-01', end_date: '2026-10-31' },
    });
    const result = await handler(event, makeContext());
    expect(result.statusCode).toBe(404);
  });
});
