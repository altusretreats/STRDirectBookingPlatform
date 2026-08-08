/**
 * POST /admin/media/sign
 *
 * Returns a presigned S3 PUT URL for direct browser upload.
 * Body: { propertyId, filename, contentType }
 * Response: { uploadUrl, fileUrl, key }
 *
 * Protected by Cognito — admin only.
 */
const { S3Client, PutObjectCommand } = require('/opt/nodejs/node_modules/@aws-sdk/client-s3');
const { getSignedUrl } = require('/opt/nodejs/node_modules/@aws-sdk/s3-request-presigner');
const { ok, badRequest, serverError } = require('/opt/nodejs/lib/response');

const s3 = new S3Client({});
const BUCKET = process.env.MEDIA_BUCKET;
const CDN_BASE = process.env.MEDIA_CDN_BASE; // CloudFront URL if we add one later; fallback to S3 URL

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { propertyId, filename, contentType } = body;

    if (!propertyId || !filename || !contentType) {
      return badRequest('propertyId, filename, and contentType are required');
    }

    // Sanitize filename — strip path traversal, keep extension
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = safe.split('.').pop().toLowerCase();
    const key = `properties/${propertyId}/${Date.now()}_${safe}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

    // Derive the final public URL
    const fileUrl = CDN_BASE
      ? `${CDN_BASE}/${key}`
      : `https://${BUCKET}.s3.amazonaws.com/${key}`;

    return ok({ uploadUrl, fileUrl, key });
  } catch (err) {
    return serverError(err);
  }
};
