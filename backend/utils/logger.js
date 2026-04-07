const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'authorization',
  'jwt',
  'gemini_api_key',
  'jwt_secret'
]);

const redactValue = (key, value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
    return '[REDACTED]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'object' && item !== null ? sanitize(item) : item));
  }

  if (typeof value === 'object') {
    return sanitize(value);
  }

  return value;
};

function sanitize(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    acc[key] = redactValue(key, value);
    return acc;
  }, {});
}

function write(level, message, metadata = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'habit-rabbit-api',
    env: process.env.NODE_ENV || 'development',
    ...sanitize(metadata)
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}

module.exports = {
  info: (message, metadata) => write('info', message, metadata),
  warn: (message, metadata) => write('warn', message, metadata),
  error: (message, metadata) => write('error', message, metadata),
  audit: (action, metadata) =>
    write('audit', `Audit event: ${action}`, {
      action,
      ...metadata
    })
};
