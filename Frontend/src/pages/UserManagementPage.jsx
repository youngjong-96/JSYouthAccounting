import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Loader2, CheckCircle, Clock } from 'lucide-react';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    // Auto-approve when setting non-pending role
    if (updates.role && updates.role !== 'pending') {
      updates.is_approved = true;
    }
    if (updates.is_approved === false) {
      updates.role = 'pending';
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
    } catch (error) {
      console.error('Error updating user:', error);
      alert('사용자 정보를 업데이트하지 못했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-32">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'master') {
    return (
      <div className="text-center py-32 text-red-600 font-bold text-xl">
        접근 권한이 없습니다. (마스터 전용)
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-6">
        <Users className="w-8 h-8 text-blue-600 mr-4" />
        <h1 className="text-3xl font-bold text-gray-900">사용자 권한 관리</h1>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">이메일</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">이름</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">소속</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">연락처</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600">가입 승인</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600">역할(권한)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 text-xs">{u.email || '-'}</td>
                  <td className="px-6 py-4">{u.name}</td>
                  <td className="px-6 py-4 text-gray-500">{u.organization || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{u.contact || '-'}</td>

                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleUpdateUser(u.id, { is_approved: !u.is_approved })}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        u.is_approved
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}
                    >
                      {u.is_approved ? (
                        <><CheckCircle className="w-4 h-4 mr-1.5" /> 승인됨</>
                      ) : (
                        <><Clock className="w-4 h-4 mr-1.5" /> 승인 대기</>
                      )}
                    </button>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                      disabled={u.role === 'master' && u.id === user?.id}
                      className="text-sm border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="pending">승인대기</option>
                      <option value="viewer">일반조회자</option>
                      <option value="master">마스터</option>
                    </select>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    가입된 사용자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;
