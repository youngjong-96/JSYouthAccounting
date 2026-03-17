import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, TrendingDown, Users, FileSpreadsheet } from 'lucide-react';
import WeeklyReportModal from '../components/WeeklyReportModal';
import MonthlyReportModal from '../components/MonthlyReportModal';

const SummaryView = () => {
  const { data, year, month, week } = useOutletContext();
  const [showWeeklyReport, setShowWeeklyReport] = React.useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = React.useState(false);
  
  if (!data) return null;

  const currentIncomeTotal = data?.weekly_stats?.income_total ?? data?.monthly_income_total ?? 0;
  const currentExpenseTotal = data?.weekly_stats?.expense_total ?? data?.monthly_expense_total ?? 0;
  const currentIncomeCategories = data?.weekly_stats?.income_categories ?? data?.monthly_income_categories ?? {};
  const currentExpenseCategories = data?.weekly_stats?.expense_categories ?? data?.monthly_expense_categories ?? {};

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={() => setShowWeeklyReport(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          주간보고서 생성하기
        </button>
        <button
          onClick={() => setShowMonthlyReport(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          월간보고서 생성하기
        </button>
      </div>

      {/* Personnel Info */}
      {data?.personnel_stats && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center text-gray-700">
          <div className="p-2 bg-blue-50 rounded-lg mr-3">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg">인원 보고</h3>
        </div>
        <div className="flex space-x-6">
          <div className="text-center">
            <span className="block text-sm text-gray-500">교사</span>
            <span className="block font-bold text-xl text-gray-900">{data.personnel_stats['교사'] || 0}</span>
          </div>
          <div className="text-center">
            <span className="block text-sm text-gray-500">청년</span>
            <span className="block font-bold text-xl text-gray-900">{data.personnel_stats['청년'] || 0}</span>
          </div>
          <div className="text-center">
            <span className="block text-sm text-gray-500">새신자</span>
            <span className="block font-bold text-xl text-gray-900">{data.personnel_stats['새신자'] || 0}</span>
          </div>
          <div className="text-center pl-6 border-l border-gray-200">
            <span className="block text-sm font-medium text-blue-600">합계</span>
            <span className="block font-bold text-2xl text-blue-700">{data.personnel_stats['합계'] || 0}</span>
          </div>
        </div>
      </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Income Card */}
        <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden relative group transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-24 h-24 text-green-500" />
          </div>
          <div className="p-6 relative z-10">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="ml-3 text-lg font-semibold text-gray-700">총 수입</h2>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold text-gray-900">
                {currentIncomeTotal.toLocaleString()}
              </span>
              <span className="ml-2 text-gray-500 font-medium">원</span>
            </div>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden relative group transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingDown className="w-24 h-24 text-red-500" />
          </div>
          <div className="p-6 relative z-10">
            <div className="flex items-center">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="ml-3 text-lg font-semibold text-gray-700">총 지출</h2>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold text-gray-900">
                {currentExpenseTotal.toLocaleString()}
              </span>
              <span className="ml-2 text-gray-500 font-medium">원</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Income Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">수입 항목별 합계</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {Object.entries(currentIncomeCategories).length > 0 ? (
              Object.entries(currentIncomeCategories).map(([item, amount]) => (
                <li key={item} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-700">{item}</span>
                  <span className="font-semibold text-gray-900">{amount.toLocaleString()} 원</span>
                </li>
              ))
            ) : (
              <li className="px-6 py-8 text-center text-gray-400">데이터가 없습니다.</li>
            )}
          </ul>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">지출 항목별 합계</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {Object.entries(currentExpenseCategories).length > 0 ? (
              Object.entries(currentExpenseCategories).map(([item, amount]) => (
                <li key={item} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-700">{item}</span>
                  <span className="font-semibold text-gray-900">{amount.toLocaleString()} 원</span>
                </li>
              ))
            ) : (
              <li className="px-6 py-8 text-center text-gray-400">데이터가 없습니다.</li>
            )}
          </ul>
        </div>
      </div>
      
      {/* Contributor List */}
      {data?.contributors && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">헌금자 명단</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(data.contributors).map(([category, names]) => (
              <div key={category} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h4 className="font-medium text-sm text-gray-500 mb-2">{category}</h4>
                <p className="text-gray-900 leading-relaxed font-medium">{names}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Report Modals */}
      {showWeeklyReport && (
        <WeeklyReportModal 
          onClose={() => setShowWeeklyReport(false)} 
          data={data}
          year={year}
          month={month}
          week={week}
        />
      )}
      {showMonthlyReport && (
        <MonthlyReportModal 
          onClose={() => setShowMonthlyReport(false)} 
          data={data}
          year={year}
          month={month}
        />
      )}
    </>
  );
};

export default SummaryView;
