import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Loader2, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel, ROLE_OPTIONS } from '../context/authPermissions';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * 화면에서 사용할 역할 배지 정보를 반환합니다.
 * 알 수 없는 역할은 관리자가 재지정할 수 있도록 안내용 배지로 표시합니다.
 * @param {string | null | undefined} role
 * @returns {{ value: string, label: string, cls: string }}
 */
function getRoleBadgeMeta(role) {
  const matchedRole = ROLE_OPTIONS.find((option) => option.value === role);

  if (matchedRole) {
    return matchedRole;
  }

  return {
    value: 'pending',
    label: '권한 정리 필요',
    cls: 'bg-red-50 text-red-700 border-red-200',
  };
}

/**
 * 역할 선택 박스에 바인딩할 안전한 역할 값을 반환합니다.
 * 목록에 없는 값은 pending으로 보여주어 관리자가 바로 재지정할 수 있게 합니다.
 * @param {string | null | undefined} role
 * @returns {string}
 */
function getSelectableRole(role) {
  return ROLE_OPTIONS.some((option) => option.value === role) ? role : 'pending';
}

/**
 * 사용자 역할을 배지 형태로 표시합니다.
 * @param {{ role: string | null | undefined }} props
 * @returns {JSX.Element}
 */
function RoleBadge({ role }) {
  const badge = getRoleBadgeMeta(role);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badge.cls}`}
      title={badge.label === '권한 정리 필요' ? `현재 저장값: ${getRoleLabel(role)}` : undefined}
    >
      {badge.label}
    </span>
  );
}

/**
 * 사용자 목록 조회와 역할 변경, 계정 삭제 기능을 제공합니다.
 * @returns {JSX.Element}
 */
const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { user, token } = useAuth();

  /**
   * 최신 사용자 목록을 Supabase에서 다시 불러옵니다.
   * @returns {Promise<void>}
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch {
      alert('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * 선택한 사용자 역할과 승인 상태를 함께 갱신합니다.
   * @param {string} userId
   * @param {string} newRole
   * @returns {Promise<void>}
   */
  const handleRoleChange = async (userId, newRole) => {
    const updates = {
      role: newRole,
      is_approved: newRole !== 'pending',
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setUsers((prevUsers) => prevUsers.map((currentUser) => (
        currentUser.id === userId ? { ...currentUser, ...updates } : currentUser
      )));
    } catch {
      alert('권한 변경에 실패했습니다.');
    }
  };

  /**
   * 선택한 사용자를 서버 API를 통해 삭제합니다.
   * @returns {Promise<void>}
   */
  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`${API_URL}/api/accounts/users?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '삭제에 실패했습니다.');
      }

      setUsers((prevUsers) => prevUsers.filter((currentUser) => currentUser.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      alert(`삭제에 실패했습니다: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-9 h-9 text-navy-400 animate-spin mb-3" />
        <p className="text-sm text-mist-500">사용자 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slideUp pb-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-navy-50 rounded-xl">
          <Users className="w-5 h-5 text-navy-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-navy-500">사용자 권한 관리</h2>
          <p className="text-xs text-mist-500">총 {users.length}명</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-mist-200 p-4">
        <p className="text-xs font-semibold text-mist-500 mb-2.5 uppercase tracking-wider">역할 안내</p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((role) => (
            <span
              key={role.value}
              className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${role.cls}`}
            >
              {role.label}
            </span>
          ))}
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-100 border-b border-mist-200 text-xs text-mist-500">
              <th className="px-5 py-3.5 text-left font-semibold">이메일</th>
              <th className="px-5 py-3.5 text-left font-semibold">이름</th>
              <th className="px-5 py-3.5 text-left font-semibold">소속</th>
              <th className="px-5 py-3.5 text-left font-semibold">연락처</th>
              <th className="px-5 py-3.5 text-center font-semibold">현재 역할</th>
              <th className="px-5 py-3.5 text-center font-semibold">역할 변경</th>
              <th className="px-5 py-3.5 text-center font-semibold">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100">
            {users.map((currentUser) => (
              <tr key={currentUser.id} className="hover:bg-cream-100/50 transition-colors group">
                <td className="px-5 py-3.5 text-xs text-mist-500">{currentUser.email || '-'}</td>
                <td className="px-5 py-3.5 font-medium text-navy-500">{currentUser.name}</td>
                <td className="px-5 py-3.5 text-mist-500">{currentUser.organization || '-'}</td>
                <td className="px-5 py-3.5 text-mist-500">{currentUser.contact || '-'}</td>
                <td className="px-5 py-3.5 text-center">
                  <RoleBadge role={currentUser.role} />
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="relative inline-block">
                    <select
                      value={getSelectableRole(currentUser.role)}
                      onChange={(event) => handleRoleChange(currentUser.id, event.target.value)}
                      disabled={currentUser.role === 'master' && currentUser.id === user?.id}
                      className="appearance-none pl-3 pr-8 py-1.5 text-xs border-2 border-mist-200 rounded-xl text-navy-500 font-medium focus:outline-none focus:border-gold-400 bg-white disabled:opacity-50 cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-mist-400 pointer-events-none" />
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => setDeleteTarget({ id: currentUser.id, name: currentUser.name })}
                    disabled={currentUser.id === user?.id}
                    className="p-1.5 text-mist-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
                    title={currentUser.id === user?.id ? '본인 계정은 삭제할 수 없습니다.' : '사용자 삭제'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="7" className="px-5 py-10 text-center text-sm text-mist-400">
                  가입한 사용자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {users.map((currentUser) => (
          <div key={currentUser.id} className="bg-white rounded-2xl border border-mist-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-navy-500">{currentUser.name}</p>
                <p className="text-xs text-mist-400">{currentUser.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={currentUser.role} />
                <button
                  onClick={() => setDeleteTarget({ id: currentUser.id, name: currentUser.name })}
                  disabled={currentUser.id === user?.id}
                  className="p-1.5 text-mist-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-mist-500 mb-3">
              {currentUser.organization && <span>{currentUser.organization}</span>}
              {currentUser.contact && <span>· {currentUser.contact}</span>}
            </div>
            <div className="relative">
              <select
                value={getSelectableRole(currentUser.role)}
                onChange={(event) => handleRoleChange(currentUser.id, event.target.value)}
                disabled={currentUser.role === 'master' && currentUser.id === user?.id}
                className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border-2 border-mist-200 rounded-xl text-navy-500 font-medium focus:outline-none focus:border-gold-400 bg-white disabled:opacity-50"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-400 pointer-events-none" />
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="bg-white rounded-2xl border border-mist-200 p-10 text-center text-sm text-mist-400">
            가입한 사용자가 없습니다.
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-slideUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-500">사용자 삭제</h3>
                <p className="text-xs text-mist-500">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            <p className="text-sm text-mist-500 mb-6 leading-relaxed bg-cream-100 rounded-xl px-4 py-3">
              <span className="font-bold text-navy-500">{deleteTarget.name}</span>
              님의 계정을 영구적으로 삭제합니다.
              <br />
              모든 데이터가 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-cream-100 text-navy-500 font-medium rounded-xl hover:bg-mist-200 transition-colors text-sm"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    삭제 중...
                  </>
                ) : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
