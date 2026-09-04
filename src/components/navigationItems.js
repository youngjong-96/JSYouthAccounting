import {
  FilePlus,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  UserCircle,
  Users,
} from 'lucide-react';

/**
 * PC 사이드바와 모바일 하단 내비게이션이 공유하는 메뉴 설정입니다.
 * permission은 AuthContext가 제공하는 권한 플래그 이름입니다.
 */
export const NAVIGATION_ITEMS = [
  {
    key: 'summary',
    name: '요약 보기',
    mobileName: '요약',
    path: '/',
    icon: LayoutDashboard,
    permission: 'canViewSummary',
    end: true,
    showInMobileBottom: true,
  },
  {
    key: 'detail',
    name: '상세내역 보기',
    mobileName: '상세',
    path: '/detail',
    icon: FileText,
    permission: 'canViewDetail',
    end: true,
    showInMobileBottom: true,
  },
  {
    key: 'expense-create',
    name: '지출결의서 작성',
    mobileName: '작성',
    path: '/expense/create',
    icon: FilePlus,
    permission: 'canWriteExpense',
    end: false,
    showInMobileBottom: true,
    isPrimaryAction: true,
  },
  {
    key: 'expense',
    name: '지출결의서 보기',
    mobileName: '결의서',
    path: '/expense',
    icon: Receipt,
    permission: 'canViewExpense',
    end: true,
    showInMobileBottom: true,
  },
  {
    key: 'board',
    name: '자유게시판',
    mobileName: '게시판',
    path: '/board',
    icon: MessageSquare,
    permission: 'canUseBoard',
    end: true,
    showInMobileBottom: true,
  },
  {
    key: 'users',
    name: '사용자 관리',
    path: '/users',
    icon: Users,
    permission: 'canManageUsers',
    end: true,
    showInMobileBottom: false,
  },
  {
    key: 'mypage',
    name: '내 정보',
    path: '/mypage',
    icon: UserCircle,
    permission: null,
    end: true,
    showInMobileBottom: false,
  },
];

/**
 * 현재 사용자가 메뉴 항목을 볼 수 있는지 확인합니다.
 * @param {(typeof NAVIGATION_ITEMS)[number]} item
 * @param {Record<string, boolean>} permissions
 * @returns {boolean}
 */
export const canShowNavigationItem = (item, permissions) => (
  !item.permission || Boolean(permissions[item.permission])
);
