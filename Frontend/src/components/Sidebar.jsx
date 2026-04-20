import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Receipt, FilePlus, X, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoWhite from '../assets/logo_white.png';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const menuItems = [
    { name: '요약 보기', path: '/', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { name: '상세내역 보기', path: '/detail', icon: <FileText className="w-5 h-5" /> },
    { name: '지출결의서 작성하기', path: '/expense/create', icon: <FilePlus className="w-5 h-5" /> },
    { name: '지출결의서 보기', path: '/expense', icon: <Receipt className="w-5 h-5" />, exact: true },
  ];

  if (user?.role === 'master') {
    menuItems.push({ name: '사용자 관리', path: '/users', icon: <Users className="w-5 h-5" /> });
  }

  return (
    <>
      {/* 모바일 백드롭 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy-500 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <img src={logoWhite} alt="JSYouth" className="h-8 w-auto object-contain" />
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 사용자 정보 */}
        {user && (
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-xs text-white/40 font-light">로그인 계정</p>
            <p className="text-sm text-white/90 font-medium truncate mt-0.5">{user.name}</p>
          </div>
        )}

        {/* 메뉴 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => { if (window.innerWidth < 768) toggleSidebar(); }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-gold-400 text-navy-700 shadow-md shadow-gold-400/30'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* 하단 버전 */}
        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-xs text-white/30">JSYouth 회계시스템</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
