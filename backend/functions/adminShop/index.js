const db = require('/opt/nodejs/lib/db');
const { ok, badRequest, notFound, serverError } = require('/opt/nodejs/lib/response');

const CATEGORY_PREFIX = 'SHOP#CATEGORY#';
const PRODUCT_PREFIX = 'SHOP#PRODUCT#';
const ID_PATTERN = /^[a-zA-Z0-9-]{1,80}$/;

function clean(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function cleanUrl(value) {
  const raw = clean(value, 2000);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    const { propertyId, categoryId, productId } = event.pathParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    const { Item: property } = await db.get({ PK: `PROPERTY#${propertyId}`, SK: 'METADATA' });
    if (!property) return notFound(`Property not found: ${propertyId}`);

    if (method === 'GET' && !categoryId && !productId) {
      const { Items = [] } = await db.query({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': `PROPERTY#${propertyId}`, ':prefix': 'SHOP#' },
      });
      return ok(buildAdminShop(propertyId, Items));
    }

    if (method === 'POST' && event.path?.endsWith('/import-image')) {
      const sourceUrl = cleanUrl(body.imageUrl);
      if (!sourceUrl) return badRequest('A valid HTTPS image URL is required');
      const { importImage } = require('./imageImport');
      const image = await importImage({ propertyId, sourceUrl });
      return ok(image);
    }

    if (categoryId) {
      if (!ID_PATTERN.test(categoryId)) return badRequest('Invalid category ID');
      const key = { PK: `PROPERTY#${propertyId}`, SK: `${CATEGORY_PREFIX}${categoryId}` };

      if (method === 'PUT') {
        const name = clean(body.name, 100);
        if (!name) return badRequest('Category name is required');
        const { Item: existing } = await db.get(key);
        const now = new Date().toISOString();
        const category = {
          ...key,
          entityType: 'SHOP_CATEGORY',
          propertyId,
          categoryId,
          name,
          order: Math.max(0, Math.min(9999, Math.trunc(Number(body.order) || 0))),
          active: body.active !== false,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
        await db.put(category);
        return ok({ category: stripKeys(category) });
      }

      if (method === 'DELETE') {
        const { Items = [] } = await db.query({
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': `PROPERTY#${propertyId}`, ':prefix': PRODUCT_PREFIX },
        });
        if (Items.some(item => item.categoryId === categoryId)) {
          return badRequest('Move or delete the products in this category before deleting it');
        }
        await db.delete(key);
        return ok({ propertyId, categoryId, deleted: true });
      }
    }

    if (productId) {
      if (!ID_PATTERN.test(productId)) return badRequest('Invalid product ID');
      const key = { PK: `PROPERTY#${propertyId}`, SK: `${PRODUCT_PREFIX}${productId}` };

      if (method === 'PUT') {
        const name = clean(body.name, 140);
        const description = clean(body.description, 2000);
        const category = clean(body.categoryId, 80);
        const affiliateUrl = cleanUrl(body.affiliateUrl);
        const imageUrl = cleanUrl(body.imageUrl);
        if (!name || !description || !category || !affiliateUrl || !imageUrl) {
          return badRequest('Name, description, category, affiliate URL, and image are required; URLs must use HTTPS');
        }
        if (!ID_PATTERN.test(category)) return badRequest('Invalid category ID');
        const { Item: categoryRecord } = await db.get({
          PK: `PROPERTY#${propertyId}`,
          SK: `${CATEGORY_PREFIX}${category}`,
        });
        if (!categoryRecord) return badRequest('Selected category does not exist');

        const { Item: existing } = await db.get(key);
        const now = new Date().toISOString();
        const product = {
          ...key,
          entityType: 'SHOP_PRODUCT',
          propertyId,
          productId,
          name,
          description,
          categoryId: category,
          room: clean(body.room, 100) || null,
          affiliateUrl,
          imageUrl,
          favorite: Boolean(body.favorite),
          active: body.active !== false,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
        await db.put(product);
        return ok({ product: stripKeys(product) });
      }

      if (method === 'DELETE') {
        await db.delete(key);
        return ok({ propertyId, productId, deleted: true });
      }
    }

    return badRequest('Unsupported method/path combination');
  } catch (err) {
    if (err instanceof SyntaxError) return badRequest('Request body must be valid JSON');
    if (err?.publicMessage) return badRequest(err.publicMessage);
    return serverError(err);
  }
};

function buildAdminShop(propertyId, items) {
  const categories = items
    .filter(item => item.entityType === 'SHOP_CATEGORY')
    .map(stripKeys)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const products = items
    .filter(item => item.entityType === 'SHOP_PRODUCT')
    .map(stripKeys)
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
  return { propertyId, categories, products };
}

function stripKeys({ PK, SK, ...record }) { return record; }

exports._test = { buildAdminShop, cleanUrl };
