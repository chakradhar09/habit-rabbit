const { performance } = require('perf_hooks');

const BASE_URL = process.env.VERIFY_BASE_URL || 'http://localhost:5000/api';
const JWT_ISSUER = process.env.JWT_ISSUER || 'habit-rabbit';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'habit-rabbit-client';

const results = [];

const addResult = (name, passed, details) => {
  results.push({ name, passed, details });
};

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const json = safeJsonParse(text);

  return {
    status: response.status,
    ok: response.ok,
    json,
    text
  };
};

const decodeJwtPayload = (token) => {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const payload = Buffer.from(parts[1], 'base64').toString('utf8');
  return safeJsonParse(payload);
};

const makeVerificationIdentity = (prefix) => {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}@habitrabbit.local`;
};

const createIpHeaders = (ipAddress) => ({
  'X-Forwarded-For': ipAddress
});

const randomIpSegment = () => Math.floor(Math.random() * 200) + 20;

async function run() {
  console.log(`Running Sprint 1 verification against ${BASE_URL}`);

  const ipSegmentA = randomIpSegment();
  const ipSegmentB = randomIpSegment();
  const authCoreHeaders = createIpHeaders(`10.${ipSegmentA}.${ipSegmentB}.11`);
  const authLockoutHeaders = createIpHeaders(`10.${ipSegmentA}.${ipSegmentB}.12`);
  const aiHeaders = createIpHeaders(`10.${ipSegmentA}.${ipSegmentB}.13`);

  // 1) Health endpoint baseline
  const health = await request('/health');
  addResult('Health endpoint responds', health.status === 200, `Status=${health.status}`);

  // 2) CORS rejection for disallowed origin
  const corsCheck = await request('/health', {
    headers: {
      Origin: 'https://evil.example.com'
    }
  });
  addResult(
    'CORS denies disallowed origin',
    corsCheck.status === 403,
    `Status=${corsCheck.status}`
  );

  // 3) Register validation: weak password should fail
  const weakRegister = await request('/auth/register', {
    method: 'POST',
    headers: authCoreHeaders,
    body: {
      email: makeVerificationIdentity('weak'),
      password: 'weakpass'
    }
  });
  addResult(
    'Register validation rejects weak password',
    weakRegister.status === 400,
    `Status=${weakRegister.status}`
  );

  const strongPassword = 'Sprint1VerifyA1';

  // 4) Register/login user to continue protected-route checks
  const appEmail = makeVerificationIdentity('app');
  const registerAppUser = await request('/auth/register', {
    method: 'POST',
    headers: authCoreHeaders,
    body: {
      email: appEmail,
      password: strongPassword
    }
  });
  addResult(
    'Verification user created',
    registerAppUser.status === 201,
    `Status=${registerAppUser.status}`
  );

  const loginAppUser = await request('/auth/login', {
    method: 'POST',
    headers: authCoreHeaders,
    body: {
      email: appEmail,
      password: strongPassword
    }
  });
  addResult('Login succeeds for valid user', loginAppUser.status === 200, `Status=${loginAppUser.status}`);

  const token = loginAppUser.json?.data?.token;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 5) JWT claims verification
  const payload = token ? decodeJwtPayload(token) : null;
  const jwtClaimsOk = payload && payload.iss === JWT_ISSUER && payload.aud === JWT_AUDIENCE;
  addResult(
    'JWT contains issuer and audience claims',
    Boolean(jwtClaimsOk),
    payload ? `iss=${payload.iss}, aud=${payload.aud}` : 'No token payload'
  );

  if (!token) {
    console.table(results);
    process.exit(1);
  }

  // 6) Task create validation
  const invalidTaskCreate = await request('/tasks', {
    method: 'POST',
    headers: authHeaders,
    body: { title: '   ' }
  });
  addResult(
    'Task create validation rejects blank title',
    invalidTaskCreate.status === 400,
    `Status=${invalidTaskCreate.status}`
  );

  // 7) Valid task create
  const validTaskCreate = await request('/tasks', {
    method: 'POST',
    headers: authHeaders,
    body: { title: 'Sprint 1 verification habit' }
  });
  addResult('Task create succeeds with valid payload', validTaskCreate.status === 201, `Status=${validTaskCreate.status}`);
  const createdTaskId = validTaskCreate.json?.data?.task?._id;

  // 8) Reorder validation
  const invalidReorder = await request('/tasks/reorder', {
    method: 'PUT',
    headers: authHeaders,
    body: {
      taskOrders: [{ taskId: createdTaskId || 'bad-id', sortOrder: -1 }]
    }
  });
  addResult(
    'Reorder validation rejects invalid sort order',
    invalidReorder.status === 400,
    `Status=${invalidReorder.status}`
  );

  // 9) Heatmap taskId param validation
  const invalidHeatmap = await request('/analytics/heatmap/not-an-object-id', {
    headers: authHeaders
  });
  addResult(
    'Heatmap validation rejects invalid taskId',
    invalidHeatmap.status === 400,
    `Status=${invalidHeatmap.status}`
  );

  // 10) AI insights body validation
  const oversizedContext = 'a'.repeat(501);
  const invalidAIContext = await request('/analytics/ai-insights', {
    method: 'POST',
    headers: {
      ...authHeaders,
      ...aiHeaders
    },
    body: { context: oversizedContext }
  });
  addResult(
    'AI insights validation rejects oversized context',
    invalidAIContext.status === 400,
    `Status=${invalidAIContext.status}`
  );

  // 11) AI endpoint rate limiting
  const aiStatuses = [];
  for (let i = 0; i < 9; i += 1) {
    const aiAttempt = await request('/analytics/ai-insights', {
      method: 'POST',
      headers: {
        ...authHeaders,
        ...aiHeaders
      },
      body: { context: 'verification-run' }
    });
    aiStatuses.push(aiAttempt.status);
  }
  addResult(
    'AI insights route enforces rate limit',
    aiStatuses.includes(429),
    `Statuses=${aiStatuses.join(',')}`
  );

  // 12) Stats endpoint performance sample
  const perfSamples = [];
  for (let i = 0; i < 5; i += 1) {
    const start = performance.now();
    const statsResponse = await request('/analytics/stats', {
      headers: authHeaders
    });
    const elapsed = performance.now() - start;
    perfSamples.push(Math.round(elapsed));

    if (statsResponse.status !== 200) {
      addResult('Stats endpoint status check', false, `Status=${statsResponse.status}`);
      break;
    }
  }

  if (perfSamples.length === 5) {
    const avg = Math.round(perfSamples.reduce((sum, ms) => sum + ms, 0) / perfSamples.length);
    const max = Math.max(...perfSamples);
    addResult(
      'Stats endpoint performance sampled',
      true,
      `avg=${avg}ms, max=${max}ms, samples=${perfSamples.join('/')}`
    );
  }

  // 13) Register user for lockout verification
  const lockoutEmail = makeVerificationIdentity('lockout');
  const registerLockoutUser = await request('/auth/register', {
    method: 'POST',
    headers: authLockoutHeaders,
    body: {
      email: lockoutEmail,
      password: strongPassword
    }
  });
  addResult(
    'Register lockout test user',
    registerLockoutUser.status === 201,
    `Status=${registerLockoutUser.status}`
  );

  // 14) Login lockout verification (invalid password attempts)
  const lockoutStatuses = [];
  for (let i = 0; i < 6; i += 1) {
    const attempt = await request('/auth/login', {
      method: 'POST',
      headers: authLockoutHeaders,
      body: {
        email: lockoutEmail,
        password: 'WrongPasswordA1'
      }
    });
    lockoutStatuses.push(attempt.status);
  }
  addResult(
    'Login lockout triggers after repeated failures',
    lockoutStatuses.includes(429),
    `Statuses=${lockoutStatuses.join(',')}`
  );

  const failed = results.filter((entry) => !entry.passed);
  const passed = results.length - failed.length;

  console.table(
    results.map((entry) => ({
      check: entry.name,
      status: entry.passed ? 'PASS' : 'FAIL',
      details: entry.details
    }))
  );

  console.log(`Verification summary: ${passed}/${results.length} checks passed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Sprint 1 verification runner failed:', error);
  process.exitCode = 1;
});
