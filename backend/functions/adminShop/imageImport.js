const dns = require('node:dns').promises;
const net = require('node:net');
const crypto = require('node:crypto');
const { S3Client, PutObjectCommand } = require('/opt/nodejs/node_modules/@aws-sdk/client-s3');

const s3 = new S3Client({});
const BUCKET = process.env.MEDIA_BUCKET;
const MAX_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function importImage({ propertyId, sourceUrl }) {
  if (!BUCKET) throw new Error('MEDIA_BUCKET is not configured');
  let currentUrl = new URL(sourceUrl);
  let response;

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicHttpsUrl(currentUrl);
    response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': 'AltusRetreatsImageImporter/1.0', Accept: 'image/*' },
      signal: AbortSignal.timeout(12000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw publicError('The image URL redirected too many times');
      currentUrl = new URL(location, currentUrl);
      continue;
    }
    break;
  }

  if (!response?.ok) throw publicError(`The image server returned ${response?.status || 'an error'}`);
  const contentType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const extension = MIME_EXTENSIONS[contentType];
  if (!extension) throw publicError('The URL must point directly to a JPG, PNG, WebP, or GIF image');
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_BYTES) throw publicError('The image must be 8 MB or smaller');

  const chunks = [];
  let total = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw publicError('The image must be 8 MB or smaller');
    }
    chunks.push(Buffer.from(value));
  }

  const key = `properties/${propertyId}/shop/${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${extension}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: Buffer.concat(chunks),
    ContentType: contentType,
  }));

  return {
    imageUrl: `https://${BUCKET}.s3.amazonaws.com/${key}`,
    key,
    sourceUrl: currentUrl.toString(),
  };
}

async function assertPublicHttpsUrl(url) {
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw publicError('Image URLs must use HTTPS and cannot contain credentials');
  }
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw publicError('That image host is not allowed');
  }
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized === '::' || normalized.startsWith('fc')
    || normalized.startsWith('fd') || normalized.startsWith('fe8')
    || normalized.startsWith('fe9') || normalized.startsWith('fea')
    || normalized.startsWith('feb') || normalized.startsWith('::ffff:127.')
    || normalized.startsWith('::ffff:10.') || normalized.startsWith('::ffff:192.168.');
}

function publicError(message) {
  const error = new Error(message);
  error.publicMessage = message;
  return error;
}

module.exports = { importImage, _test: { isPrivateAddress } };
