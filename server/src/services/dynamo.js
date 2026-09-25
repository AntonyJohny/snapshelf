const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { db } = require("../config/aws");

const TableName = () => process.env.DYNAMO_TABLE;

async function saveImage(item) {
  await db.send(new PutCommand({ TableName: TableName(), Item: item }));
}

// Scan reads the whole table. Fine for a demo; a real app would use a Query.
async function listImages() {
  const { Items = [] } = await db.send(new ScanCommand({ TableName: TableName() }));
  return Items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

module.exports = { saveImage, listImages };