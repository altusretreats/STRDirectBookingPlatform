/**
 * Structured JSON logger. All logs include requestId, environment, and timestamp.
 * Lambda runtime captures stdout as CloudWatch log events.
 */

let _requestId = 'local';

function setRequestId(id) { _requestId = id; }

function log(level, message, data = {}) {
  const entry = {
    level,
    message,
    requestId: _requestId,
    environment: process.env.ENVIRONMENT || 'local',
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.log(JSON.stringify(entry));
}

module.exports = {
  setRequestId,
  info:  (msg, data) => log('INFO',  msg, data),
  warn:  (msg, data) => log('WARN',  msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  debug: (msg, data) => log('DEBUG', msg, data),
};
