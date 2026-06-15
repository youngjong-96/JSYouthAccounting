const EXPENSE_REPORT_CACHE_INVALIDATION_KEY = 'expense-report-cache-invalidation';

/**
 * 브라우저 환경에서 세션 스토리지를 사용할 수 있는지 확인합니다.
 * @returns {boolean}
 */
function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

/**
 * 캐시 무효화 payload를 저장 가능한 공통 형태로 정리합니다.
 * @param {{ userId?: string | null, reportId?: string | null, reason?: string | null }} payload
 * @returns {{ userId: string, reportId: string | null, reason: string | null, updatedAt: number } | null}
 */
function normalizeExpenseReportCacheInvalidation(payload = {}) {
  const normalizedUserId = typeof payload.userId === 'string' ? payload.userId.trim() : '';

  if (!normalizedUserId) {
    return null;
  }

  return {
    userId: normalizedUserId,
    reportId: typeof payload.reportId === 'string' && payload.reportId.trim()
      ? payload.reportId.trim()
      : null,
    reason: typeof payload.reason === 'string' && payload.reason.trim()
      ? payload.reason.trim()
      : null,
    updatedAt: Date.now(),
  };
}

/**
 * 지출결의서 목록/상세 캐시를 비워야 한다는 신호를 세션 스토리지에 기록합니다.
 * @param {{ userId?: string | null, reportId?: string | null, reason?: string | null }} payload
 * @returns {void}
 */
export function writeExpenseReportCacheInvalidation(payload = {}) {
  const normalizedPayload = normalizeExpenseReportCacheInvalidation(payload);

  if (!normalizedPayload || !canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(
    EXPENSE_REPORT_CACHE_INVALIDATION_KEY,
    JSON.stringify(normalizedPayload),
  );
}

/**
 * 세션 스토리지에 저장된 지출결의서 캐시 무효화 신호를 읽어옵니다.
 * @returns {{ userId: string, reportId: string | null, reason: string | null, updatedAt: number } | null}
 */
export function readExpenseReportCacheInvalidation() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(EXPENSE_REPORT_CACHE_INVALIDATION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return normalizeExpenseReportCacheInvalidation(parsedValue);
  } catch {
    return null;
  }
}

/**
 * 처리한 지출결의서 캐시 무효화 신호를 세션 스토리지에서 제거합니다.
 * @returns {void}
 */
export function clearExpenseReportCacheInvalidation() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(EXPENSE_REPORT_CACHE_INVALIDATION_KEY);
}
