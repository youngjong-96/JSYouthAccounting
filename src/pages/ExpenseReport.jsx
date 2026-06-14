import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  FilePlus,
  FileText,
  Loader2,
  Pencil,
  Receipt,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  deleteExpenseReport,
  getExpenseReport,
  getExpenseReports,
  updateExpenseReportCheck,
} from '../lib/expenseReportService';
import ExpenseReportDetailModal from '../components/ExpenseReportDetailModal';
import { useAuth } from '../context/AuthContext';

/* 지출결의서 상태별 라벨과 색상을 정의합니다. */
const statusMap = {
  draft: { label: '임시저장', cls: 'bg-gold-50 text-gold-600 border-gold-200' },
  submitted: { label: '제출완료', cls: 'bg-green-50 text-green-700 border-green-200' },
  approved: { label: '확인완료', cls: 'bg-navy-50 text-navy-600 border-navy-200' },
  unknown: { label: '상태 확인 필요', cls: 'bg-red-50 text-red-600 border-red-200' },
};

/* 처리 체크 항목 목록을 정의합니다. */
const CHECK_FIELDS = [
  { field: 'director_confirmed', label: '부장님 확인' },
  { field: 'payment_completed', label: '지급 완료' },
  { field: 'print_completed', label: '출력 완료' },
];

/* 목록 화면은 PC와 모바일 모두 페이지당 5건씩만 요청합니다. */
const REPORTS_PER_PAGE = 5;

/* 비어 있는 목록 페이지 기본 상태를 정의합니다. */
const EMPTY_REPORT_PAGE = {
  items: [],
  page: 1,
  limit: REPORTS_PER_PAGE,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_prev: false,
  scope_total_count: 0,
};

/**
 * 결의서 상태값을 비교용 문자열로 정규화합니다.
 * @param {string | null | undefined} status
 * @returns {string}
 */
function normalizeReportStatus(status) {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

/**
 * 현재 문서가 수정 가능한 임시저장 상태인지 확인합니다.
 * @param {string | null | undefined} status
 * @returns {boolean}
 */
function isDraftReportStatus(status) {
  return normalizeReportStatus(status) === 'draft';
}

/**
 * 결의서 상태 배지를 렌더링합니다.
 * @param {{ status: string | null | undefined }} props
 * @returns {JSX.Element}
 */
function StatusBadge({ status }) {
  const currentStatus = statusMap[normalizeReportStatus(status)] || statusMap.unknown;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${currentStatus.cls}`}>
      {currentStatus.label}
    </span>
  );
}

/**
 * 날짜 문자열을 목록 표시 형식으로 변환합니다.
 * @param {string | null | undefined} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) {
    return '-';
  }

  const date = new Date(dateStr);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

/**
 * 지출결의서 데이터에서 작성자 이름을 안전하게 추출합니다.
 * @param {object} report
 * @returns {string}
 */
function getReportAuthorName(report) {
  return report?.author_name || '작성자 미상';
}

/**
 * 현재 사용자가 임시저장 문서를 수정할 수 있는지 확인합니다.
 * @param {object} report
 * @param {string | undefined} userId
 * @returns {boolean}
 */
function canEditDraftReport(report, userId) {
  return isDraftReportStatus(report?.status) && report?.user_id === userId;
}

/**
 * 체크 항목 변경 전에 보여줄 확인 문구를 생성합니다.
 * @param {string} label
 * @param {boolean} nextValue
 * @returns {string}
 */
function getCheckConfirmMessage(label, nextValue) {
  return nextValue
    ? `${label} 체크박스를 누르시겠습니까?`
    : `${label} 체크박스를 해제하시겠습니까?`;
}

/**
 * 처리 체크 버튼을 렌더링합니다.
 * @param {{
 *   label: string,
 *   checked: boolean,
 *   checkedBy: string | null | undefined,
 *   canEdit: boolean,
 *   onToggle: (() => void) | undefined,
 *   updating: boolean
 * }} props
 * @returns {JSX.Element}
 */
function CheckItem({ label, checked, checkedBy, canEdit, onToggle, updating }) {
  const title = checked && checkedBy
    ? `${checkedBy}님이 확인`
    : canEdit
      ? '클릭하여 확인 상태를 변경합니다.'
      : '';

  return (
    <button
      onClick={canEdit ? onToggle : undefined}
      disabled={updating || !canEdit}
      title={title}
      className={`
        inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-lg text-[11px] font-medium transition-all border
        ${checked
          ? 'bg-navy-500 border-navy-500 text-white'
          : canEdit
            ? 'border-mist-200 text-mist-400 hover:border-gold-400 hover:text-gold-500 cursor-pointer'
            : 'border-mist-100 text-mist-300 cursor-default bg-transparent'
        }
        ${updating ? 'opacity-50 cursor-wait' : ''}
        ${!canEdit && !checked ? 'opacity-60' : ''}
      `}
    >
      {checked
        ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
        : <Circle className="w-3 h-3 flex-shrink-0" />
      }
      <span>{label}</span>
    </button>
  );
}

/**
 * 지출결의서 목록에 필요한 체크 필터 상태를 초기값 형태로 반환합니다.
 * @returns {{ director_confirmed: string, payment_completed: string, print_completed: string }}
 */
function createDefaultFilters() {
  return {
    director_confirmed: 'all',
    payment_completed: 'all',
    print_completed: 'all',
  };
}

/**
 * 지출결의서 목록, 상세, 삭제, 임시저장 수정 진입 기능을 제공합니다.
 * @returns {JSX.Element}
 */
const ExpenseReport = () => {
  const navigate = useNavigate();
  const { user, token, canManageChecks } = useAuth();

  const [reportPage, setReportPage] = useState(EMPTY_REPORT_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [updatingCheck, setUpdatingCheck] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(createDefaultFilters);

  const hasActiveFilter = Object.values(filters).some((value) => value !== 'all');
  const reports = reportPage.items || [];

  /**
   * 지출결의서 목록을 서버 페이지네이션 API로 조회합니다.
   * @returns {Promise<void>}
   */
  const fetchReports = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextPage = await getExpenseReports({
        token,
        page: currentPage,
        limit: REPORTS_PER_PAGE,
        filters,
      });

      setReportPage(nextPage || EMPTY_REPORT_PAGE);

      if (nextPage?.page && nextPage.page !== currentPage) {
        setCurrentPage(nextPage.page);
      }
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, token, user?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /**
   * 선택한 결의서의 상세 모달을 엽니다.
   * @param {string} reportId
   * @returns {Promise<void>}
   */
  const handleView = async (reportId) => {
    setDetailLoading(true);

    try {
      const report = await getExpenseReport(reportId, { token });
      setSelectedReport(report);
      setShowDetail(true);
    } catch (viewError) {
      alert(`상세 조회에 실패했습니다: ${viewError.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  /**
   * 임시저장 문서를 수정 화면으로 이동시킵니다.
   * @param {string} reportId
   * @returns {void}
   */
  const handleEdit = (reportId) => {
    navigate(`/expense/create/${reportId}`);
  };

  /**
   * 결의서를 삭제하고 현재 목록 페이지를 다시 조회합니다.
   * @param {string} reportId
   * @returns {Promise<void>}
   */
  const handleDelete = async (reportId) => {
    try {
      await deleteExpenseReport(reportId);
      setDeleteConfirmId(null);
      fetchReports();
    } catch (deleteError) {
      alert(`삭제에 실패했습니다: ${deleteError.message}`);
    }
  };

  /**
   * 처리 체크 상태를 목록에서 낙관적으로 반영하고 실패 시 되돌립니다.
   * @param {string} reportId
   * @param {'director_confirmed'|'payment_completed'|'print_completed'} field
   * @param {boolean} currentValue
   * @returns {Promise<void>}
   */
  const handleCheckToggle = async (reportId, field, currentValue) => {
    const updatingKey = `${reportId}-${field}`;
    const nextValue = !currentValue;
    const checkField = CHECK_FIELDS.find((item) => item.field === field);
    const checkLabel = checkField?.label || '체크 항목';
    const checkerName = nextValue ? (user?.name || '확인자') : null;
    const previousCheckerName = reports.find((report) => report.id === reportId)?.[`${field}_by`] || null;
    const confirmMessage = getCheckConfirmMessage(checkLabel, nextValue);

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdatingCheck(updatingKey);

    setReportPage((prevPage) => ({
      ...prevPage,
      items: prevPage.items.map((report) => (
        report.id === reportId
          ? { ...report, [field]: nextValue, [`${field}_by`]: checkerName }
          : report
      )),
    }));

    try {
      await updateExpenseReportCheck(reportId, field, nextValue, checkerName);
    } catch (updateError) {
      setReportPage((prevPage) => ({
        ...prevPage,
        items: prevPage.items.map((report) => (
          report.id === reportId
            ? { ...report, [field]: currentValue, [`${field}_by`]: previousCheckerName }
            : report
        )),
      }));
      alert(`체크 업데이트에 실패했습니다: ${updateError.message}`);
    } finally {
      setUpdatingCheck(null);
    }
  };

  /**
   * 페이지 이동 시 사용할 목록 번호를 현재 페이지 기준으로 계산합니다.
   * @param {number} index
   * @returns {number}
   */
  const getListRowNumber = (index) => {
    return reportPage.total_count - ((reportPage.page - 1) * reportPage.limit) - index;
  };

  /**
   * 체크 필터를 변경하면서 첫 페이지로 이동합니다.
   * @param {'director_confirmed'|'payment_completed'|'print_completed'} field
   * @param {string} value
   * @returns {void}
   */
  const handleFilterChange = (field, value) => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * 체크 필터를 모두 초기화하고 첫 페이지로 돌아갑니다.
   * @returns {void}
   */
  const handleFilterReset = () => {
    setCurrentPage(1);
    setFilters(createDefaultFilters());
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-9 h-9 text-navy-400 animate-spin mb-3" />
        <p className="text-sm text-mist-500">결의서 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center animate-fadeIn">
        <AlertCircle className="w-9 h-9 text-red-400 mx-auto mb-3" />
        <p className="text-red-600 font-medium text-sm mb-4">{error}</p>
        <button
          onClick={fetchReports}
          className="px-5 py-2.5 bg-navy-500 text-white rounded-xl text-sm font-medium hover:bg-navy-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slideUp pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-navy-50 rounded-xl">
            <Receipt className="w-5 h-5 text-navy-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-500">지출결의서 보기</h2>
            <p className="text-xs text-mist-500">총 {reportPage.scope_total_count}건</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/expense/create')}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gold-400 hover:bg-gold-500 text-navy-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
        >
          <FilePlus className="w-4 h-4" />
          새 결의서
        </button>
      </div>

      <div className="bg-white rounded-xl border border-mist-200 p-2.5 shadow-sm space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {CHECK_FIELDS.map(({ field, label }) => (
            <div key={field} className="flex-1 min-w-[100px]">
              <select
                value={filters[field]}
                onChange={(event) => handleFilterChange(field, event.target.value)}
                className={`
                  w-full text-[11px] font-medium border rounded-lg px-2 py-1.5 outline-none transition-all cursor-pointer
                  ${filters[field] === 'all'
                    ? 'bg-mist-50 border-mist-200 text-mist-500'
                    : 'bg-navy-50 border-navy-300 text-navy-600 font-bold'}
                `}
              >
                <option value="all">{label}: 전체</option>
                <option value="checked">완료</option>
                <option value="unchecked">미완료</option>
              </select>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 pt-1 border-t border-mist-50">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-mist-400">검색결과</span>
            <span className="text-[11px] font-bold text-navy-500">{reportPage.total_count}건</span>
          </div>

          {hasActiveFilter && (
            <button
              onClick={handleFilterReset}
              className="text-[10px] text-red-500 font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
            >
              <span>초기화</span>
              <span className="text-[12px]">×</span>
            </button>
          )}
        </div>
      </div>

      {reportPage.scope_total_count === 0 ? (
        <div className="bg-white rounded-2xl border border-mist-200 p-14 text-center">
          <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-mist-300" />
          </div>
          <h3 className="text-sm font-bold text-navy-500 mb-1.5">작성된 결의서가 없습니다</h3>
          <p className="text-xs text-mist-500 mb-5">새 결의서를 작성해서 제출하거나 임시저장해보세요.</p>
          <button
            onClick={() => navigate('/expense/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-500 hover:bg-navy-600 text-white text-sm font-medium rounded-xl transition-all"
          >
            <FilePlus className="w-4 h-4" />
            지출결의서 작성하기
          </button>
        </div>
      ) : reportPage.total_count === 0 ? (
        <div className="bg-white rounded-2xl border border-mist-200 p-14 text-center">
          <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-mist-300" />
          </div>
          <h3 className="text-sm font-bold text-navy-500 mb-1.5">조건에 맞는 결의서가 없습니다</h3>
          <p className="text-xs text-mist-500">필터를 초기화하거나 다른 조건으로 다시 확인해주세요.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl border border-mist-200 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[1120px] table-fixed text-sm">
              <colgroup>
                <col style={{ width: '56px' }} />
                <col style={{ width: '190px' }} />
                <col style={{ width: '130px' }} />
                <col />
                <col style={{ width: '110px' }} />
                <col style={{ width: '190px' }} />
                <col style={{ width: '92px' }} />
              </colgroup>
              <thead>
                <tr className="bg-cream-100 border-b border-mist-200">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">No.</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">결의일자</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-mist-500">금액</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">주요 내역</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-mist-500">상태</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-mist-500">처리현황</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-mist-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {reports.map((report, index) => {
                  const canEditDraft = canEditDraftReport(report, user?.id);

                  return (
                    <tr key={report.id} className="hover:bg-cream-100/60 transition-colors group">
                      <td className="px-3 py-3.5 text-xs text-mist-400 whitespace-nowrap">{getListRowNumber(index)}</td>
                      <td className="px-3 py-3.5 text-sm text-navy-500">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 whitespace-nowrap font-medium">{formatDate(report.resolution_date)}</span>
                          <span className="shrink-0 text-xs text-mist-400">|</span>
                          <span className="min-w-0 truncate whitespace-nowrap text-xs font-medium text-mist-500">{getReportAuthorName(report)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold text-navy-500 tabular-nums text-sm whitespace-nowrap">
                        {(report.total_amount || 0).toLocaleString()}원
                      </td>
                      <td className="px-3 py-3.5 text-sm text-mist-500 truncate whitespace-nowrap">{report.first_item_summary || '-'}</td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col gap-1">
                          {CHECK_FIELDS.map(({ field, label }) => (
                            <CheckItem
                              key={field}
                              label={label}
                              checked={!!report[field]}
                              checkedBy={report[`${field}_by`]}
                              canEdit={canManageChecks}
                              updating={updatingCheck === `${report.id}-${field}`}
                              onToggle={() => handleCheckToggle(report.id, field, !!report[field])}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEditDraft && (
                            <button
                              onClick={() => handleEdit(report.id)}
                              className="p-2 text-gold-500 hover:text-gold-700 hover:bg-gold-50 rounded-lg transition-colors"
                              title="계속 작성"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleView(report.id)}
                            disabled={detailLoading}
                            className="p-2 text-navy-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(report.id)}
                            className="p-2 text-mist-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {reports.map((report, index) => {
              const canEditDraft = canEditDraftReport(report, user?.id);

              return (
                <div key={report.id} className="bg-white rounded-2xl border border-mist-200 overflow-hidden">
                  <div
                    onClick={() => handleView(report.id)}
                    className="p-4 active:bg-cream-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs text-mist-400">#{getListRowNumber(index)}</span>
                      <StatusBadge status={report.status} />
                    </div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-navy-400">{formatDate(report.resolution_date)}</span>
                        <span className="text-[11px] text-mist-300">|</span>
                        <span className="truncate text-xs font-medium text-mist-500">{getReportAuthorName(report)}</span>
                      </div>
                      <span className="text-lg font-bold text-navy-500 tabular-nums">
                        {(report.total_amount || 0).toLocaleString()}원
                      </span>
                    </div>
                    <p className="text-xs text-mist-400 truncate">{report.first_item_summary || '-'}</p>
                  </div>

                  <div className="px-4 pb-3 pt-2 border-t border-mist-100 bg-cream-100/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      {CHECK_FIELDS.map(({ field, label }) => (
                        <CheckItem
                          key={field}
                          label={label}
                          checked={!!report[field]}
                          checkedBy={report[`${field}_by`]}
                          canEdit={canManageChecks}
                          updating={updatingCheck === `${report.id}-${field}`}
                          onToggle={() => handleCheckToggle(report.id, field, !!report[field])}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="px-4 py-2.5 border-t border-mist-100 flex items-center justify-between">
                    <span className="text-xs text-mist-400">{report.item_count || 0}개 항목</span>
                    <div className="flex items-center gap-3">
                      {canEditDraft && (
                        <button
                          onClick={() => handleEdit(report.id)}
                          className="text-xs text-gold-600 font-semibold flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          계속 작성
                        </button>
                      )}
                      <button
                        onClick={() => handleView(report.id)}
                        className="text-xs text-navy-400 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        상세 보기
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {reportPage.total_pages > 1 && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="text-xs text-mist-400">
                {reportPage.page} / {reportPage.total_pages} 페이지
              </div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setCurrentPage((prevPage) => Math.max(1, prevPage - 1))}
                  disabled={!reportPage.has_prev}
                  className="px-3 py-1.5 rounded-lg border border-mist-200 text-xs font-medium text-navy-500 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-navy-300 transition-colors"
                >
                  이전
                </button>

                {Array.from({ length: reportPage.total_pages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      pageNumber === reportPage.page
                        ? 'bg-navy-500 border-navy-500 text-white'
                        : 'bg-white border-mist-200 text-navy-500 hover:border-navy-300'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prevPage) => Math.min(reportPage.total_pages, prevPage + 1))}
                  disabled={!reportPage.has_next}
                  className="px-3 py-1.5 rounded-lg border border-mist-200 text-xs font-medium text-navy-500 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-navy-300 transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-slideUp">
            <h3 className="text-base font-bold text-navy-500 mb-2">결의서 삭제</h3>
            <p className="text-sm text-mist-500 mb-6 leading-relaxed">
              정말로 이 지출결의서를 삭제하시겠습니까?
              <br />
              삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 bg-cream-100 text-navy-500 font-medium rounded-xl hover:bg-mist-200 transition-colors text-sm"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors text-sm"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && selectedReport && (
        <ExpenseReportDetailModal
          report={selectedReport}
          onClose={() => {
            setShowDetail(false);
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
};

export default ExpenseReport;
