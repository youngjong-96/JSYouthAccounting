import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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

  /**
   * 세션 사용자와 프로필 정보를 합쳐 인증 상태를 구성합니다.
   * @param {import('@supabase/supabase-js').User | null} supabaseUser
   * @param {string | null | undefined} accessToken
   * @returns {Promise<void>}
   */
  const loadProfile = async (supabaseUser, accessToken) => {
    if (!supabaseUser) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      /* 승인 대기이거나 프로필이 없으면 로그인 상태를 유지하지 않습니다. */
      if (!profile || profile.role === 'pending') {
        await supabase.auth.signOut();
        setUser(null);
        setToken(null);
      } else {
        setUser({ ...supabaseUser, ...profile });
        setToken(accessToken);
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile(session.user, session.access_token);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadProfile(session.user, session.access_token);
      } else {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * 현재 로그인 세션을 종료합니다.
   * @returns {Promise<void>}
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  const role = user?.role;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        logout,
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
