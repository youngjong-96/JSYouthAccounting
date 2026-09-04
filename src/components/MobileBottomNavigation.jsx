import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canShowNavigationItem, NAVIGATION_ITEMS } from './navigationItems';

/**
 * 모바일에서 권한별 핵심 메뉴를 화면 하단에 고정해 표시합니다.
 * @returns {JSX.Element}
 */
const MobileBottomNavigation = () => {
  const permissions = useAuth();
  const menuItems = NAVIGATION_ITEMS.filter((item) => (
    item.showInMobileBottom && canShowNavigationItem(item, permissions)
  ));

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-mist-200 bg-white/95 shadow-[0_-8px_24px_rgba(51,61,81,0.10)] backdrop-blur-md md:hidden"
    >
      <div
        className="grid min-h-16 items-stretch"
        style={{ gridTemplateColumns: `repeat(${menuItems.length}, minmax(0, 1fr))` }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.end}
              className={({ isActive }) => (
                `flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-navy-600' : 'text-mist-500 active:text-navy-500'
                }`
              )}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                      item.isPrimaryAction
                        ? `bg-gold-400 text-navy-700 shadow-sm shadow-gold-400/30 ${isActive ? 'ring-2 ring-gold-200' : ''}`
                        : isActive ? 'bg-navy-50 text-navy-600' : 'text-mist-500'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="truncate">{item.mobileName}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNavigation;
