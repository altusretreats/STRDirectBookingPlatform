'use strict';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((params) => ({ params })),
}));

jest.mock('/opt/nodejs/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('sendPreArrivalEmail', () => {
  let handler;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.FROM_EMAIL = 'Altus Retreats <support@altusretreats.net>';
    handler = require('../functions/sendPreArrivalEmail/index').handler;
    mockSend.mockResolvedValue({});
  });

  const payload = {
    bookingId: 'bk_abc123',
    propertyId: 'kentucky',
    propertyName: 'Altus Kentucky Retreat',
    guest: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    checkIn: '2026-10-01',
    checkOut: '2026-10-06',
    guidebookUrl: 'https://kentuckyretreat.com/guidebook',
    checkInCode: '4829',
  };

  test('sends pre-arrival email and returns success', async () => {
    const result = await handler(payload);
    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('subject says arriving tomorrow', async () => {
    await handler(payload);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.params.Message.Subject.Data).toContain('tomorrow');
  });

  test('HTML contains check-in code when provided', async () => {
    await handler(payload);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.params.Message.Body.Html.Data).toContain('4829');
  });

  test('HTML contains guidebook link', async () => {
    await handler(payload);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.params.Message.Body.Html.Data).toContain('kentuckyretreat.com/guidebook');
  });

  test('HTML omits code box when checkInCode not provided', async () => {
    const result = await handler({ ...payload, checkInCode: null });
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.params.Message.Body.Html.Data).not.toContain('Door Code');
    expect(result.success).toBe(true);
  });
});
