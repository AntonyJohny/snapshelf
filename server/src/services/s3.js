const { DeleteObjectCommand, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");
const { s3 } = require("../config/aws");

// temporary link so the browser can upload straight to S3
async function createUploadUrl(contentType) {
  const id = randomUUID();
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `originals/${id}`,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { id, url };
}

// temporary link so the browser can display a private image
function createViewUrl(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

function createDownloadUrl(key, filename) {
  const safeFilename = String(filename || "")
    .replace(/[^\w.-]/g, "_")
    .slice(0, 120) || "image";
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

async function deleteImageObjects(keys) {
  await Promise.all(
    [...new Set(keys.filter(Boolean))].map((Key) =>
      s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key }))
    )
  );
}

module.exports = { createDownloadUrl, createUploadUrl, createViewUrl, deleteImageObjects };