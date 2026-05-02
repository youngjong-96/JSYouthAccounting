import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth, getRoleLabel } from '../context/AuthContext';
import { Users, Loader2, ChevronDown } from 'lucide-react';

const ROLES = [
  { value: 'pending',    label: '승인대기',    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'accounting', label: '회계팀',      cls: 'bg-navy-50 text-navy-600 border-navy-200' },
  { value: 'mokbuhoe',   label: '목부회',      cls: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'juboteam',   label: '주보팀',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'leader',     label: '청년부리더',  cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'master',     label: '마스터',      cls: 'bg-gold-50 text-gold-700 border-gold-200' },
];

function RoleBadge({ role }) {
  const r = ROLES.find(r => r.value === role) || ROLES[0];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${r.cls}`}>
      {r.label}
    </span>
  );
}

const UserManagementPage = () => {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const { user }            = useAuth();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      alert('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    // role 변경 시 is_approved도 동시에 업데이트 (하위 호환)
    const updates = {
      role: newRole,
      is_approved: newRole !== 'pending',
    };
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    } catch (e) {
      alert('권한 변경에 실패했습니다.');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="w-9 h-9 text-navy-400 animate-spin mb-3" />
      <p className="text-sm text-mist-500">사용자 목록 불러오는 중...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-slideUp pb-8">

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-navy-50 rounded-xl">
          <Users className="w-5 h-5 text-navy-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-navy-500">사용자 권한 관리</h2>
          <p className="text-xs text-mist-500">총 {users.length}명</p>
        </div>
      </div>

      {/* 역할 범례 */}
      <div className="bg-white rounded-2xl border border-mist-200 p-4">
        <p className="text-xs font-semibold text-mist-500 mb-2.5 uppercase tracking-wider">역할 안내</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(r => (
            <span key={r.value} className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${r.cls}`}>
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* 데스크톱 테이블 */}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-cream-100/50 transition-colors">
                <td className="px-5 py-3.5 text-xs text-mist-500">{u.email || '-'}</td>
                <td className="px-5 py-3.5 font-medium text-navy-500">{u.name}</td>
                <td className="px-5 py-3.5 text-mist-500">{u.organization || '-'}</td>
                <td className="px-5 py-3.5 text-mist-500">{u.contact || '-'}</td>
                <td className="px-5 py-3.5 text-center">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="relative inline-block">
                    <select
                      value={u.role || 'pending'}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={u.role === 'master' && u.id === user?.id}
                      className="appearance-none pl-3 pr-8 py-1.5 text-xs border-2 border-mist-200 rounded-xl text-navy-500 font-medium focus:outline-none focus:border-gold-400 bg-white disabled:opacity-50 cursor-pointer"
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-mist-400 pointer-events-none" />
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="6" className="px-5 py-10 text-center text-sm text-mist-400">
                  가입된 사용자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 */}
      <div className="md:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-2xl border border-mist-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-navy-500">{u.name}</p>
                <p className="text-xs text-mist-400">{u.email}</p>
              </div>
              <RoleBadge role={u.role} />
            </div>
            <div className="flex items-center gap-2 text-xs text-mist-500 mb-3">
              {u.organization && <span>{u.organization}</span>}
              {u.contact && <span>· {u.contact}</span>}
            </div>
            <div className="relative">
              <select
                value={u.role || 'pending'}
                onChange={e => handleRoleChange(u.id, e.target.value)}
                disabled={u.role === 'master' && u.id === user?.id}
                className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border-2 border-mist-200 rounded-xl text-navy-500 font-medium focus:outline-none focus:border-gold-400 bg-white disabled:opacity-50"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-400 pointer-events-none" />
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="bg-white rounded-2xl border border-mist-200 p-10 text-center text-sm text-mist-400">
            가입된 사용자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;
