import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';

const MonthlyReportModal = ({ onClose, data, year, month }) => {
  if (!data) return null;

  // Yearly Totals and Balance
  const totalBalance = data?.total_balance || 0;
  const yearlyIncomeTotal = data?.yearly_income_total || 0;
  const yearlyExpenseTotal = data?.yearly_expense_total || 0;

  // Process data for 5 weeks
  const weeks = [1, 2, 3, 4, 5];

  // 1. Personnel Grouping
  const personnelByWeek = {
    "교사": [0, 0, 0, 0, 0],
    "청년": [0, 0, 0, 0, 0],
    "새신자": [0, 0, 0, 0, 0],
    "합계": [0, 0, 0, 0, 0]
  };
  
  if (data?.raw_personnel_records) {
    data.raw_personnel_records.forEach(r => {
      // "주차" is like "1주차", parse the number
      const wMatch = String(r.주차).match(/(\d+)주차/);
      if (wMatch) {
         const wIdx = parseInt(wMatch[1], 10) - 1;
         if (wIdx >= 0 && wIdx < 5) {
           const type = r.구분; // 교사, 청년, 새신자
           const count = parseInt(r.인원수) || 0;
           if (personnelByWeek[type] !== undefined) {
             personnelByWeek[type][wIdx] += count;
             personnelByWeek["합계"][wIdx] += count;
           }
         }
      }
    });
  }

  // 2. Financial Grouping
  const incomeCategories = [
    "감사헌금", "주일헌금", "십일조", "선교헌금", "찬조헌금", 
    "총회세례", "홈커밍데이후원", "세례교인"
  ];
  
  const incomeByWeek = {};
  incomeCategories.forEach(cat => incomeByWeek[cat] = [0, 0, 0, 0, 0]);
  const incomeWeekTotals = [0, 0, 0, 0, 0];

  const expenseCategories = ["활동비", "선교비", "기타비"];
  const expenseByWeek = {};
  expenseCategories.forEach(cat => expenseByWeek[cat] = [0, 0, 0, 0, 0]);
  const expenseWeekTotals = [0, 0, 0, 0, 0];

  // 3. Contributor Grouping
  // Structure: contributorsByCatAndWeek["감사헌금"][0] (0 = index for 1주차)
  const contributorCategories = ["감사헌금", "선교헌금", "세례교인", "십일조", "찬조헌금", "주일헌금"];
  const contributorsByCatAndWeek = {};
  contributorCategories.forEach(cat => contributorsByCatAndWeek[cat] = [[], [], [], [], []]);
  
  // Count contributors per week (flattening all categories including 주일헌금)
  const contributorCountByWeek = [0, 0, 0, 0, 0];

  if (data?.raw_records) {
    data.raw_records.forEach(r => {
      // only look at this month's data
      if (r.년 == year && r.월 == month) {
        const wMatch = String(r.주차).match(/(\d+)주차/);
        if (wMatch) {
          const wIdx = parseInt(wMatch[1], 10) - 1;
          if (wIdx >= 0 && wIdx < 5) {
            const amt = parseInt(r.금액) || 0;
            const cat = r.품목;
            
            if (r.구분 === '수입') {
               if (incomeByWeek[cat] !== undefined) {
                 incomeByWeek[cat][wIdx] += amt;
               }
               incomeWeekTotals[wIdx] += amt;

               // Process contributor name
               if (contributorCategories.includes(cat) && r.이름) {
                  const names = String(r.이름).split(',').map(n => n.trim()).filter(Boolean);
                  names.forEach(n => {
                    if (n === '무명' || !contributorsByCatAndWeek[cat][wIdx].includes(n)) {
                      contributorsByCatAndWeek[cat][wIdx].push(n);
                    }
                  });
               }
            } else if (r.구분 === '지출') {
               // The excel categorizes into 활동비, 선교비, 기타비. 
               // We will map based on the raw records. If a category isn't in predefined, throw into 기타비
               if (expenseByWeek[cat] !== undefined) {
                 expenseByWeek[cat][wIdx] += amt;
               } else {
                 expenseByWeek["기타비"][wIdx] += amt;
               }
               expenseWeekTotals[wIdx] += amt;
            }
          }
        }
      }
    });

    // Count contributors (ignoring dupes per category, but standard simple sum per week)
    contributorCategories.forEach(cat => {
      for(let wIdx=0; wIdx<5; wIdx++){
         contributorCountByWeek[wIdx] += contributorsByCatAndWeek[cat][wIdx].length;
      }
    });
  }

  const handlePrint = () => {
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Helper row renderer
  const renderDataRow = (label, dataArray, highlight = false) => {
    const total = dataArray.reduce((src, val) => src + val, 0);
    return (
      <tr className="h-6">
        <td className={`border border-black px-2 py-1 text-center ${highlight ? 'bg-[#fff2cc] font-bold' : ''}`}>{label}</td>
        {dataArray.map((val, idx) => (
          <td key={idx} className={`border border-black px-2 py-1 text-right ${val ? '' : 'text-gray-300'}`}>
            {val ? val.toLocaleString() : 0}
          </td>
        ))}
        <td className={`border border-black px-2 py-1 text-right font-bold ${highlight ? 'bg-[#fff2cc]' : 'bg-[#e6e6e6]'}`}>
          {total.toLocaleString()}
        </td>
      </tr>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex flex-col justify-start items-center p-4 overflow-y-auto print-modal-overlay" style={{ zIndex: 99999 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl my-4 report-modal-content font-sans text-[13px] relative flex-shrink-0">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 print-hidden sticky top-0 bg-white rounded-t-lg shadow-sm" style={{ zIndex: 100000 }}>
          <h2 className="text-xl font-bold text-gray-800">월간보고서 미리보기</h2>
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

        {/* Print Area */}
        <div className="p-8 text-black bg-white print-area" id="monthly-report-print-area">
          <h1 className="text-2xl font-black text-center mb-6 tracking-widest text-[#1e4e79]">청년부 월간보고</h1>
          
          {/* Top Meta info */}
          <div className="flex justify-between items-start mb-6">
            <table className="border-collapse border border-black text-center text-sm font-bold w-1/3">
              <tbody>
                <tr>
                  <td className="border border-black px-4 py-1.5">{year} 년</td>
                  <td className="border border-black px-4 py-1.5">{month < 10 ? `0${month}` : month} 월</td>
                </tr>
              </tbody>
            </table>

            <table className="border-collapse border border-black text-center text-sm w-1/3">
              <thead className="bg-[#f2f2f2]">
                <tr>
                  <th className="border border-black font-normal px-4 py-1.5">담당부장</th>
                  <th className="border border-black font-normal px-4 py-1.5">위원장</th>
                  <th className="border border-black font-normal px-4 py-1.5">당회장</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-16">
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Yearly Meta */}
          <table className="border-collapse border border-black w-full text-sm mb-6">
            <tbody>
              <tr className="h-7 text-center">
                <td className="border border-black font-bold bg-[#fff2cc] w-[14%] whitespace-nowrap">수입년간누계</td>
                <td className="border border-black px-2 text-right w-[19%]">{yearlyIncomeTotal.toLocaleString()}</td>
                <td className="border border-black font-bold bg-[#fff2cc] w-[14%] whitespace-nowrap">지출년간누계</td>
                <td className="border border-black px-2 text-right w-[19%]">{yearlyExpenseTotal.toLocaleString()}</td>
                <td className="border border-black font-bold bg-[#fff2cc] w-[14%] whitespace-nowrap">현재 잔액</td>
                <td className="border border-black px-2 text-right font-bold w-[19%]">{totalBalance.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* 1. Personnel */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-1">1. 인원보고</h2>
            <table className="border-collapse border border-black text-center w-full max-w-3xl">
              <thead className="bg-[#e6e6e6]">
                <tr>
                  <th className="border border-black font-normal px-4 py-1 w-24">구분</th>
                  <th className="border border-black font-normal px-4 py-1">1주차</th>
                  <th className="border border-black font-normal px-4 py-1">2주차</th>
                  <th className="border border-black font-normal px-4 py-1">3주차</th>
                  <th className="border border-black font-normal px-4 py-1">4주차</th>
                  <th className="border border-black font-normal px-4 py-1">5주차</th>
                </tr>
              </thead>
              <tbody>
                {["교사", "청년", "새신자"].map(type => (
                  <tr key={type} className="h-6">
                    <td className="border border-black px-2 py-1 bg-[#f2f2f2]">{type}</td>
                    {weeks.map(w => (
                      <td key={w} className={`border border-black px-2 py-1 ${personnelByWeek[type][w-1] ? '' : 'text-gray-300'}`}>
                        {personnelByWeek[type][w-1]}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="h-6 bg-[#fff2cc] font-bold">
                  <td className="border border-black px-2 py-1">합계</td>
                  {weeks.map(w => (
                    <td key={w} className={`border border-black px-2 py-1 ${personnelByWeek["합계"][w-1] ? '' : 'text-gray-400 font-normal'}`}>
                      {personnelByWeek["합계"][w-1]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. Financial Report */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-1">2. 재정보고</h2>
            
            {/* Income Sheet */}
            <table className="border-collapse border border-black w-full mb-4">
              <thead className="bg-[#dae3f3]">
                <tr>
                  <th className="border border-black font-bold px-2 py-1 w-24">수입</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">1주차</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">2주차</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">3주차</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">4주차</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">5주차</th>
                  <th className="border border-black font-bold px-2 py-1 w-28 bg-[#fff2cc]">합계</th>
                </tr>
              </thead>
              <tbody>
                {incomeCategories.map(cat => renderDataRow(cat, incomeByWeek[cat]))}
                {renderDataRow("합계", incomeWeekTotals, true)}
              </tbody>
            </table>

            {/* Expense Sheet */}
            <table className="border-collapse border border-black w-full">
              <thead className="bg-[#fce4d6]">
                <tr>
                  <th className="border border-black font-bold px-2 py-1 w-24">지출</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">1주차</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">2주차</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">3주차</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">4주차</th>
                  <th className="border border-black font-normal px-2 py-1 w-24">5주차</th>
                  <th className="border border-black font-bold px-2 py-1 w-28 bg-[#fff2cc]">합계</th>
                </tr>
              </thead>
              <tbody>
                {expenseCategories.map(cat => renderDataRow(cat, expenseByWeek[cat]))}
                {renderDataRow("합계", expenseWeekTotals, true)}
              </tbody>
            </table>
          </div>

          {/* 3. Contributor List */}
          <div className="mb-6 page-break-inside-avoid">
            <h2 className="text-lg font-bold mb-1">3. 헌금자명단</h2>
            <table className="border-collapse border border-black w-full align-top">
              <thead className="bg-[#e6e6e6]">
                <tr>
                  <th className="border border-black font-normal px-2 py-1 w-24">항목</th>
                  <th className="border border-black font-normal px-2 py-1 w-20">주차</th>
                  <th className="border border-black font-normal px-2 py-1 text-left">이름목록</th>
                </tr>
              </thead>
              <tbody>
                {["감사헌금", "선교헌금", "세례교인", "십일조", "찬조헌금"].map((catLabel, catIdx) => (
                  <React.Fragment key={catLabel}>
                    {weeks.map((w, wIdx) => {
                      const namesStr = contributorsByCatAndWeek[catLabel][wIdx].join(', ');
                      return (
                        <tr key={`${catLabel}-${w}`}>
                          {wIdx === 0 && (
                            <td rowSpan={5} className="border border-black px-2 py-1 text-center font-bold bg-[#f2f2f2]">
                              {catLabel}
                            </td>
                          )}
                          <td className="border border-black px-2 py-1 text-center">{w}주차</td>
                          <td className="border border-black px-3 py-1 bg-white break-words text-gray-800">
                            {namesStr}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
                <tr className="bg-[#fff2cc] font-bold">
                  <td colSpan={2} className="border border-black px-2 py-1 text-center text-xs">
                    헌금인원수<br/>(무명포함)
                  </td>
                  <td className="border border-black p-0">
                    <table className="w-full h-full border-collapse">
                       <thead>
                         <tr className="bg-[#f2f2f2]">
                           {weeks.map(w => (
                             <th key={`h_${w}`} className="border-b border-r border-black font-normal text-xs py-1 w-[16.6%] text-center">
                               {w}주차
                             </th>
                           ))}
                           <th className="border-b border-black font-bold text-xs py-1 w-[16.6%] text-center">
                             합계
                           </th>
                         </tr>
                       </thead>
                       <tbody>
                          <tr>
                            {weeks.map(w => (
                              <td key={`c_${w}`} className={`border-r border-black text-center py-1.5 ${contributorCountByWeek[w-1] ? '' : 'text-gray-400 font-normal'}`}>
                                {contributorCountByWeek[w-1]}
                              </td>
                            ))}
                            <td className="text-center py-1.5 text-blue-800 font-bold">
                               {contributorCountByWeek.reduce((a,b)=>a+b, 0)}
                            </td>
                          </tr>
                       </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

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
          .page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}} />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MonthlyReportModal;
