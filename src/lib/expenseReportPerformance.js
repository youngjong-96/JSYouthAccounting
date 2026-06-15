const EXPENSE_REPORT_PERF_TOGGLE_KEY = 'expense-report-performance-enabled';
const EXPENSE_REPORT_PERF_RECORDS_KEY = 'expense-report-performance-records';
const EXPENSE_REPORT_PERF_MAX_RECORDS = 200;

/**
 * 브라우저 저장소와 위치 정보에 접근 가능한 환경인지 확인합니다.
 * @returns {boolean}
 */
function canUseExpenseReportPerformanceBrowserApis() {
  return typeof window !== 'undefined'
    && typeof window.localStorage !== 'undefined'
    && typeof window.sessionStorage !== 'undefined'
    && typeof window.location !== 'undefined';
}

/**
 * 측정에 사용할 현재 시각을 가능한 한 정밀하게 반환합니다.
 * @returns {number}
 */
function getExpenseReportPerformanceNow() {
  if (typeof window !== 'undefined' && window.performance?.now) {
    return window.performance.now();
  }

  return Date.now();
}

/**
 * URL 쿼리 또는 localStorage 설정 기준으로 성능 측정이 활성화되어 있는지 확인합니다.
 * @returns {boolean}
 */
export function isExpenseReportPerformanceEnabled() {
  if (!canUseExpenseReportPerformanceBrowserApis()) {
    return false;
  }

  const queryParams = new URLSearchParams(window.location.search);
  const queryFlag = queryParams.get('expensePerf');
  const storageFlag = window.localStorage.getItem(EXPENSE_REPORT_PERF_TOGGLE_KEY);

  return queryFlag === '1' || storageFlag === '1';
}

/**
 * localStorage 기준의 성능 측정 활성화 상태를 변경합니다.
 * @param {boolean} enabled
 * @returns {void}
 */
export function setExpenseReportPerformanceEnabled(enabled) {
  if (!canUseExpenseReportPerformanceBrowserApis()) {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(EXPENSE_REPORT_PERF_TOGGLE_KEY, '1');
  } else {
    window.localStorage.removeItem(EXPENSE_REPORT_PERF_TOGGLE_KEY);
  }
}

/**
 * sessionStorage에 저장된 측정 기록 배열을 읽어옵니다.
 * @returns {Array<object>}
 */
function readStoredExpenseReportPerformanceRecords() {
  if (!canUseExpenseReportPerformanceBrowserApis()) {
    return [];
  }

  const rawValue = window.sessionStorage.getItem(EXPENSE_REPORT_PERF_RECORDS_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

/**
 * 측정 기록 배열을 sessionStorage에 저장합니다.
 * @param {Array<object>} records
 * @returns {void}
 */
function writeStoredExpenseReportPerformanceRecords(records) {
  if (!canUseExpenseReportPerformanceBrowserApis()) {
    return;
  }

  window.sessionStorage.setItem(
    EXPENSE_REPORT_PERF_RECORDS_KEY,
    JSON.stringify(records.slice(-EXPENSE_REPORT_PERF_MAX_RECORDS)),
  );
}

/**
 * 브라우저 콘솔에서 바로 사용할 수 있는 디버그 API를 window에 연결합니다.
 * @returns {void}
 */
function ensureExpenseReportPerformanceDebugApi() {
  if (!canUseExpenseReportPerformanceBrowserApis()) {
    return;
  }

  window.__expenseReportPerf = {
    read: readExpenseReportPerformanceRecords,
    clear: clearExpenseReportPerformanceRecords,
    summary: printExpenseReportPerformanceSummary,
    enable: () => setExpenseReportPerformanceEnabled(true),
    disable: () => setExpenseReportPerformanceEnabled(false),
  };
}

/**
 * 외부에서 현재 측정 기록 배열을 읽을 수 있도록 반환합니다.
 * @returns {Array<object>}
 */
export function readExpenseReportPerformanceRecords() {
  return readStoredExpenseReportPerformanceRecords();
}

/**
 * 저장된 측정 기록을 모두 삭제합니다.
 * @returns {void}
 */
export function clearExpenseReportPerformanceRecords() {
  if (!canUseExpenseReportPerformanceBrowserApis()) {
    return;
  }

  window.sessionStorage.removeItem(EXPENSE_REPORT_PERF_RECORDS_KEY);
}

/**
 * 측정 시작 시점의 공통 payload를 생성합니다.
 * @param {{ metric: string, meta?: object }} payload
 * @returns {{ metric: string, meta: object, startedAtMs: number, startedAtIso: string } | null}
 */
export function startExpenseReportPerformanceMeasurement(payload) {
  if (!isExpenseReportPerformanceEnabled()) {
    return null;
  }

  ensureExpenseReportPerformanceDebugApi();

  return {
    metric: payload.metric,
    meta: payload.meta || {},
    startedAtMs: getExpenseReportPerformanceNow(),
    startedAtIso: new Date().toISOString(),
  };
}

/**
 * 시작된 측정을 종료하고 결과를 기록합니다.
 * @param {{ metric: string, meta: object, startedAtMs: number, startedAtIso: string } | null} measurement
 * @param {{ outcome?: string, meta?: object }} options
 * @returns {object | null}
 */
export function completeExpenseReportPerformanceMeasurement(measurement, options = {}) {
  if (!measurement || !isExpenseReportPerformanceEnabled()) {
    return null;
  }

  const durationMs = Math.max(0, getExpenseReportPerformanceNow() - measurement.startedAtMs);

  return recordExpenseReportPerformanceMeasurement({
    metric: measurement.metric,
    durationMs,
    outcome: options.outcome || 'success',
    meta: {
      ...measurement.meta,
      ...(options.meta || {}),
      startedAt: measurement.startedAtIso,
    },
  });
}

/**
 * 단일 측정 결과를 기록 저장소와 콘솔에 남깁니다.
 * @param {{ metric: string, durationMs: number, outcome?: string, meta?: object }} payload
 * @returns {object | null}
 */
export function recordExpenseReportPerformanceMeasurement(payload) {
  if (!isExpenseReportPerformanceEnabled()) {
    return null;
  }

  ensureExpenseReportPerformanceDebugApi();

  const nextRecord = {
    metric: payload.metric,
    durationMs: Math.round((Number(payload.durationMs) || 0) * 10) / 10,
    outcome: payload.outcome || 'success',
    meta: payload.meta || {},
    recordedAt: new Date().toISOString(),
  };
  const nextRecords = [
    ...readStoredExpenseReportPerformanceRecords(),
    nextRecord,
  ];

  writeStoredExpenseReportPerformanceRecords(nextRecords);
  console.info('[expense-perf]', nextRecord.metric, `${nextRecord.durationMs}ms`, nextRecord);

  return nextRecord;
}

/**
 * 측정 기록을 metric/scenario/cacheState 기준으로 묶어 평균 요약을 콘솔 테이블로 출력합니다.
 * @returns {Array<object>}
 */
export function printExpenseReportPerformanceSummary() {
  const records = readStoredExpenseReportPerformanceRecords();
  const groupedRecords = new Map();

  records.forEach((record) => {
    const scenario = record.meta?.scenario || 'unknown';
    const cacheState = record.meta?.cacheState || 'n/a';
    const groupKey = [
      record.metric,
      scenario,
      cacheState,
      record.outcome,
    ].join('::');
    const currentGroup = groupedRecords.get(groupKey) || {
      metric: record.metric,
      scenario,
      cacheState,
      outcome: record.outcome,
      count: 0,
      totalDurationMs: 0,
      minDurationMs: Number.POSITIVE_INFINITY,
      maxDurationMs: 0,
    };

    currentGroup.count += 1;
    currentGroup.totalDurationMs += Number(record.durationMs) || 0;
    currentGroup.minDurationMs = Math.min(currentGroup.minDurationMs, Number(record.durationMs) || 0);
    currentGroup.maxDurationMs = Math.max(currentGroup.maxDurationMs, Number(record.durationMs) || 0);
    groupedRecords.set(groupKey, currentGroup);
  });

  const summaryRows = Array.from(groupedRecords.values()).map((group) => ({
    metric: group.metric,
    scenario: group.scenario,
    cacheState: group.cacheState,
    outcome: group.outcome,
    count: group.count,
    avgMs: Math.round((group.totalDurationMs / group.count) * 10) / 10,
    minMs: Math.round(group.minDurationMs * 10) / 10,
    maxMs: Math.round(group.maxDurationMs * 10) / 10,
  }));

  if (summaryRows.length > 0) {
    console.table(summaryRows);
  } else {
    console.info('[expense-perf] 아직 기록된 측정값이 없습니다.');
  }

  return summaryRows;
}
