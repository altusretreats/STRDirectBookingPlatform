const { mockDdb, makeEvent } = require('./mocks');
const { handler, _test } = require('../functions/adminShop');

describe('adminShop', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists categories by numeric order and favorites first', async () => {
    mockDdb.get.mockResolvedValue({ Item: { slug: 'kentucky' } });
    mockDdb.query.mockResolvedValue({ Items: [
      { PK: 'PROPERTY#kentucky', SK: 'SHOP#CATEGORY#sleep', entityType: 'SHOP_CATEGORY', categoryId: 'sleep', name: 'Sleep', order: 20, active: true },
      { PK: 'PROPERTY#kentucky', SK: 'SHOP#CATEGORY#living', entityType: 'SHOP_CATEGORY', categoryId: 'living', name: 'Living', order: 10, active: true },
      { PK: 'PROPERTY#kentucky', SK: 'SHOP#PRODUCT#lamp', entityType: 'SHOP_PRODUCT', productId: 'lamp', name: 'Lamp', favorite: false },
      { PK: 'PROPERTY#kentucky', SK: 'SHOP#PRODUCT#pillow', entityType: 'SHOP_PRODUCT', productId: 'pillow', name: 'Pillow', favorite: true },
    ] });
    const response = await handler(makeEvent({
      httpMethod: 'GET', pathParameters: { propertyId: 'kentucky' }, path: '/admin/properties/kentucky/shop',
    }));
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.categories.map(item => item.categoryId)).toEqual(['living', 'sleep']);
    expect(body.products.map(item => item.productId)).toEqual(['pillow', 'lamp']);
    expect(body.categories[0].PK).toBeUndefined();
  });

  test('creates a property-scoped product in an existing category', async () => {
    mockDdb.get
      .mockResolvedValueOnce({ Item: { slug: 'kentucky' } })
      .mockResolvedValueOnce({ Item: { categoryId: 'sleep' } })
      .mockResolvedValueOnce({ Item: null });
    mockDdb.put.mockResolvedValue({});
    const response = await handler(makeEvent({
      httpMethod: 'PUT',
      path: '/admin/properties/kentucky/shop/products/cloud-pillow',
      pathParameters: { propertyId: 'kentucky', productId: 'cloud-pillow' },
      body: JSON.stringify({
        name: 'Cloud Pillow', description: 'The pillow used in the guest rooms.', categoryId: 'sleep',
        affiliateUrl: 'https://example.com/pillow', imageUrl: 'https://example.com/pillow.jpg', favorite: true, active: true,
      }),
    }));
    expect(response.statusCode).toBe(200);
    expect(mockDdb.put).toHaveBeenCalledWith(expect.objectContaining({
      PK: 'PROPERTY#kentucky', SK: 'SHOP#PRODUCT#cloud-pillow', entityType: 'SHOP_PRODUCT', favorite: true,
    }));
  });

  test('accepts HTTPS and rejects non-HTTPS links', () => {
    expect(_test.cleanUrl('https://example.com/item')).toBe('https://example.com/item');
    expect(_test.cleanUrl('http://example.com/item')).toBe('');
    expect(_test.cleanUrl('not a url')).toBe('');
  });
});
