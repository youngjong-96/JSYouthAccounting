import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Plus, Filter, Search, Loader2, LogOut, Menu } from 'lucide-react';
import TransactionForm from './TransactionForm';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

// Vercel serverless API - relative URL works both locally (with proxy) and on Vercel
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [week, setWeek] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const { logout, user, token } = useAuth();
  const location = useLocation();

  const isUserManagement = location.pathname === '/users';

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = { year, month };
      if (week) params.week = week;
      
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_BASE_URL}/api/finance/summary`, { 
        params,
        headers
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Intentionally left empty to prevent auto-fetch on mount.
    // We want the user to explore the prominent filters and click search.
  }, []);

  const handleFormSubmit = () => {
    setShowForm(false);
    fetchSummary();
  };

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex-1 flex flex-col min-w-0">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {!isSidebarOpen && (
                 <button 
                   onClick={() => setIsSidebarOpen(true)}
                   className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 mr-1 sm:mr-2"
                 >
                   <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                 </button>
              )}
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
                <BarChart3 className="text-white w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-gray-900 hidden sm:block">JSYouth Finance</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && <span className="text-sm font-medium text-gray-600 border-r border-gray-300 pr-2 sm:pr-4 hidden md:block">{user.name}님 환영합니다</span>}
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">내역 추가</span>
                <span className="sm:hidden ml-1">추가</span>
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filters - Made Prominent */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center text-blue-600">
              <div className="p-3 bg-blue-50 rounded-full mr-4">
                <Filter className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">데이터 조회 필터</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1 md:justify-end">
              <select 
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                className="block w-full md:w-32 px-4 py-3 text-base md:text-lg border-2 border-gray-200 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-xl bg-gray-50 font-medium text-gray-700 transition-colors"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
              </select>

              <select 
                value={month} 
                onChange={(e) => setMonth(e.target.value)}
                className="block w-full md:w-28 px-4 py-3 text-base md:text-lg border-2 border-gray-200 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-xl bg-gray-50 font-medium text-gray-700 transition-colors"
              >
                {[...Array(12).keys()].map(m => <option key={m+1} value={m+1}>{m+1}월</option>)}
              </select>

              <select 
                value={week} 
                onChange={(e) => setWeek(e.target.value)}
                className="block w-full md:w-32 px-4 py-3 text-base md:text-lg border-2 border-gray-200 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-xl bg-gray-50 font-medium text-gray-700 transition-colors"
              >
                <option value="">전체 주차</option>
                {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>{w}주차</option>)}
              </select>
              
              <button
                onClick={fetchSummary}
                disabled={loading}
                className="w-full md:w-auto inline-flex justify-center items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 hover:shadow-lg transform hover:-translate-y-0.5"
              >
                {loading ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Search className="w-5 h-5 mr-3" />}
                조회하기
              </button>
            </div>
          </div>
        </div>

        {/* Initial Graphic before fetching OR Loading Overlay OR Main Content */}
        {isUserManagement ? (
          <Outlet context={{ data, loading, year, month, week, fetchSummary }} />
        ) : !data && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-2xl mx-auto opacity-80 mt-12">
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-8 inline-block transform -rotate-2">
               <div className="bg-blue-50 p-6 rounded-2xl">
                 <Search className="w-20 h-20 text-blue-500" strokeWidth={1.5} />
               </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">환영합니다!</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">
              상단의 <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">필터</span>에서 원하시는 <span className="font-bold text-gray-700">년, 월, 주차</span>를 선택한 후 <br className="hidden sm:block"/>
              우측의 <span className="font-bold text-blue-600">"조회하기"</span> 버튼을 클릭하여 회계 데이터를 확인해보세요.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <span className="ml-4 text-lg font-medium text-gray-600">데이터를 불러오는 중입니다...</span>
          </div>
        ) : data ? (
          <Outlet context={{ data, loading, year, month, week, fetchSummary }} />
        ) : null}
      </main>

      {/* Write form Modal */}
      {showForm && (
        <TransactionForm onClose={() => setShowForm(false)} onSubmitSuccess={handleFormSubmit} />
      )}
      </div>
    </div>
  );
};

export default Dashboard;
