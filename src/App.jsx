import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import DetailView from './pages/DetailView';
import ExpenseReport from './pages/ExpenseReport';
import ExpenseReportCreate from './pages/ExpenseReportCreate';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import MyPage from './pages/MyPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SummaryView from './pages/SummaryView';
import UserManagementPage from './pages/UserManagementPage';

/**
 * 로그인 여부를 확인한 뒤 인증이 필요한 화면만 열어줍니다.
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element | null}
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * 계산된 권한 플래그를 기준으로 페이지 접근 여부를 제어합니다.
 * @param {{ children: React.ReactNode, allowed: boolean }} props
 * @returns {JSX.Element}
 */
const PermissionRoute = ({ children, allowed }) => {
  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fadeIn">
        <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-mist-300" />
        </div>
        <h2 className="text-base font-bold text-navy-500 mb-1.5">접근 권한이 없습니다</h2>
        <p className="text-sm text-mist-500">
          이 페이지를 볼 수 있는 권한이 없습니다.
          <br />
          관리자에게 문의해주세요.
        </p>
      </div>
    );
  }

  return children;
};

/**
 * 인증된 사용자 기준으로 실제 애플리케이션 라우트를 구성합니다.
 * 권한 매트릭스와 라우트 허용 기준이 서로 어긋나지 않도록 AuthContext 값을 그대로 사용합니다.
 * @returns {JSX.Element}
 */
const AppRoutes = () => {
  const {
    canManageUsers,
    canViewDetail,
    canViewExpense,
    canViewSummary,
    canWriteExpense,
  } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={(
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      >
        <Route
          index
          element={(
            <PermissionRoute allowed={canViewSummary}>
              <SummaryView />
            </PermissionRoute>
          )}
        />

        <Route
          path="detail"
          element={(
            <PermissionRoute allowed={canViewDetail}>
              <DetailView />
            </PermissionRoute>
          )}
        />

        <Route
          path="expense/create"
          element={(
            <PermissionRoute allowed={canWriteExpense}>
              <ExpenseReportCreate />
            </PermissionRoute>
          )}
        />

        <Route
          path="expense/create/:reportId"
          element={(
            <PermissionRoute allowed={canWriteExpense}>
              <ExpenseReportCreate />
            </PermissionRoute>
          )}
        />

        <Route
          path="expense"
          element={(
            <PermissionRoute allowed={canViewExpense}>
              <ExpenseReport />
            </PermissionRoute>
          )}
        />

        <Route
          path="users"
          element={(
            <PermissionRoute allowed={canManageUsers}>
              <UserManagementPage />
            </PermissionRoute>
          )}
        />

        <Route path="mypage" element={<MyPage />} />
      </Route>
    </Routes>
  );
};

/**
 * 애플리케이션 전역 인증 컨텍스트와 라우터를 연결합니다.
 * @returns {JSX.Element}
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
