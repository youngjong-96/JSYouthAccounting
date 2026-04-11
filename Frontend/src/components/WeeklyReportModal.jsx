import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';

const WeeklyReportModal = ({ onClose, data, year, month, week }) => {
  // Extract calculations
  const personnel = data?.personnel_stats || { 교사: 0, 청년: 0, 새신자: 0, 합계: 0 };
  
  // Filter raw records exactly by selected year, month, and week
  const filteredRecords = (data?.raw_records || []).filter(r => 
    r.년 == year && 
    r.월 == month && 
    (week ? (r.주차 === `${week}주차` || r.주차 === String(week)) : true)
  );

  // Re-calculate Week Income/Expense manually from filteredRecords
  const weekIncome = filteredRecords.filter(r => r.구분 === '수입').reduce((sum, r) => sum + (parseInt(r.금액) || 0), 0);
  const weekExpense = filteredRecords.filter(r => r.구분 === '지출').reduce((sum, r) => sum + (parseInt(r.금액) || 0), 0);
  
  const weekIncomeCats = {};
  filteredRecords.filter(r => r.구분 === '수입').forEach(r => {
    weekIncomeCats[r.품목] = (weekIncomeCats[r.품목] || 0) + (parseInt(r.금액) || 0);
  });
  
  // Accumulated data via props and calculated
  const totalBalance = data?.total_balance || 0;
  const yearlyIncomeTotal = data?.yearly_income_total || 0;
  const yearlyExpenseTotal = data?.yearly_expense_total || 0;

  // Render Income Rows (fixed set from provided image)
  const incomeCategories = [
    "주일헌금", "감사헌금", "십일조", "선교헌금", "찬조헌금", 
    "총회세례", "홈커밍데이후원", "세례교인", "잡이익", "동계수련회비"
  ];
  
  // Gather dynamic expense rows based on current week's raw records
  const expenseRecords = filteredRecords.filter(r => r.구분 === '지출');

  // Group contributors by category from filteredRecords directly so it matches exactly
  const contributorCategories = ["감사헌금", "선교헌금", "세례교인", "십일조", "찬조헌금", "주일헌금"];
  const contributorsLocal = {};
  contributorCategories.forEach(cat => contributorsLocal[cat] = []);
  
  filteredRecords.filter(r => r.구분 === '수입').forEach(r => {
    if (contributorCategories.includes(r.품목) && r.이름) {
      const names = String(r.이름).split(',').map(n => n.trim()).filter(Boolean);
      names.forEach(n => {
        if (n === '무명' || !contributorsLocal[r.품목].includes(n)) {
          contributorsLocal[r.품목].push(n);
        }
      });
    }
  });

  const contributors = {};
  Object.keys(contributorsLocal).forEach(cat => {
    contributors[cat] = contributorsLocal[cat].length > 0 ? contributorsLocal[cat].join(', ') : "없음";
  });

  // Calculate distinct contributors across all relevant categories for the "인원 합계"
  let totalDistinctContributors = 0;
  const allNames = [];
  ["감사헌금", "선교헌금", "세례교인", "십일조", "찬조헌금", "주일헌금"].forEach(cat => {
      contributorsLocal[cat].forEach(n => allNames.push(n));
  });
  // We can just count the raw number of elements, or distinct? The user says "주일헌금 인원이 포함되어야 해"
  totalDistinctContributors = allNames.length;

  const handlePrint = () => {
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const modalContent = (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex flex-col justify-start items-center p-4 overflow-y-auto print-modal-overlay" style={{ zIndex: 99999 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl my-4 report-modal-content font-sans text-[13px] relative flex-shrink-0">
        
        {/* Modal Header (Hidden on Print) */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 print-hidden sticky top-0 bg-white rounded-t-lg shadow-sm" style={{ zIndex: 100000 }}>
          <h2 className="text-xl font-bold text-gray-800">주간보고서 미리보기</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              인쇄하기
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Report Content - Styled like Excel */}
        <div className="p-8 text-black bg-white print-area" id="weekly-report-print-area">
          <h1 className="text-2xl font-black text-center mb-6 tracking-widest">청년부 주간보고</h1>
          
          {/* Top Meta info */}
          <div className="flex justify-between items-start mb-6">
            <table className="border-collapse border border-black text-center text-sm font-bold">
              <tbody>
                <tr>
                  <td className="border border-black px-6 py-1">{year} 년</td>
                  <td className="border border-black px-6 py-1">{month < 10 ? `0${month}` : month} 월</td>
                  <td className="border border-black px-6 py-1">{week ? `${week}주차` : '전체'}</td>
                </tr>
              </tbody>
            </table>

            <table className="border-collapse border border-black text-center text-sm">
              <thead>
                <tr>
                  <th className="border border-black font-normal px-6 py-1">재정담당</th>
                  <th className="border border-black font-normal px-6 py-1">부장</th>
                  <th className="border border-black font-normal px-6 py-1">담당목사</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black py-6 px-12"></td>
                  <td className="border border-black py-6 px-12"></td>
                  <td className="border border-black py-6 px-12"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 1. Personnel */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-1">1. 인원보고</h2>
            <table className="border-collapse border border-black text-center text-sm w-1/2">
              <thead className="bg-[#e6e6e6]">
                <tr>
                  <th className="border border-black font-normal px-4 py-1">교사</th>
                  <th className="border border-black font-normal px-4 py-1">청년</th>
                  <th className="border border-black font-normal px-4 py-1">새신자</th>
                  <th className="border border-black font-normal px-4 py-1 bg-[#fff2cc]">합계</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-4 py-1 font-bold">{personnel['교사'] || 0}</td>
                  <td className="border border-black px-4 py-1 font-bold">{personnel['청년'] || 0}</td>
                  <td className="border border-black px-4 py-1 font-bold">{personnel['새신자'] || 0}</td>
                  <td className="border border-black px-4 py-1 font-bold">{personnel['합계'] || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. Contributors */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-1">2. 헌금자명단</h2>
            <table className="border-collapse border border-black text-sm w-full">
              <thead className="bg-[#e6e6e6]">
                <tr>
                  <th className="border border-black font-normal px-4 py-1 w-32 text-center">품목</th>
                  <th className="border border-black font-normal px-4 py-1 text-center">헌금자명단</th>
                </tr>
              </thead>
              <tbody>
                {["감사헌금", "선교헌금", "세례교인", "십일조", "찬조헌금"].map(cat => (
                  <tr key={cat}>
                    <td className="border border-black px-4 py-1 text-center">{cat}</td>
                    <td className="border border-black px-4 py-1">{contributors[cat] || "없음"}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="2" className="border border-black px-4 py-1 text-right bg-[#f2f2f2]">
                    <span className="mr-4">인원 합계</span>
                    <span className="font-bold">
                      {totalDistinctContributors}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Income & Expense */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-1">3. 수입지출 항목</h2>
            
            {/* Balance */}
            <table className="border-collapse border border-black text-sm mb-2">
              <tbody>
                <tr>
                  <td className="border border-black px-4 py-1 font-bold bg-[#fff2cc] text-center w-32">현재잔액</td>
                  <td className="border border-black px-4 py-1 font-bold text-right w-48">{totalBalance.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Main Financial Table */}
            <table className="border-collapse border border-black text-sm w-full">
              {/* Header row for split sections */}
              <thead className="bg-[#dae3f3]">
                <tr>
                  <th colSpan="2" className="border border-black py-1 text-center">수입</th>
                  <th colSpan="3" className="border border-black py-1 text-center bg-[#fce4d6]">지출</th>
                </tr>
              </thead>
              <tbody>
                {/* Meta totals rows */}
                <tr>
                  <td className="border border-black px-2 py-1 text-center bg-[#f2f2f2] w-32">주간합계</td>
                  <td className="border border-black px-2 py-1 text-right font-bold w-32">{weekIncome.toLocaleString()}</td>
                  <td className="border border-black px-2 py-1 text-center bg-[#f2f2f2] w-32">주간합계</td>
                  <td className="border border-black px-2 py-1 text-right font-bold w-32">{weekExpense.toLocaleString()}</td>
                  <td className="border border-black px-2 py-1 bg-white"></td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1 text-center bg-[#e6e6e6]">월계</td>
                  <td className="border border-black px-2 py-1 text-right">{data?.monthly_income_total?.toLocaleString()}</td>
                  <td className="border border-black px-2 py-1 text-center bg-[#e6e6e6]">월계</td>
                  <td className="border border-black px-2 py-1 text-right">{data?.monthly_expense_total?.toLocaleString()}</td>
                  <td className="border border-black px-2 py-1 bg-white"></td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1 text-center bg-[#f2f2f2]">연간누계</td>
                  <td className="border border-black px-2 py-1 text-right">{yearlyIncomeTotal.toLocaleString()}</td>
                  <td className="border border-black px-2 py-1 text-center bg-[#f2f2f2]">연간누계</td>
                  <td className="border border-black px-2 py-1 text-right">{yearlyExpenseTotal.toLocaleString()}</td>
                  <td className="border border-black px-2 py-1 bg-white"></td>
                </tr>
                
                {/* Sub headers */}
                <tr>
                  <td className="border border-black px-2 py-1 text-center bg-[#b4c6e7]">항목</td>
                  <td className="border border-black px-2 py-1 text-center bg-[#b4c6e7]">금액</td>
                  <td className="border border-black px-2 py-1 text-center bg-[#f8cbad]">항목</td>
                  <td className="border border-black px-2 py-1 text-center bg-[#f8cbad]">금액</td>
                  <td className="border border-black px-2 py-1 text-center bg-[#f8cbad]">내역</td>
                </tr>

                {/* Items rows */}
                {Array.from({ length: Math.max(incomeCategories.length, expenseRecords.length, 12) }).map((_, idx) => {
                  const incCat = incomeCategories[idx] || "";
                  const incAmt = weekIncomeCats[incCat] || (incCat ? 0 : "");
                  
                  const expRec = expenseRecords[idx];
                  const expCat = expRec ? expRec.품목 : "";
                  const expAmt = expRec ? expRec.금액 : "";
                  const expNote = expRec ? expRec.비고 : "";

                  return (
                    <tr key={idx} className="h-6">
                      <td className="border border-black px-2 py-1 border-r-0">{incCat}</td>
                      <td className="border border-black px-2 py-1 text-right border-l-0">{incAmt !== "" ? incAmt.toLocaleString() : ""}</td>
                      <td className="border border-black px-2 py-1 border-r-0">{expCat}</td>
                      <td className="border border-black px-2 py-1 text-right border-l-0">{expAmt !== "" ? expAmt.toLocaleString() : ""}</td>
                      <td className="border border-black px-2 py-1">{expNote}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Required css to hide UI when printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * { 
            visibility: hidden; 
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            visibility: visible !important;
            display: block !important;
            background: white !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
          }
          .print-modal-overlay * {
            visibility: visible !important;
          }
          .report-modal-content {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            display: block !important;
            transform: none !important;
          }
          .print-area {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .print-hidden, .print-hidden * {
            display: none !important;
          }
        }
      `}} />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WeeklyReportModal;
