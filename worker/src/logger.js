const {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");

const client = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
const logGroupName = "/snapshelf/worker";
const logStreamName = `worker-${new Date().toISOString().slice(0, 10)}`;
let ready = false;

async function init() {
  const commands = [
    new CreateLogGroupCommand({ logGroupName }),
    new CreateLogStreamCommand({ logGroupName, logStreamName }),
  ];
  for (const cmd of commands) {
    try {
      await client.send(cmd);
    } catch (e) {
      if (e.name !== "ResourceAlreadyExistsException") throw e;
    }
  }
  ready = true;
}

async function log(level, message, extra = {}) {
  const line = JSON.stringify({ level, message, ...extra });
  console.log(line);
  try {
    if (!ready) await init();
    await client.send(
      new PutLogEventsCommand({
        logGroupName,
        logStreamName,
        logEvents: [{ timestamp: Date.now(), message: line }],
      })
    );
  } catch (e) {
    console.error("CloudWatch logging failed:", e.message);
  }
}

module.exports = { log };