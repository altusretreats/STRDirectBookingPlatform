const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json',
};

module.exports = {
  ok: (body) => ({
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  }),
  created: (body) => ({
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  }),
  badRequest: (message) => ({
    statusCode: 400,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: message }),
  }),
  notFound: (message = 'Not found') => ({
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: message }),
  }),
  serverError: (err) => {
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  },
};
