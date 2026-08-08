'use strict';
const { mockDdb, mockGetSecret, makeEvent, makeContext, SAMPLE_PROPERTY } = require('./mocks');

// Mock stripe
const mockPaymentIntentCreate = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockPaymentIntentCreate },
  }));
});

describe('createBooking', () => {
  let handler;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'altus-retreats-test';
    process.env.ENVIRONMENT = 'test';
    handler = require('../functions/createBooking/index').handler;

    mockGetSecret.mockResolvedValue({ secretKey: 'sk_test_mock', webhookSecret: 'whsec_mock' });
    mockDdb.get.mockResolvedValue({ Item: SAMPLE_PROPERTY });
    mockDdb.put.mockResolvedValue({});
    mockPaymentIntentCreate.mockResolvedValue({
      id: 'pi_test_abc',
      client_secret: 'pi_test_abc_secret_xyz',
    });
  });

  const validBody = {
    checkIn: '2026-10-01', checkOut: '2026-10-06',
    guests: { adults: 2, children: 0, infants: 0 },
    guest: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+15551234567' },
    pricing: { nightlyRate: 29500, subtotal: 147500, cleaningFee: 15000, taxes: 13812, total: 176312 },
  };

  test('creates booking and returns clientSecret', async () => {
    const event = makeEvent({
      httpMethod: 'POST',
      pathParameters: { propertyId: 'kentucky' },
      body: JSON.stringify(validBody),
    });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.bookingId).toMatch(/^bk_/);
    expect(body.clientSecret).toBe('pi_test_abc_secret_xyz');
    expect(mockDdb.put).toHaveBeenCalledTimes(1);

    // Verify the DynamoDB record has correct structure
    // db.put(item) passes the item directly, so mock.calls[0][0] is the item itself
    const savedItem = mockDdb.put.mock.calls[0][0];
    expect(savedItem.status).toBe('PENDING');
    expect(savedItem.propertyId).toBe('kentucky');
    expect(savedItem.nights).toBe(5);
    expect(savedItem.GSI2PK).toBe('STRIPE#pi_test_abc');
  });

  test('returns 400 when required fields are missing', async () => {
    const event = makeEvent({
      httpMethod: 'POST',
      pathParameters: { propertyId: 'kentucky' },
      body: JSON.stringify({ checkIn: '2026-10-01' }), // missing checkOut, guest, etc.
    });
    const result = await handler(event, makeContext());
    expect(result.statusCode).toBe(400);
  });

  test('returns 404 for inactive property', async () => {
    mockDdb.get.mockResolvedValueOnce({ Item: { ...SAMPLE_PROPERTY, active: false } });
    const event = makeEvent({
      httpMethod: 'POST',
      pathParameters: { propertyId: 'kentucky' },
      body: JSON.stringify(validBody),
    });
    const result = await handler(event, makeContext());
    expect(result.statusCode).toBe(404);
  });
});
