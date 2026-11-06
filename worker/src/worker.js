require("dotenv").config();
const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
const {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { makeThumbnail } = require("./thumbnail");
const { log } = require("./logger");

const region = process.env.AWS_REGION;
const sqs = new SQSClient({ region });
const s3 = new S3Client({ region });
const sns = new SNSClient({ region });
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const QueueUrl = process.env.SQS_QUEUE_URL;
const Bucket = process.env.S3_BUCKET;
const TableName = process.env.DYNAMO_TABLE;
const MAX_ATTEMPTS = 3;

// "status" is a reserved word in DynamoDB, so we use the alias #s
async function setStatus(id, status, thumbKey) {
  let expr = "SET #s = :s";
  const values = { ":s": status };
  if (thumbKey) {
    expr += ", thumbKey = :t";
    values[":t"] = thumbKey;
  }
  await db.send(
    new UpdateCommand({
      TableName,
      Key: { id },
      UpdateExpression: expr,
      ConditionExpression: "attribute_exists(id) AND #s <> :deleting",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: values,
    })
  );
}

async function processImage(id) {
  const original = await s3.send(
    new GetObjectCommand({ Bucket, Key: `originals/${id}` })
  );
  const buffer = Buffer.from(await original.Body.transformToByteArray());
  const thumb = await makeThumbnail(buffer);

  const thumbKey = `thumbs/${id}.jpg`;
  await s3.send(
    new PutObjectCommand({ Bucket, Key: thumbKey, Body: thumb, ContentType: "image/jpeg" })
  );
  await setStatus(id, "READY", thumbKey);
  await log("info", "Thumbnail created", { id });
}

async function removeOrphanedThumbnail(id) {
  await s3.send(new DeleteObjectCommand({ Bucket, Key: `thumbs/${id}.jpg` }));
}

function deleteMessage(m) {
  return sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: m.ReceiptHandle }));
}

async function handleMessage(m) {
  const { id } = JSON.parse(m.Body);
  const attempt = Number(m.Attributes?.ApproximateReceiveCount || 1);
  try {
    await processImage(id);
    await deleteMessage(m); // delete only after success
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      await removeOrphanedThumbnail(id);
      await deleteMessage(m);
      await log("info", "Image deleted during processing", { id });
      return;
    }

    await log("error", "Thumbnail failed", { id, attempt, error: err.message });
    // Not deleted yet, so SQS will retry after ~30s. After 3 tries, give up.
    if (attempt >= MAX_ATTEMPTS) {
      try {
        await setStatus(id, "FAILED");
      } catch (statusError) {
        if (statusError.name !== "ConditionalCheckFailedException") throw statusError;
        await removeOrphanedThumbnail(id);
        await deleteMessage(m);
        return;
      }
      await sns.send(
        new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Subject: "Snapshelf: image processing failed",
          Message: `Image ${id} failed after ${attempt} attempts: ${err.message}`,
        })
      );
      await deleteMessage(m);
    }
  }
}

async function poll() {
  await log("info", "Worker started");
  while (true) {
    try {
      const { Messages } = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 20, // long polling: waits up to 20s, fewer requests
          MessageSystemAttributeNames: ["ApproximateReceiveCount"],
        })
      );
      if (!Messages) continue;
      for (const m of Messages) await handleMessage(m);
    } catch (err) {
      await log("error", "Polling failed", { error: err.message });
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

poll();