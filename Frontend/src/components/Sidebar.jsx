import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Receipt, FilePlus, Menu, X, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const menuItems = [
    { name: '요약 보기', path: '/', icon: <LayoutDashboard className="w-5 h-5 mr-3" />, exact: true },
    { name: '상세내역 보기', path: '/detail', icon: <FileText className="w-5 h-5 mr-3" /> },
    { name: '지출결의서 작성하기', path: '/expense/create', icon: <FilePlus className="w-5 h-5 mr-3" /> },
    { name: '지출결의서 보기', path: '/expense', icon: <Receipt className="w-5 h-5 mr-3" />, exact: true },
  ];

  if (user?.role === 'master') {
    menuItems.push({ name: '사용자 관리', path: '/users', icon: <Users className="w-5 h-5 mr-3" /> });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar Content */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        <div className="p-4 flex items-center justify-between h-16 border-b border-gray-100">
          <button 
            onClick={toggleSidebar}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ml-1"
          >
            <Menu className="w-5 h-5 hidden md:block" />
            <X className="w-5 h-5 md:hidden block" />
          </button>
          
          <span className="font-bold text-lg text-gray-900 md:hidden pr-4 tracking-tight">JSYouth</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              onClick={() => {
                if (window.innerWidth < 768) {
                  toggleSidebar();
                }
              }}
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
