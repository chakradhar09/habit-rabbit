const clientsByUser = new Map();

const toDateStr = (value = new Date()) => new Date(value).toISOString().split('T')[0];

const getWeekStartDateISO = (inputDate) => {
  const date = inputDate ? new Date(inputDate) : new Date();
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setUTCDate(normalized.getUTCDate() + diff);
  return toDateStr(normalized);
};

const formatSseFrame = (event, payload) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

const sendEvent = (res, event, payload) => {
  res.write(formatSseFrame(event, payload));
};

const removeClient = (userKey, client) => {
  if (client.heartbeat) {
    clearInterval(client.heartbeat);
  }

  const set = clientsByUser.get(userKey);
  if (!set) {
    return;
  }

  set.delete(client);
  if (set.size === 0) {
    clientsByUser.delete(userKey);
  }
};

const registerWeeklyPlanStreamClient = (userId, res) => {
  const userKey = String(userId);
  if (!clientsByUser.has(userKey)) {
    clientsByUser.set(userKey, new Set());
  }

  const set = clientsByUser.get(userKey);
  const client = {
    res,
    heartbeat: null
  };

  set.add(client);

  sendEvent(res, 'connected', {
    type: 'weekly-plan-stream-connected',
    connectedAt: new Date().toISOString()
  });

  client.heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 25000);

  return () => {
    removeClient(userKey, client);
  };
};

const emitWeeklyPlanUpdate = (userId, payload = {}) => {
  const userKey = String(userId);
  const set = clientsByUser.get(userKey);
  if (!set || set.size === 0) {
    return 0;
  }

  const message = {
    type: 'weekly-plan-updated',
    weekStartDate: payload.weekStartDate || getWeekStartDateISO(),
    reason: payload.reason || 'plan-saved',
    updatedAt: new Date().toISOString()
  };

  let delivered = 0;
  for (const client of Array.from(set)) {
    try {
      sendEvent(client.res, 'weekly-plan-updated', message);
      delivered += 1;
    } catch (error) {
      removeClient(userKey, client);
    }
  }

  return delivered;
};

module.exports = {
  getWeekStartDateISO,
  registerWeeklyPlanStreamClient,
  emitWeeklyPlanUpdate
};
