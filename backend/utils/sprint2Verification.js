const BASE_URL = process.env.VERIFY_BASE_URL || 'http://localhost:5000/api';

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
  return {
    status: response.status,
    ok: response.ok,
    json: safeJsonParse(text),
    text
  };
};

const makeVerificationIdentity = (prefix) => {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}@habitrabbit.local`;
};

async function run() {
  console.log(`Running Sprint 2 verification against ${BASE_URL}`);

  const health = await request('/health');
  addResult('Health endpoint responds', health.status === 200, `Status=${health.status}`);

  const email = makeVerificationIdentity('sprint2');
  const password = 'Sprint2VerifyA1';

  const register = await request('/auth/register', {
    method: 'POST',
    body: { email, password }
  });
  addResult('Register test user', register.status === 201, `Status=${register.status}`);

  const token = register.json?.data?.token;
  if (!token) {
    console.table(results);
    process.exit(1);
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`
  };

  const meBefore = await request('/auth/me', { headers: authHeaders });
  const onboardingInitiallyIncomplete = meBefore.status === 200
    && meBefore.json?.data?.user?.onboarding?.completed === false;
  addResult('Onboarding initially incomplete', onboardingInitiallyIncomplete, `Status=${meBefore.status}`);

  const packs = await request('/tasks/starter-packs', { headers: authHeaders });
  const starterPacks = packs.json?.data?.starterPacks || [];
  addResult('Starter packs endpoint available', packs.status === 200 && starterPacks.length > 0, `Status=${packs.status}, packs=${starterPacks.length}`);

  const setup = await request('/tasks/onboarding/setup', {
    method: 'POST',
    headers: authHeaders,
    body: {
      packId: starterPacks[0]?.id,
      customHabits: ['Sprint 2 custom habit']
    }
  });
  const createdTaskCount = setup.json?.data?.createdTaskCount || 0;
  addResult('Onboarding setup creates starter habits', setup.status === 201 && createdTaskCount >= 3, `Status=${setup.status}, created=${createdTaskCount}`);

  const complete = await request('/tasks/onboarding/complete', {
    method: 'PUT',
    headers: authHeaders
  });
  addResult('Onboarding completion endpoint works', complete.status === 200 && complete.json?.data?.completed === true, `Status=${complete.status}`);

  const meAfter = await request('/auth/me', { headers: authHeaders });
  const onboardingCompleted = meAfter.status === 200
    && meAfter.json?.data?.user?.onboarding?.completed === true;
  addResult('Onboarding completion persisted', onboardingCompleted, `Status=${meAfter.status}`);

  const todayTasks = await request('/tasks/today', { headers: authHeaders });
  const tasks = todayTasks.json?.data?.tasks || [];
  addResult('Today tasks include starter habits', todayTasks.status === 200 && tasks.length >= 3, `Status=${todayTasks.status}, tasks=${tasks.length}`);

  const reminderTask = tasks[0];
  const reminderUpdate = reminderTask
    ? await request(`/tasks/${reminderTask._id}/reminder`, {
        method: 'PUT',
        headers: authHeaders,
        body: {
          enabled: true,
          time: '07:30'
        }
      })
    : { status: 0, json: null };
  addResult('Task reminder persists', reminderUpdate.status === 200 && reminderUpdate.json?.data?.reminder?.enabled === true, `Status=${reminderUpdate.status}`);

  const skipTask = tasks[1];
  const skipApply = skipTask
    ? await request('/tasks/apply-skips', {
        method: 'PUT',
        headers: authHeaders,
        body: {
          skips: [{ taskId: skipTask._id, reason: 'Verification skip', days: 3 }]
        }
      })
    : { status: 0, json: null };
  addResult('AI skip action endpoint applies pause', skipApply.status === 200, `Status=${skipApply.status}`);

  const fallbackTask = tasks[2];
  const fallbackTitle = fallbackTask ? `${fallbackTask.title} (Lite)` : '';
  const fallbackApply = fallbackTask
    ? await request('/tasks/apply-fallbacks', {
        method: 'PUT',
        headers: authHeaders,
        body: {
          fallbacks: [{ taskId: fallbackTask._id, suggestion: fallbackTitle }]
        }
      })
    : { status: 0, json: null };
  addResult('AI fallback endpoint updates habit title', fallbackApply.status === 200, `Status=${fallbackApply.status}`);

  const tasksAfterActions = await request('/tasks/today', { headers: authHeaders });
  const postActionTasks = tasksAfterActions.json?.data?.tasks || [];
  const hasPausedTask = postActionTasks.some((task) => task.isPaused === true);
  const hasFallbackTask = postActionTasks.some((task) => task.title === fallbackTitle);
  addResult('Skip action reflected in task status', hasPausedTask, `Status=${tasksAfterActions.status}`);
  addResult('Fallback conversion reflected in task title', hasFallbackTask, `Status=${tasksAfterActions.status}`);

  const weeklySave = await request('/analytics/weekly-plan', {
    method: 'PUT',
    headers: authHeaders,
    body: {
      focus: 'Protect morning momentum',
      priorities: postActionTasks.slice(0, 3).map((task) => task._id),
      notes: 'Batch high-impact habits early in the day.',
      reflection: 'Need to improve consistency after lunch.'
    }
  });
  addResult('Weekly plan save endpoint works', weeklySave.status === 200, `Status=${weeklySave.status}`);

  const weeklyFetch = await request('/analytics/weekly-plan', { headers: authHeaders });
  const weeklyPlan = weeklyFetch.json?.data?.plan;
  const weeklySummary = weeklyFetch.json?.data?.summary;
  addResult(
    'Weekly plan retrieval includes saved focus',
    weeklyFetch.status === 200 && weeklyPlan?.focus === 'Protect morning momentum',
    `Status=${weeklyFetch.status}`
  );
  addResult(
    'Weekly summary payload is present',
    weeklyFetch.status === 200 && typeof weeklySummary?.completionRate === 'number',
    `Status=${weeklyFetch.status}`
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
  console.error('Sprint 2 verification runner failed:', error);
  process.exitCode = 1;
});
