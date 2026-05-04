/* 역할 선택지와 표시용 스타일을 한 곳에서 관리합니다. */
export const ROLE_OPTIONS = [
  { value: 'pending', label: '승인대기', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'accounting', label: '회계팀', cls: 'bg-navy-50 text-navy-600 border-navy-200' },
  { value: 'leader', label: '청년부리더', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'leader_juboteam', label: '청년부리더+주보팀', cls: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'master', label: '마스터', cls: 'bg-gold-50 text-gold-700 border-gold-200' },
];

/* 역할별 권한 매트릭스를 정의합니다. */
const PERMISSIONS = {
  master: { summary: 'all', detail: true, expenseWrite: true, expenseView: 'all', users: true, checkManage: true, board: true },
  accounting: { summary: 'all', detail: true, expenseWrite: true, expenseView: 'all', users: false, checkManage: true, board: true },
  leader: { summary: false, detail: false, expenseWrite: true, expenseView: 'own', users: false, checkManage: false, board: true },
  leader_juboteam: { summary: 'heongeumOnly', detail: false, expenseWrite: true, expenseView: 'own', users: false, checkManage: false, board: true },
  pending: { summary: false, detail: false, expenseWrite: false, expenseView: false, users: false, checkManage: false, board: false },
};

/* 역할 코드를 화면 표시용 이름으로 빠르게 찾기 위한 맵입니다. */
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((role) => [role.value, role.label]));

/**
 * 역할 코드를 화면 표시용 이름으로 변환합니다.
 * @param {string | undefined} role
 * @returns {string}
 */
export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || '-';
}

/**
 * 역할에 해당하는 권한 설정을 반환합니다.
 * 알 수 없는 역할은 가장 보수적인 pending 권한으로 처리합니다.
 * @param {string | undefined} role
 * @returns {object}
 */
function getPermission(role) {
  return PERMISSIONS[role] || PERMISSIONS.pending;
}

/**
 * 요약 보기 권한이 있는지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canViewSummary(role) {
  return !!getPermission(role).summary;
}

/**
 * 상세 보기 권한이 있는지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canViewDetail(role) {
  return !!getPermission(role).detail;
}

/**
 * 지출결의서 작성 권한이 있는지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canWriteExpense(role) {
  return getPermission(role).expenseWrite;
}

/**
 * 지출결의서 보기 권한이 있는지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canViewExpense(role) {
  return !!getPermission(role).expenseView;
}

/**
 * 사용자 관리 권한이 있는지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canManageUsers(role) {
  return getPermission(role).users;
}

/**
 * 체크 처리 관리 권한이 있는지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canManageChecks(role) {
  return getPermission(role).checkManage;
}

/**
 * 자유게시판 접근 권한이 있는지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canUseBoard(role) {
  return !!getPermission(role).board;
}

/**
 * 헌금 전용 요약 보기 역할인지 확인합니다.
 * 현재는 해당 역할을 사용하지 않으므로 항상 false입니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function isHeongeumOnly(role) {
  return getPermission(role).summary === 'heongeumOnly';
}

/**
 * 본인 지출결의서만 조회 가능한 역할인지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function isExpenseOwnOnly(role) {
  return getPermission(role).expenseView === 'own';
}
