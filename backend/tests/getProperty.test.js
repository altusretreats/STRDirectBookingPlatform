'use strict';
const { mockDdb, makeEvent, makeContext, SAMPLE_PROPERTY } = require('./mocks');

describe('getProperty', () => {
  let handler;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'altus-retreats-test';
    process.env.ENVIRONMENT = 'test';
    handler = require('../functions/getProperty/index').handler;
  });

  test('returns 200 with cached property data', async () => {
    const futureTs = Math.floor(Date.now() / 1000) + 3600;
    const cacheItem = { PK: 'PROPERTY#kentucky', SK: 'CACHE#HOSPITABLE', ttl: futureTs, photos: [], amenities: [] };

    mockDdb.get
      .mockResolvedValueOnce({ Item: SAMPLE_PROPERTY })   // property lookup
      .mockResolvedValueOnce({ Item: cacheItem });         // cache lookup

    const event = makeEvent({ pathParameters: { propertyId: 'kentucky' } });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.property.slug).toBe('kentucky');
    expect(body.hospitable).toEqual(cacheItem);
    expect(mockDdb.get).toHaveBeenCalledTimes(2);
    expect(mockDdb.put).not.toHaveBeenCalled(); // no cache write when cache is fresh
  });

  test('fetches from Hospitable and caches when cache is stale', async () => {
    const pastTs = Math.floor(Date.now() / 1000) - 100;
    const staleCache = { PK: 'PROPERTY#kentucky', SK: 'CACHE#HOSPITABLE', ttl: pastTs };
    const freshListing = { name: 'Kentucky Retreat', photos: [{ url: 'https://example.com/img.jpg' }], amenities: ['WiFi'] };

    mockDdb.get
      .mockResolvedValueOnce({ Item: SAMPLE_PROPERTY })
      .mockResolvedValueOnce({ Item: staleCache });

    const { getHospitableClient } = require('/opt/nodejs/lib/hospitable');
    getHospitableClient.mockResolvedValue({ getListing: jest.fn().mockResolvedValue(freshListing) });
    mockDdb.put.mockResolvedValue({});

    const event = makeEvent({ pathParameters: { propertyId: 'kentucky' } });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(200);
    expect(mockDdb.put).toHaveBeenCalledTimes(1); // cache was refreshed
  });

  test('returns 404 for unknown property', async () => {
    mockDdb.get.mockResolvedValueOnce({ Item: null });

    const event = makeEvent({ pathParameters: { propertyId: 'nowhere' } });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toMatch(/not found/i);
  });

  test('returns 404 for inactive property', async () => {
    mockDdb.get.mockResolvedValueOnce({ Item: { ...SAMPLE_PROPERTY, active: false } });

    const event = makeEvent({ pathParameters: { propertyId: 'kentucky' } });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(404);
  });
});
