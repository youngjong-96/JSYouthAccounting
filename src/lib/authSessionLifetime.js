export const AUTH_SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const AUTH_SESSION_STORAGE_KEY = 'jsyouth-auth-session-start-v1';
const AUTH_SESSION_EXPIRED_NOTICE_KEY = 'jsyouth-auth-session-expired-v1';
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * 브라우저 저장소를 안전하게 가져옵니다.
 * 개인정보 보호 모드처럼 Storage 접근이 차단된 환경에서는 null을 반환합니다.
 * @param {'localStorage' | 'sessionStorage'} storageName
 * @returns {Storage | null}
 */
function getBrowserStorage(storageName) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[storageName] || null;
  } catch {
    return null;
  }
}

/**
 * 저장된 고정 세션 시작 정보를 읽습니다.
 * @returns {{ userId: string, startedAt: number } | null}
 */
function readStoredSessionLifetime() {
  const storage = getBrowserStorage('localStorage');
  if (!storage) {
    return null;
  }

  try {
    const parsed = JSON.parse(storage.getItem(AUTH_SESSION_STORAGE_KEY) || 'null');
    const userId = String(parsed?.userId || '');
    const startedAt = Number(parsed?.startedAt);
    if (!userId || !Number.isFinite(startedAt) || startedAt <= 0) {
      return null;
    }
    return { userId, startedAt };
  } catch {
    return null;
  }
}

/**
 * 새로운 로그인의 고정 시작 시각을 기록합니다.
 * @param {string} userId
 * @param {number} [startedAt]
 * @returns {number | null} 만료 시각(ms)
 */
export function startAuthSession(userId, startedAt = Date.now()) {
  const normalizedUserId = String(userId || '');
  const normalizedStartedAt = Number(startedAt);
  if (!normalizedUserId || !Number.isFinite(normalizedStartedAt) || normalizedStartedAt <= 0) {
    return null;
  }

  const storage = getBrowserStorage('localStorage');
  if (storage) {
    try {
      storage.setItem(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify({ userId: normalizedUserId, startedAt: normalizedStartedAt }),
      );
    } catch {
      // Storage가 차단돼도 현재 탭의 타이머는 계속 사용할 수 있습니다.
    }
  }

  clearAuthSessionExpiredNotice();
  return normalizedStartedAt + AUTH_SESSION_MAX_AGE_MS;
}

/**
 * Supabase 세션에 대응하는 고정 만료 시각을 반환합니다.
 * 토큰 갱신 이벤트에서는 기존 시작 시각을 유지합니다.
 * @param {import('@supabase/supabase-js').Session | null | undefined} session
 * @param {number} [now]
 * @returns {number | null}
 */
export function getAuthSessionDeadline(session, now = Date.now()) {
  const userId = String(session?.user?.id || '');
  if (!userId) {
    return null;
  }

  const stored = readStoredSessionLifetime();
  if (
    stored?.userId === userId
    && stored.startedAt <= now + MAX_CLOCK_SKEW_MS
  ) {
    return stored.startedAt + AUTH_SESSION_MAX_AGE_MS;
  }

  const lastSignInAt = Date.parse(session?.user?.last_sign_in_at || '');
  const reliableStartedAt = Number.isFinite(lastSignInAt)
    && lastSignInAt > 0
    && lastSignInAt <= now + MAX_CLOCK_SKEW_MS
    ? lastSignInAt
    : now;
  return startAuthSession(userId, reliableStartedAt);
}

/**
 * 저장된 현재 브라우저 세션이 만료됐는지 확인합니다.
 * @param {number} [now]
 * @returns {boolean}
 */
export function isStoredAuthSessionExpired(now = Date.now()) {
  const stored = readStoredSessionLifetime();
  return Boolean(stored && stored.startedAt + AUTH_SESSION_MAX_AGE_MS <= now);
}

/**
 * 고정 세션 시작 정보를 삭제합니다.
 * @returns {void}
 */
export function clearAuthSessionLifetime() {
  const storage = getBrowserStorage('localStorage');
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Storage 접근 실패는 로그아웃 상태 전환을 막지 않습니다.
  }
}

/**
 * 로그인 화면에 자동 로그아웃 안내를 한 번 표시하도록 기록합니다.
 * @returns {void}
 */
export function markAuthSessionExpiredNotice() {
  const storage = getBrowserStorage('sessionStorage');
  if (!storage) {
    return;
  }

  try {
    storage.setItem(AUTH_SESSION_EXPIRED_NOTICE_KEY, '1');
  } catch {
    // 안내 저장 실패는 실제 로그아웃을 막지 않습니다.
  }
}

/**
 * 자동 로그아웃 안내 여부를 읽은 뒤 삭제합니다.
 * @returns {boolean}
 */
export function consumeAuthSessionExpiredNotice() {
  const storage = getBrowserStorage('sessionStorage');
  if (!storage) {
    return false;
  }

  try {
    const shouldShow = storage.getItem(AUTH_SESSION_EXPIRED_NOTICE_KEY) === '1';
    storage.removeItem(AUTH_SESSION_EXPIRED_NOTICE_KEY);
    return shouldShow;
  } catch {
    return false;
  }
}

/**
 * 수동 로그인/로그아웃 시 남아 있는 자동 만료 안내를 삭제합니다.
 * @returns {void}
 */
export function clearAuthSessionExpiredNotice() {
  const storage = getBrowserStorage('sessionStorage');
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_SESSION_EXPIRED_NOTICE_KEY);
  } catch {
    // 안내 정리 실패는 인증 흐름에 영향을 주지 않습니다.
  }
}
