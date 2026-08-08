/**
 * Shared mock factories for all Lambda tests.
 */

// ── DynamoDB mock ─────────────────────────────────────────────────────────────
const mockDdb = {
  get: jest.fn(),
  query: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
jest.mock('/opt/nodejs/lib/db', () => mockDdb);

// ── Secrets Manager mock ──────────────────────────────────────────────────────
const mockGetSecret = jest.fn();
jest.mock('/opt/nodejs/lib/secrets', () => ({ getSecret: mockGetSecret }));

// ── Hospitable mock ───────────────────────────────────────────────────────────
const mockHospitable = {
  getListing: jest.fn(),
  getCalendar: jest.fn(),
  createReservation: jest.fn(),
};
jest.mock('/opt/nodejs/lib/hospitable', () => ({
  getHospitableClient: jest.fn().mockResolvedValue(mockHospitable),
}));

// ── API Gateway event factory ─────────────────────────────────────────────────
function makeEvent(overrides = {}) {
  return {
    httpMethod: 'GET',
    path: '/',
    pathParameters: {},
    queryStringParameters: null,
    headers: {},
    body: null,
    ...overrides,
  };
}

function makeContext() {
  return { awsRequestId: 'test-request-id' };
}

// ── Sample property record ────────────────────────────────────────────────────
const SAMPLE_PROPERTY = {
  PK: 'PROPERTY#kentucky',
  SK: 'METADATA',
  slug: 'kentucky',
  name: 'Altus Kentucky Retreat',
  active: true,
  hospitable: { listingId: 'listing-123' },
  branding: { primaryColor: '#2D4A3E' },
};

// ── Sample booking record ─────────────────────────────────────────────────────
const SAMPLE_BOOKING = {
  PK: 'BOOKING#bk_test123',
  SK: 'BOOKING#bk_test123',
  bookingId: 'bk_test123',
  propertyId: 'kentucky',
  status: 'PENDING',
  guest: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+15551234567' },
  checkIn: '2026-10-01', checkOut: '2026-10-06', nights: 5,
  guests: { adults: 2, children: 0, infants: 0 },
  pricing: { nightlyRate: 29500, subtotal: 147500, cleaningFee: 15000, taxes: 13812, total: 176312 },
  stripe: { paymentIntentId: 'pi_test_abc' },
  hospitable: { reservationId: null },
};

module.exports = { mockDdb, mockGetSecret, mockHospitable, makeEvent, makeContext, SAMPLE_PROPERTY, SAMPLE_BOOKING };
