import { supabase } from './supabase';

/**
 * 지출결의서 생성 (보고서 + 항목 + 영수증 이미지 URL 저장)
 */
export async function createExpenseReport(reportData, items, receiptUrls) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  // 1. expense_reports 삽입
  const { data: report, error: reportError } = await supabase
    .from('expense_reports')
    .insert({
      user_id: user.id,
      resolution_date: reportData.resolution_date,
      total_amount: reportData.total_amount,
      bank_account: reportData.bank_account || null,
      claim_date: reportData.claim_date || null,
      status: reportData.status || 'draft',
    })
    .select()
    .single();

  if (reportError) throw new Error(`결의서 저장 실패: ${reportError.message}`);

  // 2. expense_items 삽입
  const itemRows = items.map((item, index) => ({
    report_id: report.id,
    account_category: item.account_category,
    description: item.description,
    month_period: item.month_period || null,
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    amount: item.amount || 0,
    sort_order: index,
  }));

  const { error: itemsError } = await supabase
    .from('expense_items')
    .insert(itemRows);

  if (itemsError) throw new Error(`항목 저장 실패: ${itemsError.message}`);

  // 3. expense_receipts 삽입 (영수증 이미지 URL들)
  if (receiptUrls && receiptUrls.length > 0) {
    const receiptRows = receiptUrls.map((r) => ({
      report_id: report.id,
      image_url: r.url,
      file_name: r.fileName,
    }));

    const { error: receiptsError } = await supabase
      .from('expense_receipts')
      .insert(receiptRows);

    if (receiptsError) console.error('영수증 URL 저장 실패:', receiptsError.message);
  }

  return report;
}

/**
 * 지출결의서 목록 조회
 */
export async function getExpenseReports() {
  const { data, error } = await supabase
    .from('expense_reports')
    .select(`
      *,
      expense_items (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`목록 조회 실패: ${error.message}`);
  return data;
}

/**
 * 지출결의서 상세 조회
 */
export async function getExpenseReport(id) {
  const { data, error } = await supabase
    .from('expense_reports')
    .select(`
      *,
      expense_items (*),
      expense_receipts (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(`상세 조회 실패: ${error.message}`);
  return data;
}

/**
 * 지출결의서 삭제
 */
export async function deleteExpenseReport(id) {
  const { error } = await supabase
    .from('expense_reports')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`삭제 실패: ${error.message}`);
}
