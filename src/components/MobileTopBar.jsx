import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogOut, UserCircle, Users, X } from 'lucide-react';
import logoWhite from '../assets/logo_white.png';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../context/authPermissions';

/**
 * 모바일 상단 로고와 계정 메뉴를 표시합니다.
 * @param {{ onLogout: () => Promise<void> }} props
 * @returns {JSX.Element}
 */
const MobileTopBar = ({ onLogout }) => {
  const {
    user,
    canManageUsers,
    canViewExpense,
    canViewSummary,
  } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const homePath = canViewSummary ? '/' : canViewExpense ? '/expense' : '/mypage';

  useEffect(() => {
    if (!isProfileOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  /**
   * 프로필 메뉴를 닫고 현재 세션에서 로그아웃합니다.
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
      setIsProfileOpen(false);
    }
  };

  return (
    <>
      <header className="safe-top sticky top-0 z-30 bg-navy-500 shadow-lg shadow-navy-500/20 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            to={homePath}
            className="rounded-lg p-1 transition-colors active:bg-white/10"
            aria-label="권한별 첫 화면으로 이동"
          >
            <img src={logoWhite} alt="JSYouth" className="h-7 w-auto object-contain" />
          </Link>

          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors active:bg-white/20"
            aria-label="프로필 메뉴 열기"
            aria-expanded={isProfileOpen}
            aria-controls="mobile-profile-menu"
          >
            <UserCircle className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </header>

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-navy-900/60 backdrop-blur-sm"
            onClick={() => setIsProfileOpen(false)}
            aria-label="프로필 메뉴 닫기"
          />

          <section
            id="mobile-profile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-profile-title"
            className="safe-bottom absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-white shadow-2xl animate-slideUp"
          >
            <div className="flex items-start justify-between gap-4 border-b border-mist-100 px-5 py-5">
              <div className="min-w-0">
                <p id="mobile-profile-title" className="truncate text-base font-bold text-navy-500">
                  {user?.name || user?.email || '로그인 사용자'}
                </p>
                <p className="mt-1 text-xs font-medium text-gold-600">
                  {getRoleLabel(user?.role)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-xl p-2 text-mist-400 transition-colors active:bg-cream-100 active:text-navy-500"
                aria-label="프로필 메뉴 닫기"
                autoFocus
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-1 px-4 py-4">
              {canManageUsers && (
                <Link
                  to="/users"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-navy-500 transition-colors active:bg-cream-100"
                >
                  <Users className="h-5 w-5 text-navy-400" aria-hidden="true" />
                  사용자 관리
                </Link>
              )}

              <Link
                to="/mypage"
                onClick={() => setIsProfileOpen(false)}
                className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-navy-500 transition-colors active:bg-cream-100"
              >
                <UserCircle className="h-5 w-5 text-navy-400" aria-hidden="true" />
                내 정보
              </Link>

              <div className="my-2 border-t border-mist-100" />

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors active:bg-red-50 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                )}
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default MobileTopBar;
