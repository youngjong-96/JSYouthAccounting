import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * 요약 보기 화면을 렌더링하고 조회 결과를 대시보드 형태로 보여줍니다.
 * @returns {JSX.Element | null}
 */
const SummaryView = () => {
  const { data, year, month, week } = useOutletContext();
  const { isHeongeumOnly } = useAuth();

  if (!data) {
    return null;
  }

  const rawRecords = data.raw_records || [];
  const weekStr = week ? `${week}주차` : null;
  const selectedMonthLabel = month ? `${month}월` : '전체 월';
  const selectedWeekLabel = week ? `${week}주차` : '전체 주차';
  const selectedPeriodLabel = `${year}년 · ${selectedMonthLabel} · ${selectedWeekLabel}`;

  const currentIncomeTotal = data?.weekly_stats?.income_total ?? data?.monthly_income_total ?? 0;
  const currentExpenseTotal = data?.weekly_stats?.expense_total ?? data?.monthly_expense_total ?? 0;
  const currentIncomeCategories = data?.weekly_stats?.income_categories ?? data?.monthly_income_categories ?? {};
  const currentExpenseCategories = data?.weekly_stats?.expense_categories ?? data?.monthly_expense_categories ?? {};

  const carryover = data?.carryover_balance ?? 0;
  const cumulativeIncome = data?.cumulative_income_total ?? 0;
  const cumulativeExpense = data?.cumulative_expense_total ?? 0;
  const balance = carryover + cumulativeIncome - cumulativeExpense;
  const currentNet = currentIncomeTotal - currentExpenseTotal;

  const currentPeriodRecordCount = rawRecords.filter((record) => {
    const isSameYear = Number(record.년) === Number(year);
    const isSameMonth = month ? Number(record.월) === Number(month) : true;
    const isSameWeek = week ? record.주차 === weekStr || record.주차 === String(week) : true;
    return isSameYear && isSameMonth && isSameWeek;
  }).length;

  const sundayOfferingNames = rawRecords
    .filter((record) => {
      if (record.구분 !== '수입' || record.품목 !== '주일헌금' || !record.이름) {
        return false;
      }

      if (weekStr) {
        return record.주차 === weekStr || record.주차 === String(week);
      }

      return true;
    })
    .flatMap((record) => String(record.이름).split(',').map((name) => name.trim()).filter(Boolean));

  const contributorEntries = data?.contributors
    ? [
        ['주일헌금', [...new Set(sundayOfferingNames)].join(', ') || '없음'],
        ...Object.entries(data.contributors),
      ]
    : [];

  const summaryCards = [
    {
      title: '총 수입',
      value: `${currentIncomeTotal.toLocaleString()}원`,
      toneClass: 'bg-green-50 text-green-700',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      title: '총 지출',
      value: `${currentExpenseTotal.toLocaleString()}원`,
      toneClass: 'bg-red-50 text-red-600',
      icon: <TrendingDown className="w-4 h-4" />,
    },
    {
      title: '이번 조회 수지',
      value: `${currentNet >= 0 ? '+' : '-'}${Math.abs(currentNet).toLocaleString()}원`,
      toneClass: currentNet >= 0 ? 'bg-navy-50 text-navy-500' : 'bg-red-50 text-red-600',
      icon: <ReceiptText className="w-4 h-4" />,
    },
    {
      title: '조회 건수',
      value: `${currentPeriodRecordCount}건`,
      toneClass: 'bg-gold-50 text-gold-600',
      icon: <CalendarDays className="w-4 h-4" />,
    },
  ];

  const personnelItems = [
    { label: '교사', key: '교사' },
    { label: '청년', key: '청년' },
    { label: '새신자', key: '새신자' },
    { label: '온라인', key: '온라인' },
  ];

  /* 헌금 명단만 별도로 보는 계정은 명단 중심 레이아웃으로 보여줍니다. */
  if (isHeongeumOnly) {
    if (contributorEntries.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-mist-200 p-14 text-center animate-slideUp">
          <Users className="w-9 h-9 text-mist-300 mx-auto mb-3" />
          <p className="text-sm text-mist-500">헌금명단 데이터가 없습니다.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-slideUp pb-8">
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="bg-navy-500 rounded-2xl p-5 shadow-lg shadow-navy-500/20 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5" />

            <div className="relative z-10">
              <p className="text-xs font-medium text-white/60">조회 기간</p>
              <p className="mt-2 text-lg font-bold text-white leading-relaxed">{selectedPeriodLabel}</p>
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs text-white/55">조회 건수</p>
                  <p className="mt-1 text-xl font-bold text-gold-400">{currentPeriodRecordCount}건</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs text-white/55">명단 그룹</p>
                  <p className="mt-1 text-xl font-bold text-white">{contributorEntries.length}개</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-mist-100">
              <div className="p-1.5 bg-navy-50 rounded-lg">
                <Users className="w-4 h-4 text-navy-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-500">헌금자 명단</h3>
                <p className="text-xs text-mist-400 mt-0.5">{selectedPeriodLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {contributorEntries.map(([category, names]) => (
                <div key={category} className="rounded-xl bg-cream-100 p-3.5">
                  <h4 className="text-xs font-medium text-mist-500 mb-1.5">{category}</h4>
                  <p className="text-sm font-medium leading-relaxed text-navy-500">{names}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slideUp pb-8">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 bg-navy-500 rounded-2xl p-5 shadow-lg shadow-navy-500/20 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-white/55">현재 잔액</p>
              <p className={`mt-2 text-3xl font-bold ${balance >= 0 ? 'text-white' : 'text-red-300'}`}>
                {balance >= 0 ? '' : '-'}{Math.abs(balance).toLocaleString()}
                <span className="ml-1 text-lg font-normal text-white/60">원</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <p className="text-[11px] text-white/50">이월금</p>
              <p className="mt-1 text-sm font-semibold text-gold-400">{carryover.toLocaleString()}원</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <p className="text-[11px] text-white/50">누적 수입</p>
              <p className="mt-1 text-sm font-semibold text-green-300">+{cumulativeIncome.toLocaleString()}원</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <p className="text-[11px] text-white/50">누적 지출</p>
              <p className="mt-1 text-sm font-semibold text-red-300">-{cumulativeExpense.toLocaleString()}원</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
          {summaryCards.map((card) => (
            <div key={card.title} className="bg-white rounded-2xl border border-mist-200 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-mist-500">{card.title}</p>
                  <p className="mt-2 text-2xl font-bold text-navy-500 tabular-nums">{card.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.toneClass}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${data?.personnel_stats ? 'lg:grid-cols-2 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1fr)_minmax(0,1fr)]' : 'lg:grid-cols-2'}`}>
        {data?.personnel_stats && (
          <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden lg:col-span-2 xl:col-span-1">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-mist-100">
              <div className="p-1.5 bg-navy-50 rounded-lg">
                <Users className="w-4 h-4 text-navy-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-500">인원 보고</h3>
                <p className="text-xs text-mist-400 mt-0.5">{selectedPeriodLabel}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                {personnelItems.map(({ label, key }) => (
                  <div key={key} className="rounded-xl bg-cream-100 px-3 py-3 text-center">
                    <p className="text-xs text-mist-500 mb-1">{label}</p>
                    <p className="text-lg font-bold text-navy-500">{data.personnel_stats[key] || 0}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-navy-500 px-4 py-3">
                <span className="text-xs text-white/60">합계 (교사 제외)</span>
                <span className="text-lg font-bold text-gold-400">
                  {(data.personnel_stats.청년 || 0) +
                    (data.personnel_stats.새신자 || 0) +
                    (data.personnel_stats.온라인 || 0)}명
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-mist-100 bg-green-50/60">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <div>
              <h3 className="text-sm font-semibold text-navy-500">수입 항목별</h3>
              <p className="text-xs text-mist-400 mt-0.5">{selectedPeriodLabel}</p>
            </div>
          </div>
          <ul className="divide-y divide-mist-100 xl:max-h-[340px] xl:overflow-y-auto">
            {Object.entries(currentIncomeCategories).length > 0 ? (
              Object.entries(currentIncomeCategories).map(([item, amount]) => (
                <li key={item} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-sm text-navy-400">{item}</span>
                  <span className="text-sm font-semibold text-navy-500 tabular-nums">
                    {amount.toLocaleString()}원
                  </span>
                </li>
              ))
            ) : (
              <li className="px-5 py-8 text-center text-sm text-mist-400">데이터 없음</li>
            )}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-mist-100 bg-red-50/60">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <div>
              <h3 className="text-sm font-semibold text-navy-500">지출 항목별</h3>
              <p className="text-xs text-mist-400 mt-0.5">{selectedPeriodLabel}</p>
            </div>
          </div>
          <ul className="divide-y divide-mist-100 xl:max-h-[340px] xl:overflow-y-auto">
            {Object.entries(currentExpenseCategories).length > 0 ? (
              Object.entries(currentExpenseCategories).map(([item, amount]) => (
                <li key={item} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-sm text-navy-400">{item}</span>
                  <span className="text-sm font-semibold text-navy-500 tabular-nums">
                    {amount.toLocaleString()}원
                  </span>
                </li>
              ))
            ) : (
              <li className="px-5 py-8 text-center text-sm text-mist-400">데이터 없음</li>
            )}
          </ul>
        </div>
      </div>

      {contributorEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-mist-100">
            <div className="p-1.5 bg-navy-50 rounded-lg">
              <Users className="w-4 h-4 text-navy-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-navy-500">헌금자 명단</h3>
              <p className="text-xs text-mist-400 mt-0.5">{selectedPeriodLabel}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {contributorEntries.map(([category, names]) => (
              <div key={category} className="rounded-xl bg-cream-100 p-3.5">
                <h4 className="text-xs font-medium text-mist-500 mb-1.5">{category}</h4>
                <p className="text-sm font-medium leading-relaxed text-navy-500">{names}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryView;
