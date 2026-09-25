const { S3Client } = require("@aws-sdk/client-s3");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const region = process.env.AWS_REGION;

module.exports = {
  s3: new S3Client({ region }),
  sqs: new SQSClient({ region }),
  db: DynamoDBDocumentClient.from(new DynamoDBClient({ region })),
};