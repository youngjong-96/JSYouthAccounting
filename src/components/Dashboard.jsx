import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Outlet, useLocation } from 'react-router-dom';
import { Filter, Loader2, LogOut, Search, X } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileBottomNavigation from './MobileBottomNavigation';
import MobileTopBar from './MobileTopBar';
import { useAuth } from '../context/AuthContext';
import {
  completeRequestPerformanceMeasurement,
  getServerTimingHeader,
  startRequestPerformanceMeasurement,
  waitForNextPaint,
} from '../lib/requestPerformance';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const LOGIN_NOTICE_SESSION_KEY = 'post-login-support-notice-dismissed';

/**
 * 로그인 공지 팝업 상태를 sessionStorage에 저장할 수 있는지 확인합니다.
 * @returns {boolean}
 */
function canUseLoginNoticeSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

/**
 * 현재 로그인 세션에서 공지 팝업을 이미 닫았는지 확인합니다.
 * @returns {boolean}
 */
function hasDismissedLoginNotice() {
  if (!canUseLoginNoticeSessionStorage()) {
    return false;
  }

  return window.sessionStorage.getItem(LOGIN_NOTICE_SESSION_KEY) === '1';
}

/**
 * 현재 로그인 세션에서 공지 팝업을 닫았다는 상태를 기록합니다.
 * @returns {void}
 */
function markLoginNoticeDismissed() {
  if (!canUseLoginNoticeSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(LOGIN_NOTICE_SESSION_KEY, '1');
}

/**
 * 로그아웃 시 다음 로그인에서 공지 팝업이 다시 보이도록 상태를 초기화합니다.
 * @returns {void}
 */
function clearLoginNoticeDismissed() {
  if (!canUseLoginNoticeSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(LOGIN_NOTICE_SESSION_KEY);
}

/**
 * 앱의 공통 레이아웃과 요약 조회 필터를 렌더링합니다.
 * @returns {JSX.Element}
 */
const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [week, setWeek] = useState('');
  const [showLoginNotice, setShowLoginNotice] = useState(false);
  const { logout, token, user } = useAuth();
  const location = useLocation();

  const isUserManagement = location.pathname === '/users';
  const isExpensePage = location.pathname.startsWith('/expense');
  const isBoardPage = location.pathname.startsWith('/board');
  const isMyPage = location.pathname === '/mypage';
  const showFilter = !isUserManagement && !isExpensePage && !isBoardPage && !isMyPage;
  const mainClassName = 'flex-1 w-full px-4 pt-6 pb-24 sm:px-6 md:max-w-[1120px] md:py-6 lg:max-w-[1320px] xl:max-w-[1480px] 2xl:max-w-[1640px] xl:px-8 mx-auto';

  /**
   * 선택한 기간 기준으로 재정 요약 데이터를 조회합니다.
   * @returns {Promise<void>}
   */
  const fetchSummary = async () => {
    const measurement = startRequestPerformanceMeasurement({
      metric: 'finance_summary_display',
      meta: {
        hasMonth: Boolean(month),
        hasWeek: Boolean(week),
      },
    });
    setLoading(true);

    try {
      const params = { year, month };
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (week) {
        params.week = week;
      }

      const response = await axios.get(`${API_BASE_URL}/api/finance/summary`, { params, headers });
      setData(response.data);
      if (measurement) {
        await waitForNextPaint();
      }
      completeRequestPerformanceMeasurement(measurement, {
        meta: {
          status: response.status,
          recordCount: response.data?.raw_records?.length || 0,
          personnelRecordCount: response.data?.raw_personnel_records?.length || 0,
        },
        serverTiming: getServerTimingHeader(response.headers),
      });
    } catch (error) {
      completeRequestPerformanceMeasurement(measurement, {
        outcome: 'failed',
        meta: { status: error.response?.status || null },
        serverTiming: getServerTimingHeader(error.response?.headers),
      });
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 로그인 직후 공지 팝업을 한 번 보여줄지 결정합니다.
   * @returns {void}
   */
  useEffect(() => {
    if (!user?.id || hasDismissedLoginNotice()) {
      return;
    }

    setShowLoginNotice(true);
  }, [user?.id]);

  /**
   * 로그인 공지 팝업을 닫고 현재 세션에서 다시 보이지 않도록 기록합니다.
   * @returns {void}
   */
  const handleCloseLoginNotice = () => {
    setShowLoginNotice(false);
    markLoginNoticeDismissed();
  };

  /**
   * 로그아웃 전에 공지 팝업 표시 상태를 초기화한 뒤 세션을 종료합니다.
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    clearLoginNoticeDismissed();
    await logout();
  };

  const selectClass = 'w-full px-3 py-2.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 font-medium focus:outline-none focus:border-gold-400 transition-all text-[16px] appearance-none';

  return (
    <div className="flex bg-cream-100 min-h-screen font-gmarket">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar onLogout={handleLogout} />

        <nav className="sticky top-0 z-30 hidden bg-navy-500 shadow-lg shadow-navy-500/20 md:block">
          <div className="px-4 sm:px-6">
            <div className="flex justify-between h-14 items-center">
              <div />

              <div className="flex items-center">
                <button
                  onClick={handleLogout}
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

        <main className={mainClassName}>
          {showFilter && (
            <div className="bg-white rounded-2xl shadow-sm border border-mist-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-navy-50 rounded-lg">
                  <Filter className="w-4 h-4 text-navy-500" />
                </div>
                <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider">조회 필터</h2>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="grid grid-cols-3 gap-2 lg:flex-1">
                  <div className="relative">
                    <select
                      value={year}
                      onChange={(event) => setYear(event.target.value)}
                      className={selectClass}
                    >
                      {[2024, 2025, 2026, 2027].map((itemYear) => (
                        <option key={itemYear} value={itemYear}>{itemYear}년</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <select
                      value={month}
                      onChange={(event) => setMonth(event.target.value)}
                      className={selectClass}
                    >
                      <option value="">전체</option>
                      {[...Array(12).keys()].map((itemMonth) => (
                        <option key={itemMonth + 1} value={itemMonth + 1}>{itemMonth + 1}월</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <select
                      value={week}
                      onChange={(event) => setWeek(event.target.value)}
                      className={selectClass}
                    >
                      <option value="">전체</option>
                      {[1, 2, 3, 4, 5].map((itemWeek) => (
                        <option key={itemWeek} value={itemWeek}>{itemWeek}주차</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={fetchSummary}
                  disabled={loading}
                  className="w-full py-3 bg-navy-500 hover:bg-navy-600 active:bg-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm shadow-navy-500/20 disabled:opacity-50 flex items-center justify-center gap-2 lg:w-[170px] lg:flex-shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      불러오는 중...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      조회하기
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!showFilter ? (
            <Outlet context={{ data, loading, year, month, week, fetchSummary }} />
          ) : !data && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-mist-200 flex items-center justify-center mb-5 mx-auto">
                <Search className="w-9 h-9 text-mist-300" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-bold text-navy-500 mb-2">조회할 기간을 선택해주세요</h2>
              <p className="text-sm text-mist-500 leading-relaxed">
                위 필터에서 <span className="text-gold-500 font-medium">연도, 월, 주차</span>를 선택하고
                <br />
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

        <MobileBottomNavigation />
      </div>

      {showLoginNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
            onClick={handleCloseLoginNotice}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-mist-200 bg-white shadow-2xl shadow-navy-900/20 animate-slideUp">
            <div className="flex items-center justify-between gap-3 border-b border-mist-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">공지사항</p>
                <h2 className="mt-1 text-base font-bold text-navy-500">시스템 이용 문의 안내</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseLoginNotice}
                className="rounded-xl p-2 text-mist-400 transition-colors hover:bg-cream-100 hover:text-navy-500"
                aria-label="공지사항 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 text-sm leading-7 text-mist-600">
              <p>
                시스템 이용 중 문의사항이나 불편사항은 아래로 문의해 주세요.
              </p>
              <div className="rounded-2xl bg-cream-100 px-4 py-4">
                <p><span className="font-semibold text-navy-500">담당자:</span> 이영종</p>
                <p><span className="font-semibold text-navy-500">연락처:</span> 010-6798-4260</p>
              </div>
            </div>

            <div className="border-t border-mist-100 bg-cream-100/60 px-5 py-4">
              <button
                type="button"
                onClick={handleCloseLoginNotice}
                className="w-full rounded-2xl bg-navy-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-600"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
