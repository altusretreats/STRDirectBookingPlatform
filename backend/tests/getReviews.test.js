const { mockDdb, makeEvent } = require('./mocks');
const { handler, _test } = require('../functions/getReviews');

describe('getReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ENVIRONMENT = 'dev';
  });

  test('returns only published manual reviews without requiring Hospitable', async () => {
    mockDdb.get.mockResolvedValue({ Item: { slug: 'kentucky', active: true, hospitable: {} } });
    mockDdb.query.mockResolvedValue({ Items: [{
      reviewId: 'review-1', reviewerName: 'Sarah M.', reviewText: 'A wonderful stay.',
      rating: 5, stayDate: '2026-07-01', sourceLabel: 'Direct guest', featured: true, published: true,
    }] });

    const response = await handler(makeEvent({ pathParameters: { propertyId: 'kentucky' } }));
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.totalReviews).toBe(1);
    expect(body.reviews[0]).toMatchObject({
      id: 'review-1', reviewer_name: 'Sarah M.', public_review: 'A wonderful stay.', featured: true,
    });
  });

  test('orders featured reviews first and computes the average', () => {
    const result = _test.summarizeReviews([
      { id: 'new', rating: 4, created_at: '2026-08-01', featured: false },
      { id: 'featured', rating: 5, created_at: '2026-01-01', featured: true },
    ]);
    expect(result.reviews.map(review => review.id)).toEqual(['featured', 'new']);
    expect(result.averageRating).toBe(4.5);
  });
});
