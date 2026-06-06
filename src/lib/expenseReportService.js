import { supabase } from './supabase';
import { deleteReceipt } from './uploadReceipt';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * 현재 로그인한 사용자를 조회합니다.
 * @param {{ required?: boolean }} options
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
async function getCurrentUser(options = {}) {
  const { required = true } = options;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && required) {
    throw new Error('로그인이 필요합니다.');
  }

  return user;
}

/**
 * 결의서 상태값을 비교용 문자열로 정규화합니다.
 * @param {string | null | undefined} status
 * @returns {string}
 */
function normalizeReportStatus(status) {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

/**
 * 제출까지 완료된 최종 상태인지 확인합니다.
 * 값이 비어 있으면 안전하게 초안으로 취급합니다.
 * @param {string | null | undefined} status
 * @returns {boolean}
 */
function isFinalizedReportStatus(status) {
  const normalizedStatus = normalizeReportStatus(status);
  return normalizedStatus === 'submitted' || normalizedStatus === 'approved';
}

/**
 * 지출결의서 공통 저장 payload를 정리합니다.
 * @param {object} reportData
 * @returns {object}
 */
function prepareReportPayload(reportData) {
  const normalizedStatus = normalizeReportStatus(reportData.status);

  return {
    resolution_date: reportData.resolution_date || null,
    total_amount: Number(reportData.total_amount) || 0,
    bank_account: reportData.bank_account || null,
    claim_date: reportData.claim_date || null,
    status: isFinalizedReportStatus(normalizedStatus) ? normalizedStatus : 'draft',
  };
}

/**
 * 지출결의서 읽기 API 호출에 사용할 access token을 준비합니다.
 * @param {string | null | undefined} token
 * @returns {Promise<string>}
 */
async function getExpenseReadAccessToken(token) {
  if (token) {
    return token;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('로그인이 필요합니다.');
  }

  return session.access_token;
}

/**
 * 지출결의서 읽기 API URL을 목록 또는 상세 조회 형태로 조합합니다.
 * @param {string | null} reportId
 * @returns {string}
 */
function buildExpenseReportsReadUrl(reportId = null) {
  const queryString = reportId
    ? `?${new URLSearchParams({ id: reportId }).toString()}`
    : '';

  return `${API_URL}/api/expense/reports${queryString}`;
}

/**
 * 지출결의서 읽기 API를 호출하고 응답 JSON을 반환합니다.
 * @param {{ reportId?: string | null, token?: string | null }} options
 * @returns {Promise<object | Array<object>>}
 */
async function requestExpenseReportsRead(options = {}) {
  const { reportId = null, token = null } = options;
  const accessToken = await getExpenseReadAccessToken(token);
  const response = await fetch(buildExpenseReportsReadUrl(reportId), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.error || '지출결의서 조회에 실패했습니다.');
  }

  return result;
}

/**
 * 항목 배열을 DB 저장 형태로 변환합니다.
 * @param {string} reportId
 * @param {Array<object>} items
 * @returns {Array<object>}
 */
function buildExpenseItemRows(reportId, items = []) {
  return items.map((item, index) => ({
    report_id: reportId,
    account_category: item.account_category || '',
    description: item.description || '',
    month_period: item.month_period || null,
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unit_price) || 0,
    amount: Number(item.amount) || 0,
    sort_order: index,
  }));
}

/**
 * 결의서 항목을 현재 입력값 기준으로 동기화합니다.
 * @param {string} reportId
 * @param {Array<object>} items
 * @returns {Promise<void>}
 */
async function syncExpenseItems(reportId, items = []) {
  const { error: deleteError } = await supabase
    .from('expense_items')
    .delete()
    .eq('report_id', reportId);

  if (deleteError) {
    throw new Error(`항목 정리 실패: ${deleteError.message}`);
  }

  const itemRows = buildExpenseItemRows(reportId, items);
  if (itemRows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from('expense_items')
    .insert(itemRows);

  if (insertError) {
    throw new Error(`항목 저장 실패: ${insertError.message}`);
  }
}

/**
 * 결의서 영수증을 유지/추가/삭제 상태에 맞게 동기화합니다.
 * @param {string} reportId
 * @param {Array<{url: string, fileName: string}>} receiptUrls
 * @returns {Promise<void>}
 */
async function syncExpenseReceipts(reportId, receiptUrls = []) {
  const { data: currentReceipts, error: currentError } = await supabase
    .from('expense_receipts')
    .select('id, image_url, file_name')
    .eq('report_id', reportId);

  if (currentError) {
    throw new Error(`영수증 조회 실패: ${currentError.message}`);
  }

  const nextUrls = new Set(receiptUrls.map((receipt) => receipt.url));
  const receiptsToDelete = (currentReceipts || []).filter(
    (receipt) => !nextUrls.has(receipt.image_url),
  );
  const currentUrlSet = new Set((currentReceipts || []).map((receipt) => receipt.image_url));
  const receiptsToInsert = receiptUrls.filter(
    (receipt) => !currentUrlSet.has(receipt.url),
  );

  if (receiptsToDelete.length > 0) {
    const { error: deleteRowError } = await supabase
      .from('expense_receipts')
      .delete()
      .in('id', receiptsToDelete.map((receipt) => receipt.id));

    if (deleteRowError) {
      throw new Error(`영수증 삭제 실패: ${deleteRowError.message}`);
    }

    await Promise.all(receiptsToDelete.map((receipt) => deleteReceipt(receipt.image_url)));
  }

  if (receiptsToInsert.length === 0) {
    return;
  }

  const receiptRows = receiptsToInsert.map((receipt) => ({
    report_id: reportId,
    image_url: receipt.url,
    file_name: receipt.fileName,
  }));

  const { error: insertError } = await supabase
    .from('expense_receipts')
    .insert(receiptRows);

  if (insertError) {
    throw new Error(`영수증 저장 실패: ${insertError.message}`);
  }
}

/**
 * 지출결의서를 새로 생성합니다.
 * @param {object} reportData
 * @param {Array<object>} items
 * @param {Array<{url: string, fileName: string}>} receiptUrls
 * @returns {Promise<object>}
 */
export async function createExpenseReport(reportData, items = [], receiptUrls = []) {
  const user = await getCurrentUser();

  const { data: report, error: reportError } = await supabase
    .from('expense_reports')
    .insert({
      user_id: user.id,
      ...prepareReportPayload(reportData),
    })
    .select()
    .single();

  if (reportError) {
    throw new Error(`결의서 저장 실패: ${reportError.message}`);
  }

  await syncExpenseItems(report.id, items);
  await syncExpenseReceipts(report.id, receiptUrls);

  return report;
}

/**
 * 임시저장한 지출결의서를 수정 저장합니다.
 * @param {string} reportId
 * @param {object} reportData
 * @param {Array<object>} items
 * @param {Array<{url: string, fileName: string}>} receiptUrls
 * @returns {Promise<object>}
 */
export async function updateExpenseReport(reportId, reportData, items = [], receiptUrls = []) {
  const user = await getCurrentUser();

  const { data: currentReport, error: currentError } = await supabase
    .from('expense_reports')
    .select('id, user_id, status')
    .eq('id', reportId)
    .single();

  if (currentError) {
    throw new Error(`결의서 조회 실패: ${currentError.message}`);
  }

  if (currentReport.user_id !== user.id) {
    throw new Error('본인이 작성한 결의서만 수정할 수 있습니다.');
  }

  if (isFinalizedReportStatus(currentReport.status)) {
    throw new Error('임시저장 상태의 결의서만 수정할 수 있습니다.');
  }

  const { data: updatedReport, error: updateError } = await supabase
    .from('expense_reports')
    .update(prepareReportPayload(reportData))
    .eq('id', reportId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`결의서 수정 실패: ${updateError.message}`);
  }

  await syncExpenseItems(reportId, items);
  await syncExpenseReceipts(reportId, receiptUrls);

  return updatedReport;
}

/**
 * 지출결의서 목록을 서버 읽기 API를 통해 조회합니다.
 * @param {{ token?: string | null }} options
 * @returns {Promise<Array<object>>}
 */
export async function getExpenseReports(options = {}) {
  const { token = null } = options;
  const data = await requestExpenseReportsRead({ token });
  return Array.isArray(data) ? data : [];
}

/**
 * 지출결의서 상세를 서버 읽기 API를 통해 조회합니다.
 * @param {string} id
 * @param {{ token?: string | null }} options
 * @returns {Promise<object>}
 */
export async function getExpenseReport(id, options = {}) {
  const { token = null } = options;
  return requestExpenseReportsRead({ reportId: id, token });
}

/**
 * 지출결의서를 삭제합니다.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteExpenseReport(id) {
  const { error } = await supabase
    .from('expense_reports')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`삭제 실패: ${error.message}`);
  }
}

/**
 * 처리 체크 항목을 업데이트합니다.
 * @param {string} reportId
 * @param {'director_confirmed'|'payment_completed'|'print_completed'} field
 * @param {boolean} checked
 * @param {string | null} userName
 * @returns {Promise<void>}
 */
export async function updateExpenseReportCheck(reportId, field, checked, userName) {
  const updates = {
    [field]: checked,
    [`${field}_by`]: checked ? userName : null,
  };

  const { error } = await supabase
    .from('expense_reports')
    .update(updates)
    .eq('id', reportId);

  if (error) {
    throw new Error(`체크 업데이트 실패: ${error.message}`);
  }
}
