/**
 * Lambda middleware wrapper.
 * Handles: request ID logging, JSON body parsing, CORS, unhandled errors.
 *
 * Usage:
 *   const { withMiddleware } = require('/opt/nodejs/lib/middleware');
 *   exports.handler = withMiddleware(async (event) => { ... });
 */

const logger = require('./logger');
const { serverError } = require('./response');

function withMiddleware(fn) {
  return async (event, context) => {
    logger.setRequestId(context?.awsRequestId ?? 'local');
    logger.info('Request received', {
      httpMethod: event.httpMethod,
      path: event.path,
      pathParameters: event.pathParameters,
      queryStringParameters: event.queryStringParameters,
    });

    // Parse body once; attach as event.parsedBody
    if (event.body && typeof event.body === 'string') {
      try {
        event.parsedBody = JSON.parse(event.body);
      } catch {
        event.parsedBody = {};
      }
    } else {
      event.parsedBody = event.body || {};
    }

    try {
      const result = await fn(event, context);
      logger.info('Request completed', { statusCode: result.statusCode });
      return result;
    } catch (err) {
      logger.error('Unhandled exception', { error: err.message, stack: err.stack });
      return serverError(err);
    }
  };
}

module.exports = { withMiddleware };
