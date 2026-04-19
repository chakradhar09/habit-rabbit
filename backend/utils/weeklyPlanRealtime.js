const clientsByUser = new Map();
const SSE_HEARTBEAT_INTERVAL_MS = 4000;

const toDateStr = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (inputDate) => {
  if (typeof inputDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
    const [year, month, day] = inputDate.split('-').map((part) => Number(part));
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  return new Date(inputDate);
};

const getWeekStartDateISO = (inputDate) => {
  const date = inputDate ? parseDateOnly(inputDate) : new Date();
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diff);
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
  }, SSE_HEARTBEAT_INTERVAL_MS);

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
