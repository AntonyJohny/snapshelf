const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
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

module.exports = { createUploadUrl, createViewUrl };