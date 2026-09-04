const REMEMBERED_LOGIN_EMAIL_STORAGE_KEY = 'jsyouth-remembered-login-email-v1';

/**
 * 브라우저에서 이메일 기억하기에 사용할 저장소를 안전하게 가져옵니다.
 * @returns {Storage | null}
 */
const getStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

/**
 * 로그인 화면에 자동 입력할 이메일을 불러옵니다.
 * @returns {string}
 */
export const getRememberedLoginEmail = () => {
  try {
    return getStorage()?.getItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
};

/**
 * 로그인에 성공한 이메일만 브라우저에 기억합니다.
 * @param {string} email
 * @returns {string} 저장한 이메일
 */
export const saveRememberedLoginEmail = (email) => {
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';

  try {
    const storage = getStorage();
    if (!storage) {
      return '';
    }

    if (!normalizedEmail) {
      storage.removeItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY);
      return '';
    }

    storage.setItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY, normalizedEmail);
    return normalizedEmail;
  } catch {
    return '';
  }
};

/**
 * 기억된 로그인 이메일을 삭제합니다.
 * @returns {void}
 */
export const clearRememberedLoginEmail = () => {
  try {
    getStorage()?.removeItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY);
  } catch {
    // 브라우저 저장소가 차단된 환경에서는 별도 동작 없이 종료합니다.
  }
};
