import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../context/authPermissions';
import logoWhite from '../assets/logo_white.png';
import { canShowNavigationItem, NAVIGATION_ITEMS } from './navigationItems';

/**
 * 현재 권한에 맞는 메뉴와 사용자 정보를 사이드바에 표시합니다.
 * @returns {JSX.Element}
 */
const Sidebar = () => {
  const permissions = useAuth();
  const { user } = permissions;
  const menuItems = NAVIGATION_ITEMS.filter((item) => (
    canShowNavigationItem(item, permissions)
  ));

  return (
      <aside className="hidden w-64 flex-col bg-navy-500 md:flex md:flex-shrink-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <img src={logoWhite} alt="JSYouth" className="h-8 w-auto object-contain" />
        </div>

        {user && (
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-xs text-white/40 font-light">로그인 계정</p>
            <p className="text-sm text-white/90 font-medium truncate mt-0.5">{user.name}</p>
            {user.role && (
              <p className="text-xs text-gold-300/70 mt-0.5">
                {getRoleLabel(user.role)}
              </p>
            )}
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.end}
                className={({ isActive }) => (
                  `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-gold-400 text-navy-700 shadow-md shadow-gold-400/30'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-xs text-white/30">JSYouth 회계시스템</p>
        </div>
      </aside>
  );
};

export default Sidebar;
