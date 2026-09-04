import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import {
  clearAuthSessionExpiredNotice,
  clearAuthSessionLifetime,
  getAuthSessionDeadline,
  isStoredAuthSessionExpired,
  markAuthSessionExpiredNotice,
} from '../lib/authSessionLifetime';
import {
  canUseBoard,
  canManageChecks,
  canManageUsers,
  canViewDetail,
  canViewExpense,
  canViewSummary,
  canWriteExpense,
  isExpenseOwnOnly,
  isHeongeumOnly,
} from './authPermissions';

const AuthContext = createContext(null);

/**
 * 인증 상태와 사용자 권한 정보를 전역으로 제공합니다.
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionExpiryTimerRef = useRef(null);
  const sessionExpirationInProgressRef = useRef(false);
  const authStateVersionRef = useRef(0);

  /**
   * 현재 세션의 자동 로그아웃 타이머를 정리합니다.
   * @returns {void}
   */
  const clearSessionExpiryTimer = useCallback(() => {
    if (sessionExpiryTimerRef.current !== null) {
      window.clearTimeout(sessionExpiryTimerRef.current);
      sessionExpiryTimerRef.current = null;
    }
  }, []);

  /**
   * 로그인 후 2시간이 지난 현재 브라우저 세션을 종료합니다.
   * @returns {Promise<void>}
   */
  const expireSession = useCallback(async () => {
    if (sessionExpirationInProgressRef.current) {
      return;
    }

    sessionExpirationInProgressRef.current = true;
    authStateVersionRef.current += 1;
    clearSessionExpiryTimer();
    markAuthSessionExpiredNotice();
    clearAuthSessionLifetime();
    setUser(null);
    setToken(null);
    setLoading(false);

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('자동 로그아웃 중 Supabase 세션 정리에 실패했습니다.', error);
    } finally {
      sessionExpirationInProgressRef.current = false;
    }
  }, [clearSessionExpiryTimer]);

  /**
   * 토큰 자체의 갱신 여부와 관계없이 최초 로그인 시각 기준 만료를 예약합니다.
   * @param {import('@supabase/supabase-js').Session | null | undefined} session
   * @returns {boolean} 아직 유효한 세션인지 여부
   */
  const scheduleSessionExpiration = useCallback((session) => {
    const deadline = getAuthSessionDeadline(session);
    if (!deadline) {
      return false;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      void expireSession();
      return false;
    }

    clearSessionExpiryTimer();
    sessionExpiryTimerRef.current = window.setTimeout(() => {
      void expireSession();
    }, remainingMs);
    return true;
  }, [clearSessionExpiryTimer, expireSession]);

  /**
   * 세션 사용자와 프로필 정보를 합쳐 인증 상태를 구성합니다.
   * @param {import('@supabase/supabase-js').User | null} supabaseUser
   * @param {string | null | undefined} accessToken
   * @returns {Promise<void>}
   */
  const loadProfile = useCallback(async (supabaseUser, accessToken) => {
    if (!supabaseUser) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    const requestVersion = authStateVersionRef.current;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (requestVersion !== authStateVersionRef.current) {
        return;
      }

      /* 승인 대기이거나 프로필이 없으면 로그인 상태를 유지하지 않습니다. */
      if (!profile || profile.role === 'pending') {
        authStateVersionRef.current += 1;
        clearSessionExpiryTimer();
        clearAuthSessionLifetime();
        try {
          await supabase.auth.signOut();
        } finally {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
      } else {
        setUser({ ...supabaseUser, ...profile });
        setToken(accessToken);
      }
    } catch {
      if (requestVersion === authStateVersionRef.current) {
        setUser(null);
        setToken(null);
      }
    } finally {
      if (requestVersion === authStateVersionRef.current) {
        setLoading(false);
      }
    }
  }, [clearSessionExpiryTimer]);

  /**
   * 현재 세션 기준으로 프로필을 다시 불러와 전역 사용자 상태를 최신으로 맞춥니다.
   * @returns {Promise<void>}
   */
  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      clearSessionExpiryTimer();
      clearAuthSessionLifetime();
      setUser(null);
      setToken(null);
      return;
    }

    if (!scheduleSessionExpiration(session)) {
      return;
    }

    await loadProfile(session.user, session.access_token);
  }, [clearSessionExpiryTimer, loadProfile, scheduleSessionExpiration]);

  useEffect(() => {
    let disposed = false;

    const handleSession = async (session) => {
      if (disposed) {
        return;
      }
      if (!session) {
        authStateVersionRef.current += 1;
        clearSessionExpiryTimer();
        clearAuthSessionLifetime();
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      if (!scheduleSessionExpiration(session)) {
        return;
      }

      await loadProfile(session.user, session.access_token);
    };

    supabase.auth.getSession()
      .then(({ data: { session } }) => handleSession(session))
      .catch(() => {
        if (!disposed) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(session);
    });

    const checkStoredExpiration = () => {
      if (isStoredAuthSessionExpired()) {
        void expireSession();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStoredExpiration();
      }
    };

    window.addEventListener('focus', checkStoredExpiration);
    window.addEventListener('storage', checkStoredExpiration);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      subscription.unsubscribe();
      clearSessionExpiryTimer();
      window.removeEventListener('focus', checkStoredExpiration);
      window.removeEventListener('storage', checkStoredExpiration);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearSessionExpiryTimer, expireSession, loadProfile, scheduleSessionExpiration]);

  /**
   * 현재 로그인 세션을 종료합니다.
   * @returns {Promise<void>}
   */
  const logout = async () => {
    authStateVersionRef.current += 1;
    clearSessionExpiryTimer();
    clearAuthSessionLifetime();
    clearAuthSessionExpiredNotice();
    setUser(null);
    setToken(null);
    await supabase.auth.signOut();
  };

  const role = user?.role;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        logout,
        refreshProfile,
        isAuthenticated: !!user,
        role,
        canViewSummary: canViewSummary(role),
        canViewDetail: canViewDetail(role),
        canWriteExpense: canWriteExpense(role),
        canViewExpense: canViewExpense(role),
        canUseBoard: canUseBoard(role),
        canManageUsers: canManageUsers(role),
        canManageChecks: canManageChecks(role),
        isHeongeumOnly: isHeongeumOnly(role),
        isExpenseOwnOnly: isExpenseOwnOnly(role),
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

/**
 * 인증 컨텍스트를 편하게 읽기 위한 훅입니다.
 * @returns {ReturnType<typeof useContext>}
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
