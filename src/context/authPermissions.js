/* 역할별 권한 매트릭스를 정의합니다. */
const PERMISSIONS = {
  master: { summary: 'all', detail: true, expenseWrite: true, expenseView: 'all', users: true, checkManage: true },
  accounting: { summary: 'all', detail: true, expenseWrite: true, expenseView: 'all', users: false, checkManage: true },
  mokbuhoe: { summary: 'all', detail: true, expenseWrite: false, expenseView: 'all', users: false, checkManage: false },
  juboteam: { summary: 'heongeumOnly', detail: false, expenseWrite: false, expenseView: false, users: false, checkManage: false },
  leader: { summary: false, detail: false, expenseWrite: true, expenseView: 'own', users: false, checkManage: false },
  leader_juboteam: { summary: 'heongeumOnly', detail: false, expenseWrite: true, expenseView: 'own', users: false, checkManage: false },
  pending: { summary: false, detail: false, expenseWrite: false, expenseView: false, users: false, checkManage: false },
};

/**
 * 역할 코드를 화면 표시용 한글 이름으로 변환합니다.
 * @param {string | undefined} role
 * @returns {string}
 */
export function getRoleLabel(role) {
  return ({
    master: '마스터',
    accounting: '회계팀',
    mokbuhoe: '목부회',
    juboteam: '주보팀',
    leader: '청년부리더',
    leader_juboteam: '청년부리더+주보팀',
    pending: '승인대기',
  }[role] || role || '-');
}

/**
 * 역할에 대응하는 권한 설정을 반환합니다.
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
 * 지출결의서 조회 권한이 있는지 확인합니다.
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
 * 처리 체크 관리 권한이 있는지 확인합니다.
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canManageChecks(role) {
  return getPermission(role).checkManage;
}

/**
 * 헌금 전용 요약 보기 역할인지 확인합니다.
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
