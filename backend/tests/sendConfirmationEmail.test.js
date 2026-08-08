'use strict';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((params) => ({ params })),
}));

// Stub shared layer path
jest.mock('/opt/nodejs/lib/middleware', () => ({
  withMiddleware: (fn) => fn,
}));
jest.mock('/opt/nodejs/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('sendConfirmationEmail', () => {
  let handler;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.FROM_EMAIL = 'Altus Retreats <support@altusretreats.net>';
    handler = require('../functions/sendConfirmationEmail/index').handler;
    mockSend.mockResolvedValue({});
  });

  const payload = {
    guest: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    checkIn: '2026-10-01',
    checkOut: '2026-10-06',
    nights: 5,
    pricing: { nightlyRate: 29500, subtotal: 147500, cleaningFee: 15000, taxes: 13812, total: 176312 },
    bookingId: 'bk_abc123',
    propertyName: 'Altus Kentucky Retreat',
    guidebookUrl: 'https://kentuckyretreat.com/guidebook',
  };

  test('sends email and returns success', async () => {
    const result = await handler(payload);
    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('email subject contains property name', async () => {
    await handler(payload);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.params.Message.Subject.Data).toContain('Altus Kentucky Retreat');
  });

  test('sends to guest email', async () => {
    await handler(payload);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.params.Destination.ToAddresses[0]).toBe('jane@example.com');
  });

  test('HTML body contains booking ID', async () => {
    await handler(payload);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.params.Message.Body.Html.Data).toContain('bk_abc123');
  });

  test('HTML body contains guidebook CTA when URL provided', async () => {
    await handler(payload);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.params.Message.Body.Html.Data).toContain('kentuckyretreat.com/guidebook');
  });
});
