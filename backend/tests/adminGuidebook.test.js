const { mockDdb, makeEvent } = require('./mocks');
const { handler } = require('../functions/adminGuidebook');

describe('adminGuidebook', () => {
  beforeEach(() => jest.clearAllMocks());

  test('atomically replaces stale sort keys when a section is reordered', async () => {
    mockDdb.get.mockResolvedValue({ Item: { slug: 'kentucky' } });
    mockDdb.query.mockResolvedValue({ Items: [
      { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#020#checkin', sectionId: 'checkin' },
      { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#030#checkin', sectionId: 'checkin' },
    ] });
    mockDdb.transactWrite.mockResolvedValue({});

    const response = await handler(makeEvent({
      httpMethod: 'PUT',
      pathParameters: { propertyId: 'kentucky', sectionId: 'checkin' },
      body: JSON.stringify({ title: 'Check-In', order: 40, items: [] }),
    }));

    expect(response.statusCode).toBe(200);
    expect(mockDdb.transactWrite).toHaveBeenCalledWith([
      { Delete: { Key: { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#020#checkin' } } },
      { Delete: { Key: { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#030#checkin' } } },
      { Put: { Item: expect.objectContaining({
        PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#040#checkin', sectionId: 'checkin', order: 40,
      }) } },
    ]);
  });

  test('deletes every stored copy of a section', async () => {
    mockDdb.get.mockResolvedValue({ Item: { slug: 'kentucky' } });
    mockDdb.query.mockResolvedValue({ Items: [
      { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#020#wifi', sectionId: 'wifi' },
      { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#050#wifi', sectionId: 'wifi' },
    ] });
    mockDdb.transactWrite.mockResolvedValue({});

    const response = await handler(makeEvent({
      httpMethod: 'DELETE', pathParameters: { propertyId: 'kentucky', sectionId: 'wifi' },
    }));

    expect(response.statusCode).toBe(200);
    expect(mockDdb.transactWrite).toHaveBeenCalledWith([
      { Delete: { Key: { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#020#wifi' } } },
      { Delete: { Key: { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#050#wifi' } } },
    ]);
  });

  test('lists only the latest record for each logical section', async () => {
    mockDdb.get.mockResolvedValue({ Item: { slug: 'kentucky' } });
    mockDdb.query.mockResolvedValue({ Items: [
      { sectionId: 'wifi', order: 20, updatedAt: '2026-08-13T10:00:00Z' },
      { sectionId: 'welcome', order: 10, updatedAt: '2026-08-13T11:00:00Z' },
      { sectionId: 'wifi', order: 30, updatedAt: '2026-08-13T12:00:00Z' },
    ] });

    const response = await handler(makeEvent({
      httpMethod: 'GET', pathParameters: { propertyId: 'kentucky' },
    }));

    expect(JSON.parse(response.body).sections).toEqual([
      expect.objectContaining({ sectionId: 'welcome', order: 10 }),
      expect.objectContaining({ sectionId: 'wifi', order: 30 }),
    ]);
  });
});
