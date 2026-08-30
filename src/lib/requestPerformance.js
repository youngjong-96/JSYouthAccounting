const REQUEST_PERFORMANCE_TOGGLE_KEY = 'request-performance-enabled';
const REQUEST_PERFORMANCE_RECORDS_KEY = 'request-performance-records';
const REQUEST_PERFORMANCE_MAX_RECORDS = 200;

function canUseBrowserApis() {
  return typeof window !== 'undefined'
    && typeof window.localStorage !== 'undefined'
    && typeof window.sessionStorage !== 'undefined';
}

function now() {
  return window.performance?.now ? window.performance.now() : Date.now();
}

function readRecords() {
  if (!canUseBrowserApis()) {
    return [];
  }

  try {
    const value = JSON.parse(window.sessionStorage.getItem(REQUEST_PERFORMANCE_RECORDS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeRecords(records) {
  if (!canUseBrowserApis()) {
    return;
  }

  window.sessionStorage.setItem(
    REQUEST_PERFORMANCE_RECORDS_KEY,
    JSON.stringify(records.slice(-REQUEST_PERFORMANCE_MAX_RECORDS)),
  );
}

export function isRequestPerformanceEnabled() {
  if (!canUseBrowserApis()) {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('perf') === '1'
    || window.localStorage.getItem(REQUEST_PERFORMANCE_TOGGLE_KEY) === '1';
}

export function setRequestPerformanceEnabled(enabled) {
  if (!canUseBrowserApis()) {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(REQUEST_PERFORMANCE_TOGGLE_KEY, '1');
  } else {
    window.localStorage.removeItem(REQUEST_PERFORMANCE_TOGGLE_KEY);
  }
}

export function getServerTimingHeader(headers) {
  if (!headers) {
    return null;
  }

  if (typeof headers.get === 'function') {
    return headers.get('server-timing');
  }

  return headers['server-timing'] || headers['Server-Timing'] || null;
}

export function parseServerTiming(serverTimingHeader) {
  if (!serverTimingHeader || typeof serverTimingHeader !== 'string') {
    return {};
  }

  return serverTimingHeader.split(',').reduce((timings, entry) => {
    const [metric, ...parameters] = entry.trim().split(';');
    const durationParameter = parameters.find((parameter) => parameter.trim().startsWith('dur='));
    const duration = Number(durationParameter?.trim().slice(4));

    if (metric && Number.isFinite(duration)) {
      timings[metric] = duration;
    }

    return timings;
  }, {});
}

function ensureDebugApi() {
  if (!canUseBrowserApis()) {
    return;
  }

  window.__requestPerf = {
    read: readRequestPerformanceRecords,
    clear: clearRequestPerformanceRecords,
    summary: printRequestPerformanceSummary,
    enable: () => setRequestPerformanceEnabled(true),
    disable: () => setRequestPerformanceEnabled(false),
  };
}

export function startRequestPerformanceMeasurement({ metric, meta = {} }) {
  if (!isRequestPerformanceEnabled()) {
    return null;
  }

  ensureDebugApi();
  return {
    metric,
    meta,
    startedAtMs: now(),
    startedAt: new Date().toISOString(),
  };
}

export function completeRequestPerformanceMeasurement(measurement, options = {}) {
  if (!measurement || !isRequestPerformanceEnabled()) {
    return null;
  }

  const record = {
    metric: measurement.metric,
    durationMs: Math.round((now() - measurement.startedAtMs) * 10) / 10,
    outcome: options.outcome || 'success',
    meta: {
      ...measurement.meta,
      ...(options.meta || {}),
      serverTimingsMs: parseServerTiming(options.serverTiming),
      startedAt: measurement.startedAt,
    },
    recordedAt: new Date().toISOString(),
  };

  writeRecords([...readRecords(), record]);
  console.info('[request-perf]', record.metric, `${record.durationMs}ms`, record);
  return record;
}

export function readRequestPerformanceRecords() {
  return readRecords();
}

export function clearRequestPerformanceRecords() {
  if (canUseBrowserApis()) {
    window.sessionStorage.removeItem(REQUEST_PERFORMANCE_RECORDS_KEY);
  }
}

export function printRequestPerformanceSummary() {
  const grouped = new Map();

  readRecords().forEach((record) => {
    const key = `${record.metric}::${record.outcome}`;
    const group = grouped.get(key) || {
      metric: record.metric,
      outcome: record.outcome,
      count: 0,
      totalDurationMs: 0,
      minMs: Number.POSITIVE_INFINITY,
      maxMs: 0,
    };

    group.count += 1;
    group.totalDurationMs += record.durationMs;
    group.minMs = Math.min(group.minMs, record.durationMs);
    group.maxMs = Math.max(group.maxMs, record.durationMs);
    grouped.set(key, group);
  });

  const summary = Array.from(grouped.values()).map((group) => ({
    // A percentile is more representative than an average when a serverless
    // cold start creates an occasional very slow request.
    ...(() => {
      const durations = readRecords()
        .filter((record) => record.metric === group.metric && record.outcome === group.outcome)
        .map((record) => record.durationMs)
        .sort((left, right) => left - right);
      return {
        p75Ms: durations[Math.max(0, Math.ceil(durations.length * 0.75) - 1)],
      };
    })(),
    metric: group.metric,
    outcome: group.outcome,
    count: group.count,
    avgMs: Math.round((group.totalDurationMs / group.count) * 10) / 10,
    minMs: group.minMs,
    maxMs: group.maxMs,
  }));

  if (summary.length > 0) {
    console.table(summary);
  }

  return summary;
}

export function waitForNextPaint() {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}
