import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

/* ─────────────────────────────────────────
   역할별 권한 매트릭스
   ───────────────────────────────────────── */
const PERMISSIONS = {
  master:     { summary: 'all',          detail: true,  expenseWrite: true,  expenseView: 'all',  users: true,  checkManage: true  },
  accounting: { summary: 'all',          detail: true,  expenseWrite: true,  expenseView: 'all',  users: false, checkManage: true  },
  mokbuhoe:   { summary: 'all',          detail: true,  expenseWrite: false, expenseView: 'all',  users: false, checkManage: false },
  juboteam:   { summary: 'heongeumOnly', detail: false, expenseWrite: false, expenseView: false,  users: false, checkManage: false },
  leader:     { summary: false,          detail: false, expenseWrite: true,  expenseView: 'own',  users: false, checkManage: false },
  pending:    { summary: false,          detail: false, expenseWrite: false, expenseView: false,  users: false, checkManage: false },
};

export const getRoleLabel = (role) => ({
  master:     '마스터',
  accounting: '회계팀',
  mokbuhoe:   '목부회',
  juboteam:   '주보팀',
  leader:     '청년부리더',
  pending:    '승인대기',
}[role] || role || '-');

const perm = (role) => PERMISSIONS[role] || PERMISSIONS.pending;

export const canViewSummary    = (role) => !!perm(role).summary;
export const canViewDetail     = (role) => !!perm(role).detail;
export const canWriteExpense   = (role) => perm(role).expenseWrite;
export const canViewExpense    = (role) => !!perm(role).expenseView;
export const canManageUsers    = (role) => perm(role).users;
export const canManageChecks   = (role) => perm(role).checkManage;
export const isHeongeumOnly    = (role) => perm(role).summary === 'heongeumOnly';
export const isExpenseOwnOnly  = (role) => perm(role).expenseView === 'own';

/* ─────────────────────────────────────────
   AuthProvider
   ───────────────────────────────────────── */
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (supabaseUser, accessToken) => {
    if (!supabaseUser) {
      setUser(null); setToken(null); setLoading(false);
      return;
    }
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      // 미승인(pending) 또는 프로필 없으면 로그아웃
      if (!profile || profile.role === 'pending') {
        await supabase.auth.signOut();
        setUser(null); setToken(null);
      } else {
        const merged = { ...supabaseUser, ...profile };
        setUser(merged);
        setToken(accessToken);
      }
    } catch {
      setUser(null); setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user, session.access_token);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile(session.user, session.access_token);
      else { setUser(null); setToken(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); setToken(null);
  };

  const role = user?.role;

  return (
    <AuthContext.Provider value={{
      user, token, loading, logout,
      isAuthenticated: !!user,
      role,
      // 권한 헬퍼 (컴포넌트에서 바로 사용)
      canViewSummary:   canViewSummary(role),
      canViewDetail:    canViewDetail(role),
      canWriteExpense:  canWriteExpense(role),
      canViewExpense:   canViewExpense(role),
      canManageUsers:   canManageUsers(role),
      canManageChecks:  canManageChecks(role),
      isHeongeumOnly:   isHeongeumOnly(role),
      isExpenseOwnOnly: isExpenseOwnOnly(role),
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
