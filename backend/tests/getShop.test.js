const { mockDdb, makeEvent } = require('./mocks');
const { handler, _test } = require('../functions/getShop');

describe('getShop', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns only active products in active categories without DynamoDB metadata', async () => {
    mockDdb.get.mockResolvedValue({ Item: { slug: 'kentucky', active: true } });
    mockDdb.query.mockResolvedValue({ Items: [
      { entityType: 'SHOP_CATEGORY', categoryId: 'sleep', name: 'Sleep', order: 2, active: true },
      { entityType: 'SHOP_CATEGORY', categoryId: 'hidden', name: 'Hidden', order: 1, active: false },
      { entityType: 'SHOP_PRODUCT', productId: 'pillow', name: 'Pillow', description: 'Soft', categoryId: 'sleep', affiliateUrl: 'https://example.com', imageUrl: 'https://example.com/a.jpg', active: true, favorite: true, PK: 'secret', SK: 'secret' },
      { entityType: 'SHOP_PRODUCT', productId: 'hidden-product', name: 'Hidden', description: 'No', categoryId: 'hidden', affiliateUrl: 'https://example.com', imageUrl: 'https://example.com/b.jpg', active: true },
      { entityType: 'SHOP_PRODUCT', productId: 'inactive', name: 'Inactive', description: 'No', categoryId: 'sleep', affiliateUrl: 'https://example.com', imageUrl: 'https://example.com/c.jpg', active: false },
    ] });
    const response = await handler(makeEvent({ pathParameters: { propertyId: 'kentucky' } }));
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.categories).toEqual([{ id: 'sleep', name: 'Sleep', order: 2 }]);
    expect(body.products).toHaveLength(1);
    expect(body.products[0]).toEqual(expect.objectContaining({ id: 'pillow', favorite: true }));
    expect(body.products[0].PK).toBeUndefined();
  });

  test('sorts favorites first and then alphabetically', () => {
    const result = _test.buildPublicShop('kentucky', [
      { entityType: 'SHOP_CATEGORY', categoryId: 'all', name: 'All', order: 0, active: true },
      { entityType: 'SHOP_PRODUCT', productId: 'z', name: 'Zebra', categoryId: 'all', active: true },
      { entityType: 'SHOP_PRODUCT', productId: 'b', name: 'Blanket', categoryId: 'all', active: true, favorite: true },
      { entityType: 'SHOP_PRODUCT', productId: 'a', name: 'Amber', categoryId: 'all', active: true },
    ]);
    expect(result.products.map(product => product.id)).toEqual(['b', 'a', 'z']);
  });
});
