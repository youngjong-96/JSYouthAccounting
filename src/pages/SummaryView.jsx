import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, TrendingDown, Users, FileSpreadsheet } from 'lucide-react';
import WeeklyReportModal from '../components/WeeklyReportModal';
import MonthlyReportModal from '../components/MonthlyReportModal';
import { useAuth } from '../context/AuthContext';

const SummaryView = () => {
  const { data, year, month, week } = useOutletContext();
  const { isHeongeumOnly } = useAuth();
  const [showWeeklyReport, setShowWeeklyReport] = React.useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = React.useState(false);

  if (!data) return null;

  const currentIncomeTotal = data?.weekly_stats?.income_total ?? data?.monthly_income_total ?? 0;
  const currentExpenseTotal = data?.weekly_stats?.expense_total ?? data?.monthly_expense_total ?? 0;
  const currentIncomeCategories = data?.weekly_stats?.income_categories ?? data?.monthly_income_categories ?? {};
  const currentExpenseCategories = data?.weekly_stats?.expense_categories ?? data?.monthly_expense_categories ?? {};

  const carryover = data?.carryover_balance ?? 0;
  const cumulativeIncome = data?.cumulative_income_total ?? 0;
  const cumulativeExpense = data?.cumulative_expense_total ?? 0;
  const balance = carryover + cumulativeIncome - cumulativeExpense;

  /* ── 주보팀 전용: 헌금명단만 표시 ── */
  if (isHeongeumOnly) {
    if (!data?.contributors) {
      return (
        <div className="bg-white rounded-2xl border border-mist-200 p-14 text-center animate-slideUp">
          <Users className="w-9 h-9 text-mist-300 mx-auto mb-3" />
          <p className="text-sm text-mist-500">헌금명단 데이터가 없습니다.</p>
        </div>
      );
    }
    const rawRecords = data.raw_records || [];
    const weekStr = week ? `${week}주차` : null;
    const junil = rawRecords
      .filter(r => {
        if (r.구분 !== '수입' || r.품목 !== '주일헌금' || !r.이름) return false;
        if (weekStr) return r.주차 === weekStr || r.주차 === String(week);
        return true;
      })
      .flatMap(r => String(r.이름).split(',').map(n => n.trim()).filter(Boolean));
    const junilNames = [...new Set(junil)].join(', ') || '없음';
    const orderedEntries = [['주일헌금', junilNames], ...Object.entries(data.contributors)];

    return (
      <div className="animate-slideUp pb-8">
        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-mist-100">
            <div className="p-1.5 bg-navy-50 rounded-lg">
              <Users className="w-4 h-4 text-navy-500" />
            </div>
            <h3 className="text-sm font-semibold text-navy-500">헌금자 명단</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {orderedEntries.map(([category, names]) => (
              <div key={category} className="bg-cream-100 rounded-xl p-3.5">
                <h4 className="text-xs font-medium text-mist-500 mb-1.5">{category}</h4>
                <p className="text-sm text-navy-500 font-medium leading-relaxed">{names}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slideUp pb-8">

      {/* ── 보고서 버튼 ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowWeeklyReport(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-mist-200 hover:border-navy-300 text-navy-500 text-sm font-medium rounded-xl transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-mist-400" />
          주간보고서
        </button>
        <button
          onClick={() => setShowMonthlyReport(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-mist-200 hover:border-navy-300 text-navy-500 text-sm font-medium rounded-xl transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-mist-400" />
          월간보고서
        </button>
      </div>

      {/* ── 잔액 카드 (전체 폭) ── */}
      <div className="bg-navy-500 rounded-2xl p-5 shadow-lg shadow-navy-500/20 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

        <p className="text-xs text-white/50 font-light mb-1 relative z-10">현재 잔액</p>
        <p className={`text-3xl font-bold relative z-10 ${balance >= 0 ? 'text-white' : 'text-red-300'}`}>
          {balance >= 0 ? '' : '-'}{Math.abs(balance).toLocaleString()}
          <span className="text-lg font-normal text-white/60 ml-1">원</span>
        </p>
        <div className="flex gap-3 mt-3 relative z-10 flex-wrap">
          <div>
            <p className="text-xs text-white/40">이월금</p>
            <p className="text-sm font-semibold text-gold-400">{carryover.toLocaleString()}</p>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <p className="text-xs text-white/40">누적 수입</p>
            <p className="text-sm font-semibold text-green-300">+{cumulativeIncome.toLocaleString()}</p>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <p className="text-xs text-white/40">누적 지출</p>
            <p className="text-sm font-semibold text-red-300">-{cumulativeExpense.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── 수입 / 지출 카드 ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* 수입 */}
        <div className="bg-white rounded-2xl p-4 border border-mist-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-medium text-mist-500">총 수입</span>
          </div>
          <p className="text-xl font-bold text-navy-500 tabular-nums">
            {currentIncomeTotal.toLocaleString()}
            <span className="text-xs font-normal text-mist-400 ml-1">원</span>
          </p>
        </div>

        {/* 지출 */}
        <div className="bg-white rounded-2xl p-4 border border-mist-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-50 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-xs font-medium text-mist-500">총 지출</span>
          </div>
          <p className="text-xl font-bold text-navy-500 tabular-nums">
            {currentExpenseTotal.toLocaleString()}
            <span className="text-xs font-normal text-mist-400 ml-1">원</span>
          </p>
        </div>
      </div>

      {/* ── 인원 보고 ── */}
      {data?.personnel_stats && (
        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-mist-100">
            <div className="p-1.5 bg-navy-50 rounded-lg">
              <Users className="w-4 h-4 text-navy-500" />
            </div>
            <h3 className="text-sm font-semibold text-navy-500">인원 보고</h3>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '교사', key: '교사' },
                { label: '청년', key: '청년' },
                { label: '새신자', key: '새신자' },
                { label: '온라인', key: '온라인' },
              ].map(({ label, key }) => (
                <div key={key} className="text-center bg-cream-100 rounded-xl py-3">
                  <p className="text-xs text-mist-500 mb-1">{label}</p>
                  <p className="text-lg font-bold text-navy-500">{data.personnel_stats[key] || 0}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-navy-500 rounded-xl py-2.5 px-4 flex items-center justify-between">
              <span className="text-xs text-white/60">합계 (교사 제외)</span>
              <span className="text-lg font-bold text-gold-400">
                {(data.personnel_stats['청년'] || 0) +
                 (data.personnel_stats['새신자'] || 0) +
                 (data.personnel_stats['온라인'] || 0)}명
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 항목별 합계 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 수입 내역 */}
        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-mist-100 bg-green-50/50">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-navy-500">수입 항목별</h3>
          </div>
          <ul className="divide-y divide-mist-100">
            {Object.entries(currentIncomeCategories).length > 0 ? (
              Object.entries(currentIncomeCategories).map(([item, amount]) => (
                <li key={item} className="px-5 py-3 flex justify-between items-center">
                  <span className="text-sm text-navy-400">{item}</span>
                  <span className="text-sm font-semibold text-navy-500 tabular-nums">
                    {amount.toLocaleString()}원
                  </span>
                </li>
              ))
            ) : (
              <li className="px-5 py-6 text-center text-sm text-mist-400">데이터 없음</li>
            )}
          </ul>
        </div>

        {/* 지출 내역 */}
        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-mist-100 bg-red-50/50">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-navy-500">지출 항목별</h3>
          </div>
          <ul className="divide-y divide-mist-100">
            {Object.entries(currentExpenseCategories).length > 0 ? (
              Object.entries(currentExpenseCategories).map(([item, amount]) => (
                <li key={item} className="px-5 py-3 flex justify-between items-center">
                  <span className="text-sm text-navy-400">{item}</span>
                  <span className="text-sm font-semibold text-navy-500 tabular-nums">
                    {amount.toLocaleString()}원
                  </span>
                </li>
              ))
            ) : (
              <li className="px-5 py-6 text-center text-sm text-mist-400">데이터 없음</li>
            )}
          </ul>
        </div>
      </div>

      {/* ── 헌금자 명단 ── */}
      {data?.contributors && (() => {
        const rawRecords = data.raw_records || [];
        const weekStr = week ? `${week}주차` : null;
        const junil = rawRecords
          .filter(r => {
            if (r.구분 !== '수입' || r.품목 !== '주일헌금' || !r.이름) return false;
            if (weekStr) return r.주차 === weekStr || r.주차 === String(week);
            return true;
          })
          .flatMap(r => String(r.이름).split(',').map(n => n.trim()).filter(Boolean));
        const junilNames = [...new Set(junil)].join(', ') || '없음';

        const orderedEntries = [
          ['주일헌금', junilNames],
          ...Object.entries(data.contributors),
        ];

        return (
          <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-mist-100">
              <h3 className="text-sm font-semibold text-navy-500">헌금자 명단</h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orderedEntries.map(([category, names]) => (
                <div key={category} className="bg-cream-100 rounded-xl p-3.5">
                  <h4 className="text-xs font-medium text-mist-500 mb-1.5">{category}</h4>
                  <p className="text-sm text-navy-500 font-medium leading-relaxed">{names}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 모달 */}
      {showWeeklyReport && (
        <WeeklyReportModal
          onClose={() => setShowWeeklyReport(false)}
          data={data} year={year} month={month} week={week}
        />
      )}
      {showMonthlyReport && (
        <MonthlyReportModal
          onClose={() => setShowMonthlyReport(false)}
          data={data} year={year} month={month}
        />
      )}
    </div>
  );
};

export default SummaryView;
