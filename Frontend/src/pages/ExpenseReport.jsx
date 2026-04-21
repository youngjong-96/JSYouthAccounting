import React, { useState, useEffect } from 'react';
import { Loader2, Receipt, Eye, Trash2, FileText, AlertCircle, FilePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getExpenseReports, getExpenseReport, deleteExpenseReport } from '../lib/expenseReportService';
import ExpenseReportDetailModal from '../components/ExpenseReportDetailModal';

/* ── 상태 뱃지 ── */
const statusMap = {
  draft:     { label: '임시저장', cls: 'bg-gold-50 text-gold-600 border-gold-200' },
  submitted: { label: '제출완료', cls: 'bg-green-50 text-green-700 border-green-200' },
  approved:  { label: '승인완료', cls: 'bg-navy-50 text-navy-600 border-navy-200' },
};

function StatusBadge({ status }) {
  const s = statusMap[status] || statusMap.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

/* ========================================= */
const ExpenseReport = () => {
  const navigate = useNavigate();
  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedReport, setSelected]   = useState(null);
  const [detailLoading, setDetailLoad]  = useState(false);
  const [showDetail, setShowDetail]     = useState(false);
  const [deleteConfirmId, setDeleteId]  = useState(null);

  const fetchReports = async () => {
    setLoading(true); setError(null);
    try { setReports((await getExpenseReports()) || []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchReports(); }, []);

  const handleView = async (id) => {
    setDetailLoad(true);
    try { setSelected(await getExpenseReport(id)); setShowDetail(true); }
    catch (e) { alert(`조회 실패: ${e.message}`); }
    finally { setDetailLoad(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteExpenseReport(id); setDeleteId(null); fetchReports(); }
    catch (e) { alert(`삭제 실패: ${e.message}`); }
  };

  /* ── 로딩 ── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="w-9 h-9 text-navy-400 animate-spin mb-3" />
      <p className="text-sm text-mist-500">결의서 목록을 불러오는 중...</p>
    </div>
  );

  /* ── 에러 ── */
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center animate-fadeIn">
      <AlertCircle className="w-9 h-9 text-red-400 mx-auto mb-3" />
      <p className="text-red-600 font-medium text-sm mb-4">{error}</p>
      <button onClick={fetchReports} className="px-5 py-2.5 bg-navy-500 text-white rounded-xl text-sm font-medium hover:bg-navy-600 transition-colors">
        다시 시도
      </button>
    </div>
  );

  return (
    <div className="space-y-4 animate-slideUp pb-8">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-navy-50 rounded-xl">
            <Receipt className="w-5 h-5 text-navy-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-500">지출결의서 보기</h2>
            <p className="text-xs text-mist-500">총 {reports.length}건</p>
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

      {/* ── 빈 상태 ── */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-mist-200 p-14 text-center">
          <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-mist-300" />
          </div>
          <h3 className="text-sm font-bold text-navy-500 mb-1.5">작성된 결의서가 없습니다</h3>
          <p className="text-xs text-mist-500 mb-5">"새 결의서" 버튼을 눌러 지출결의서를 작성해보세요.</p>
          <button
            onClick={() => navigate('/expense/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-500 hover:bg-navy-600 text-white text-sm font-medium rounded-xl transition-all"
          >
            <FilePlus className="w-4 h-4" />
            지출결의서 작성하기
          </button>
        </div>
      ) : (
        <>
          {/* ── 데스크톱 테이블 ── */}
          <div className="hidden md:block bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100 border-b border-mist-200">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-mist-500 uppercase tracking-wider">No.</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-mist-500 uppercase tracking-wider">결의일자</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-mist-500 uppercase tracking-wider">금액</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-mist-500 uppercase tracking-wider">주요 내역</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-mist-500 uppercase tracking-wider">상태</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-mist-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {reports.map((report, idx) => {
                  const firstItem = report.expense_items?.[0];
                  const summary = firstItem ? `${firstItem.account_category} · ${firstItem.description}` : '-';
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-cream-100/60 transition-colors group cursor-pointer"
                      onClick={() => handleView(report.id)}
                    >
                      <td className="px-5 py-4 text-xs text-mist-400 font-medium">{reports.length - idx}</td>
                      <td className="px-5 py-4 text-sm font-medium text-navy-500">{formatDate(report.resolution_date)}</td>
                      <td className="px-5 py-4 text-right font-bold text-navy-500 tabular-nums">
                        {(report.total_amount || 0).toLocaleString()}원
                      </td>
                      <td className="px-5 py-4 text-sm text-mist-500 max-w-[220px] truncate">{summary}</td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleView(report.id)}
                            disabled={detailLoading}
                            className="p-2 text-navy-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(report.id)}
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

          {/* ── 모바일 카드 ── */}
          <div className="md:hidden space-y-3">
            {reports.map((report, idx) => {
              const firstItem = report.expense_items?.[0];
              const summary = firstItem ? `${firstItem.account_category} · ${firstItem.description}` : '-';
              return (
                <div
                  key={report.id}
                  onClick={() => handleView(report.id)}
                  className="bg-white rounded-2xl border border-mist-200 p-4 active:bg-cream-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs text-mist-400">#{reports.length - idx}</span>
                    <StatusBadge status={report.status} />
                  </div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-medium text-navy-400">{formatDate(report.resolution_date)}</span>
                    <span className="text-lg font-bold text-navy-500 tabular-nums">
                      {(report.total_amount || 0).toLocaleString()}원
                    </span>
                  </div>
                  <p className="text-xs text-mist-400 truncate mb-3">{summary}</p>
                  <div className="flex items-center justify-between pt-2.5 border-t border-mist-100">
                    <span className="text-xs text-mist-400">{report.expense_items?.length || 0}개 항목</span>
                    <span className="text-xs text-navy-400 font-medium flex items-center gap-1">
                      <Eye className="w-3 h-3" /> 자세히 보기
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── 삭제 확인 모달 ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-slideUp">
            <h3 className="text-base font-bold text-navy-500 mb-2">결의서 삭제</h3>
            <p className="text-sm text-mist-500 mb-6 leading-relaxed">
              정말로 이 지출결의서를 삭제하시겠습니까?<br />삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 bg-cream-100 text-navy-500 font-medium rounded-xl hover:bg-mist-200 transition-colors text-sm"
              >취소</button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors text-sm"
              >삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 상세 모달 ── */}
      {showDetail && selectedReport && (
        <ExpenseReportDetailModal
          report={selectedReport}
          onClose={() => { setShowDetail(false); setSelected(null); }}
        />
      )}
    </div>
  );
};

export default ExpenseReport;
