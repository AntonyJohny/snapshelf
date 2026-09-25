const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { sqs } = require("../config/aws");

async function sendImageJob(id) {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ id }),
    })
  );
}

module.exports = { sendImageJob };