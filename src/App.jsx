import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import SummaryView from './pages/SummaryView';
import DetailView from './pages/DetailView';
import ExpenseReport from './pages/ExpenseReport';
import ExpenseReportCreate from './pages/ExpenseReportCreate';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserManagementPage from './pages/UserManagementPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShieldOff } from 'lucide-react';

/* ── 로그인 체크 ── */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

/* ── 역할 체크 ── */
const RoleRoute = ({ children, allowed }) => {
  const { role } = useAuth();
  if (!allowed.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fadeIn">
        <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-mist-300" />
        </div>
        <h2 className="text-base font-bold text-navy-500 mb-1.5">접근 권한이 없습니다</h2>
        <p className="text-sm text-mist-500">이 페이지를 볼 수 있는 권한이 없습니다.<br />관리자에게 문의해주세요.</p>
      </div>
    );
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            >
              {/* 요약보기: master/accounting/mokbuhoe/juboteam */}
              <Route index element={
                <RoleRoute allowed={['master', 'accounting', 'mokbuhoe', 'juboteam']}>
                  <SummaryView />
                </RoleRoute>
              } />

              {/* 상세내역: master/accounting/mokbuhoe */}
              <Route path="detail" element={
                <RoleRoute allowed={['master', 'accounting', 'mokbuhoe']}>
                  <DetailView />
                </RoleRoute>
              } />

              {/* 지출결의서 작성: master/accounting/leader */}
              <Route path="expense/create" element={
                <RoleRoute allowed={['master', 'accounting', 'leader']}>
                  <ExpenseReportCreate />
                </RoleRoute>
              } />

              {/* 지출결의서 보기: master/accounting/mokbuhoe/leader */}
              <Route path="expense" element={
                <RoleRoute allowed={['master', 'accounting', 'mokbuhoe', 'leader']}>
                  <ExpenseReport />
                </RoleRoute>
              } />

              {/* 사용자관리: master만 */}
              <Route path="users" element={
                <RoleRoute allowed={['master']}>
                  <UserManagementPage />
                </RoleRoute>
              } />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
