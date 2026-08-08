const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({});
const cache = new Map();

async function getSecret(secretName) {
  if (cache.has(secretName)) return cache.get(secretName);
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  const value = JSON.parse(res.SecretString);
  cache.set(secretName, value);
  return value;
}

module.exports = { getSecret };
