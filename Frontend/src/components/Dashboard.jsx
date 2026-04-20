import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Outlet, useLocation } from 'react-router-dom';
import { Search, Loader2, LogOut, Menu, Filter } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [week, setWeek] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const { logout, user, token } = useAuth();
  const location = useLocation();

  const isUserManagement = location.pathname === '/users';
  const isExpensePage = location.pathname.startsWith('/expense');
  const showFilter = !isUserManagement && !isExpensePage;

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = { year, month };
      if (week) params.week = week;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_BASE_URL}/api/finance/summary`, { params, headers });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {}, []);

  const selectClass = "w-full px-3 py-2.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 font-medium focus:outline-none focus:border-gold-400 transition-all text-[16px] appearance-none";

  return (
    <div className="flex bg-cream-100 min-h-screen font-gmarket">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* ── 상단 네비바 ── */}
        <nav className="bg-navy-500 sticky top-0 z-30 shadow-lg shadow-navy-500/20">
          <div className="px-4 sm:px-6">
            <div className="flex justify-between h-14 items-center">
              {/* 왼쪽: 햄버거 */}
              <div className="flex items-center gap-2">
                {!isSidebarOpen && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                {/* 모바일에서 페이지명 표시 */}
                <span className="text-white/80 text-sm font-medium md:hidden">
                  {isExpensePage
                    ? location.pathname.includes('create') ? '지출결의서 작성' : '지출결의서 보기'
                    : isUserManagement ? '사용자 관리'
                    : '요약 보기'}
                </span>
              </div>

              {/* 오른쪽: 로그아웃 */}
              <div className="flex items-center">
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-sm"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">로그아웃</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* ── 메인 콘텐츠 ── */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-4xl w-full mx-auto">

          {/* ── 필터 영역 (요약/상세내역 페이지만 표시) ── */}
          {showFilter && (
            <div className="bg-white rounded-2xl shadow-sm border border-mist-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-navy-50 rounded-lg">
                  <Filter className="w-4 h-4 text-navy-500" />
                </div>
                <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider">조회 필터</h2>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="relative">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={selectClass}
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">전체</option>
                    {[...Array(12).keys()].map(m => (
                      <option key={m + 1} value={m + 1}>{m + 1}월</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">전체</option>
                    {[1, 2, 3, 4, 5].map(w => (
                      <option key={w} value={w}>{w}주차</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={fetchSummary}
                disabled={loading}
                className="w-full py-3 bg-navy-500 hover:bg-navy-600 active:bg-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm shadow-navy-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />불러오는 중...</>
                  : <><Search className="w-4 h-4" />조회하기</>
                }
              </button>
            </div>
          )}

          {/* ── 페이지 콘텐츠 ── */}
          {!showFilter ? (
            <Outlet context={{ data, loading, year, month, week, fetchSummary }} />
          ) : !data && !loading ? (
            /* 초기 안내 화면 */
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-mist-200 flex items-center justify-center mb-5 mx-auto">
                <Search className="w-9 h-9 text-mist-300" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-bold text-navy-500 mb-2">조회할 기간을 선택해주세요</h2>
              <p className="text-sm text-mist-500 leading-relaxed">
                위 필터에서 <span className="text-gold-500 font-medium">년, 월, 주차</span>를 선택하고<br />
                <span className="text-navy-400 font-medium">조회하기</span> 버튼을 눌러주세요.
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-10 h-10 text-navy-400 animate-spin mb-3" />
              <p className="text-sm text-mist-500">데이터를 불러오는 중...</p>
            </div>
          ) : data ? (
            <Outlet context={{ data, loading, year, month, week, fetchSummary }} />
          ) : null}
        </main>
      </div>

    </div>
  );
};

export default Dashboard;
