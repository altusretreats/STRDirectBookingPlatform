/** GET /properties/{propertyId}/shop — public active Shop Your Stay catalog. */
const db = require('/opt/nodejs/lib/db');
const { ok, notFound, serverError } = require('/opt/nodejs/lib/response');

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters || {};
    const { Item: property } = await db.get({ PK: `PROPERTY#${propertyId}`, SK: 'METADATA' });
    if (!property || !property.active) return notFound(`Property not found: ${propertyId}`);

    const { Items = [] } = await db.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `PROPERTY#${propertyId}`, ':prefix': 'SHOP#' },
    });
    return ok(buildPublicShop(propertyId, Items));
  } catch (err) {
    return serverError(err);
  }
};

function buildPublicShop(propertyId, items) {
  const categories = items
    .filter(item => item.entityType === 'SHOP_CATEGORY' && item.active)
    .map(item => ({ id: item.categoryId, name: item.name, order: Number(item.order) || 0 }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const activeCategoryIds = new Set(categories.map(category => category.id));
  const products = items
    .filter(item => item.entityType === 'SHOP_PRODUCT' && item.active && activeCategoryIds.has(item.categoryId))
    .map(item => ({
      id: item.productId,
      name: item.name,
      description: item.description,
      categoryId: item.categoryId,
      room: item.room || null,
      affiliateUrl: item.affiliateUrl,
      imageUrl: item.imageUrl,
      favorite: Boolean(item.favorite),
    }))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
  return { propertyId, categories, products };
}

exports._test = { buildPublicShop };
