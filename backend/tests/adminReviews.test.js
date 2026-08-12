const { mockDdb, makeEvent } = require('./mocks');
const { handler } = require('../functions/adminReviews');

describe('adminReviews', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a property-scoped review', async () => {
    mockDdb.get
      .mockResolvedValueOnce({ Item: { slug: 'kentucky' } })
      .mockResolvedValueOnce({ Item: null });
    mockDdb.put.mockResolvedValue({});

    const response = await handler(makeEvent({
      httpMethod: 'PUT',
      pathParameters: { propertyId: 'kentucky', reviewId: 'review-1' },
      body: JSON.stringify({ reviewerName: 'Sarah M.', reviewText: 'A wonderful stay.', rating: 5, featured: true, published: true }),
    }));

    expect(response.statusCode).toBe(200);
    expect(mockDdb.put).toHaveBeenCalledWith(expect.objectContaining({
      PK: 'PROPERTY#kentucky', SK: 'REVIEW#MANUAL#review-1', entityType: 'MANUAL_REVIEW', featured: true,
    }));
  });
});
