import React, { useState, useEffect } from 'react';
import { Loader2, Receipt, Eye, Trash2, FileText, AlertCircle } from 'lucide-react';
import { getExpenseReports, getExpenseReport, deleteExpenseReport } from '../lib/expenseReportService';
import ExpenseReportDetailModal from '../components/ExpenseReportDetailModal';

/* ── 상태 뱃지 ── */
const statusMap = {
  draft: { label: '임시저장', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  submitted: { label: '제출완료', color: 'bg-green-100 text-green-700 border-green-200' },
  approved: { label: '승인완료', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

function StatusBadge({ status }) {
  const s = statusMap[status] || statusMap.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${s.color}`}>
      {s.label}
    </span>
  );
}

/* ── 날짜 포맷 ── */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

/* ========================================= */
const ExpenseReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // 목록 조회
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenseReports();
      setReports(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // 상세 조회
  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    try {
      const data = await getExpenseReport(id);
      setSelectedReport(data);
      setShowDetail(true);
    } catch (err) {
      alert(`조회 실패: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    try {
      await deleteExpenseReport(id);
      setDeleteConfirmId(null);
      fetchReports();
    } catch (err) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <span className="ml-4 text-lg font-medium text-gray-600">결의서 목록을 불러오는 중...</span>
      </div>
    );
  }

  /* ── 에러 ── */
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={fetchReports} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Receipt className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">지출결의서 보기</h2>
            <p className="text-sm text-gray-500">총 {reports.length}건의 결의서</p>
          </div>
        </div>
      </div>

      {/* 빈 상태 */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="bg-gray-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">작성된 결의서가 없습니다</h3>
          <p className="text-gray-500 text-sm">사이드바에서 "지출결의서 작성하기"를 클릭하여 새 결의서를 작성해보세요.</p>
        </div>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-4 text-left font-semibold text-gray-600">No.</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-600">결의일자</th>
                  <th className="px-5 py-4 text-right font-semibold text-gray-600">금액</th>
                  <th className="px-5 py-4 text-center font-semibold text-gray-600">항목수</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-600">주요 내역</th>
                  <th className="px-5 py-4 text-center font-semibold text-gray-600">상태</th>
                  <th className="px-5 py-4 text-center font-semibold text-gray-600">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map((report, idx) => {
                  const firstItem = report.expense_items?.[0];
                  const summary = firstItem
                    ? `${firstItem.account_category} - ${firstItem.description}`
                    : '-';
                  return (
                    <tr key={report.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-5 py-4 font-medium text-gray-500">{reports.length - idx}</td>
                      <td className="px-5 py-4 font-medium text-gray-900">{formatDate(report.resolution_date)}</td>
                      <td className="px-5 py-4 text-right font-bold text-gray-900">
                        ₩ {(report.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-center text-gray-600">
                        {report.expense_items?.length || 0}건
                      </td>
                      <td className="px-5 py-4 text-gray-600 max-w-[200px] truncate">{summary}</td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewDetail(report.id)}
                            disabled={detailLoading}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(report.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {reports.map((report, idx) => {
              const firstItem = report.expense_items?.[0];
              const summary = firstItem
                ? `${firstItem.account_category} - ${firstItem.description}`
                : '-';
              return (
                <div
                  key={report.id}
                  onClick={() => handleViewDetail(report.id)}
                  className="bg-white rounded-xl border border-gray-200 p-4 active:bg-blue-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400">#{reports.length - idx}</span>
                    <StatusBadge status={report.status} />
                  </div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-medium text-gray-700 text-sm">{formatDate(report.resolution_date)}</span>
                    <span className="text-lg font-bold text-gray-900">₩ {(report.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{summary}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{report.expense_items?.length || 0}개 항목</span>
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <Eye className="w-3 h-3" /> 자세히 보기
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">결의서 삭제</h3>
            <p className="text-sm text-gray-600 mb-6">정말로 이 지출결의서를 삭제하시겠습니까?<br />삭제된 데이터는 복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 보기 모달 */}
      {showDetail && selectedReport && (
        <ExpenseReportDetailModal
          report={selectedReport}
          onClose={() => {
            setShowDetail(false);
            setSelectedReport(null);
          }}
        />
      )}
    </>
  );
};

export default ExpenseReport;
