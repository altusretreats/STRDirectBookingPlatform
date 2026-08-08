const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = process.env.TABLE_NAME;

module.exports = {
  get: (key) => ddb.send(new GetCommand({ TableName: TABLE, Key: key })),
  query: (params) => ddb.send(new QueryCommand({ TableName: TABLE, ...params })),
  put: (item) => ddb.send(new PutCommand({ TableName: TABLE, Item: item })),
  update: (params) => ddb.send(new UpdateCommand({ TableName: TABLE, ...params })),
  delete: (key) => ddb.send(new DeleteCommand({ TableName: TABLE, Key: key })),
};
