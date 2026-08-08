'use strict';
const { mockDdb, mockGetSecret, mockHospitable, makeEvent, makeContext, SAMPLE_PROPERTY, SAMPLE_BOOKING } = require('./mocks');

// Mock stripe with constructEvent
const mockConstructEvent = jest.fn();
const mockUpdateSecret = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
  }));
});

describe('stripeWebhook', () => {
  let handler;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'altus-retreats-test';
    process.env.ENVIRONMENT = 'test';
    handler = require('../functions/stripeWebhook/index').handler;

    mockGetSecret.mockResolvedValue({ secretKey: 'sk_test_mock', webhookSecret: 'whsec_mock' });
  });

  test('confirms booking and writes to Hospitable on payment_intent.succeeded', async () => {
    const paymentIntent = { id: 'pi_test_abc', latest_charge: 'ch_test_abc', status: 'succeeded' };
    mockConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded', data: { object: paymentIntent } });
    mockDdb.query.mockResolvedValue({ Items: [SAMPLE_BOOKING] });
    mockDdb.get.mockResolvedValue({ Item: SAMPLE_PROPERTY });
    mockDdb.update.mockResolvedValue({});
    mockHospitable.createReservation.mockResolvedValue({ id: 'hosp-res-123' });

    const event = makeEvent({
      httpMethod: 'POST',
      path: '/webhooks/stripe',
      headers: { 'stripe-signature': 'sig_test' },
      body: JSON.stringify(paymentIntent),
    });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.action).toBe('confirmed');
    expect(body.bookingId).toBe('bk_test123');

    // DynamoDB update should set status to CONFIRMED
    const updateCall = mockDdb.update.mock.calls[0][0];
    expect(updateCall.ExpressionAttributeValues[':status']).toBe('CONFIRMED');
    expect(updateCall.ExpressionAttributeValues[':hospId']).toBe('hosp-res-123');
  });

  test('returns 400 on invalid Stripe signature', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Signature mismatch'); });

    const event = makeEvent({
      httpMethod: 'POST',
      headers: { 'stripe-signature': 'bad_sig' },
      body: '{}',
    });
    const result = await handler(event, makeContext());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/signature/i);
  });

  test('ignores non-succeeded event types', async () => {
    mockConstructEvent.mockReturnValue({ type: 'payment_intent.created', data: { object: {} } });

    const event = makeEvent({ httpMethod: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).action).toBe('ignored');
    expect(mockDdb.query).not.toHaveBeenCalled();
  });

  test('still confirms booking even if Hospitable sync fails', async () => {
    const paymentIntent = { id: 'pi_test_abc', latest_charge: 'ch_test_abc' };
    mockConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded', data: { object: paymentIntent } });
    mockDdb.query.mockResolvedValue({ Items: [SAMPLE_BOOKING] });
    mockDdb.get.mockResolvedValue({ Item: SAMPLE_PROPERTY });
    mockDdb.update.mockResolvedValue({});
    mockHospitable.createReservation.mockRejectedValue(new Error('Hospitable is down'));

    const event = makeEvent({ httpMethod: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' });
    const result = await handler(event, makeContext());

    // Should still confirm — Hospitable failure is non-fatal
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).action).toBe('confirmed');
    expect(mockDdb.update).toHaveBeenCalledTimes(1);
  });
});
