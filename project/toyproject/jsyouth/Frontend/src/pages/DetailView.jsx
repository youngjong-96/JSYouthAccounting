import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';

const DetailView = () => {
  const { data, year, month, week } = useOutletContext();
  
  // Table Filters
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!data) return null;

  const filteredRecords = data?.raw_records?.length > 0 
    ? data.raw_records
        .filter(r => r.년 == year && r.월 == month && (week ? r.주차 === `${week}주차` || r.주차 === String(week) : true))
        .filter(r => filterType ? r.구분 === filterType : true)
        .filter(r => filterCategory ? r.품목 === filterCategory : true)
        .filter(r => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          const nameMatch = r.이름 && String(r.이름).toLowerCase().includes(q);
          const noteMatch = r.비고 && String(r.비고).toLowerCase().includes(q);
          return nameMatch || noteMatch;
        })
    : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-semibold text-gray-800">회계 상세 내역</h3>
        
        {/* Table Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="block pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-white border"
          >
            <option value="">모든 구분</option>
            <option value="수입">수입</option>
            <option value="지출">지출</option>
          </select>

          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="block pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-white border"
          >
            <option value="">모든 품목</option>
            {/* Dynamically generate categories from current data */}
            {Array.from(new Set(data?.raw_records?.map(r => r.품목).filter(Boolean))).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="이름 또는 비고 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 text-sm border-gray-300 rounded-md leading-5 bg-white border placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:w-48"
            />
          </div>
        </div>
      </div>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주차</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구분</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">품목</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.주차}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.날짜}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.구분 === '수입' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {record.구분}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.품목}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.이름 || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">{record.금액?.toLocaleString()} 원</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{record.비고 || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">
                  해당 기간의 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-100">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record, idx) => (
            <div key={idx} className="p-4 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${record.구분 === '수입' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {record.구분}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{record.품목}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{record.금액?.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                <span>{record.날짜} ({record.주차})</span>
                {record.이름 && <span className="font-medium text-gray-700">{record.이름}</span>}
              </div>
              {record.비고 && (
                <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 mt-2">
                  <span className="font-semibold mr-1">비고:</span>{record.비고}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            해당 기간의 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailView;
