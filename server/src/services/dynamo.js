const { DeleteCommand, PutCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
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

async function findImage(id) {
  const images = await listImages();
  return images.find((image) => image.id === id);
}

async function markImageDeleting(id) {
  await db.send(new UpdateCommand({
    TableName: TableName(),
    Key: { id },
    UpdateExpression: "SET #status = :deleting",
    ConditionExpression: "attribute_exists(id)",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":deleting": "DELETING" },
  }));
}

async function deleteImageRecord(id) {
  await db.send(new DeleteCommand({ TableName: TableName(), Key: { id } }));
}

module.exports = { deleteImageRecord, findImage, listImages, markImageDeleting, saveImage };