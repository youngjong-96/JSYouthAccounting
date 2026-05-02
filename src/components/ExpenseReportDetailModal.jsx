import React from 'react';
import { X, Download, ImageIcon } from 'lucide-react';

/* ───────── 한글 금액 변환 ───────── */
const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const KOREAN_SUBUNITS = ['', '십', '백', '천'];
const KOREAN_UNITS = ['', '만', '억', '조'];

function numberToKorean(n) {
  if (!n || n === 0) return '영';
  let result = '';
  let unitIndex = 0;
  while (n > 0) {
    const chunk = n % 10000;
    if (chunk > 0) {
      let chunkStr = '';
      let c = chunk;
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10;
        if (d > 0) {
          chunkStr = KOREAN_DIGITS[d] + KOREAN_SUBUNITS[i] + chunkStr;
        }
        c = Math.floor(c / 10);
      }
      result = chunkStr + KOREAN_UNITS[unitIndex] + result;
    }
    n = Math.floor(n / 10000);
    unitIndex++;
  }
  return result;
}

/* ── 날짜 파싱 ── */
function parseDateParts(dateStr) {
  if (!dateStr) return { y: '', m: '', d: '' };
  const dt = new Date(dateStr);
  return {
    y: String(dt.getFullYear()),
    m: String(dt.getMonth() + 1),
    d: String(dt.getDate()),
  };
}

/* ── 빈행 채우기 (최소 5줄) ── */
function padItems(items, minRows = 5) {
  const sorted = [...(items || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const result = [...sorted];
  while (result.length < minRows) {
    result.push(null);
  }
  return result;
}

/* ========================================= */
/*      ExpenseReportDetailModal Component   */
/* ========================================= */
const ExpenseReportDetailModal = ({ report, onClose }) => {
  if (!report) return null;

  const resDate = parseDateParts(report.resolution_date);
  const claimDate = parseDateParts(report.claim_date);
  const totalAmount = report.total_amount || 0;
  const koreanAmount = numberToKorean(totalAmount);
  const items = padItems(report.expense_items);
  const receipts = report.expense_receipts || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen px-2 pt-4 pb-20 sm:p-4">
        {/* 백드롭 */}
        <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

        {/* 모달 컨테이너 */}
        <div className="relative w-full max-w-[750px] bg-white shadow-2xl rounded-2xl overflow-hidden my-4">
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-2 bg-white hover:bg-cream-100 rounded-full shadow-md transition-colors border border-mist-200"
          >
            <X className="w-5 h-5 text-navy-500" />
          </button>

          {/* ═══════ 결의서 양식 ═══════ */}
          <div className="p-4 sm:p-6 md:p-8">
            <div className="border-2 border-gray-800 font-['Pretendard',_'Noto_Sans_KR',_sans-serif]">

              {/* ── 제목 ── */}
              <div className="bg-sky-50 border-b-2 border-gray-800 py-3">
                <h1 className="text-center text-xl sm:text-2xl font-black tracking-[0.4em] text-gray-900">
                  지 출 결 의 서
                </h1>
              </div>

              {/* ── 결재란 ── */}
              <div className="border-b-2 border-gray-800">
                <table className="w-full text-[11px] sm:text-xs border-collapse">
                  <tbody>
                    <tr>
                      {/* 지출부서 */}
                      <td className="border-r border-gray-400 p-0 w-1/2">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr className="border-b border-gray-300">
                              <td rowSpan="3" className="border-r border-gray-300 text-center font-bold px-1 py-0.5 w-6 leading-tight bg-sky-50/50">
                                <span className="block">지</span><span className="block">출</span><span className="block">부</span><span className="block">서</span>
                              </td>
                              <td className="border-r border-gray-300 text-center font-semibold px-2 py-1.5">부 장</td>
                              <td className="border-r border-gray-300 text-center px-2 py-1.5 w-12 sm:w-16"></td>
                              <td className="border-r border-gray-300 text-center font-semibold px-1 py-1.5">청<br/>구<br/>부</td>
                              <td className="border-r border-gray-300 text-center font-semibold px-2 py-1.5">위원장</td>
                              <td className="text-center px-2 py-1.5 w-12 sm:w-16"></td>
                            </tr>
                            <tr className="border-b border-gray-300">
                              <td className="border-r border-gray-300 text-center font-semibold px-2 py-1.5">부 장</td>
                              <td className="border-r border-gray-300 text-center px-2 py-1.5"></td>
                              <td className="border-r border-gray-300 text-center font-semibold px-1 py-1.5"></td>
                              <td className="border-r border-gray-300 text-center font-semibold px-2 py-1.5">부 장</td>
                              <td className="text-center px-2 py-1.5"></td>
                            </tr>
                            <tr>
                              <td className="border-r border-gray-300 text-center font-semibold px-2 py-1.5">담 당</td>
                              <td className="border-r border-gray-300 text-center px-2 py-1.5"></td>
                              <td className="border-r border-gray-300 text-center font-semibold px-1 py-1.5"></td>
                              <td className="border-r border-gray-300 text-center font-semibold px-2 py-1.5">담 당</td>
                              <td className="text-center px-2 py-1.5"></td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                      {/* 결재 */}
                      <td className="p-0 w-1/2">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr className="border-b border-gray-300">
                              <td rowSpan="3" className="border-r border-gray-300 text-center font-bold px-1 py-0.5 w-6 leading-tight bg-sky-50/50">
                                <span className="block">결</span>
                              </td>
                              <td className="border-r border-gray-300 text-center font-semibold px-2 py-1.5">당회장</td>
                              <td className="px-2 py-1.5 w-12 sm:w-16"></td>
                            </tr>
                            <tr className="border-b border-gray-300">
                              <td className="border-r border-gray-300 text-center font-semibold px-2 py-1.5">위원장</td>
                              <td className="px-2 py-1.5"></td>
                            </tr>
                            <tr>
                              <td className="border-r border-gray-300 text-center font-semibold px-1 py-1.5 text-[10px]">재 <span className="mx-1">재정부장</span></td>
                              <td className="px-2 py-1.5"></td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── 결의일자 ── */}
              <div className="border-b border-gray-400 py-2 px-4 text-center text-sm">
                <span className="font-semibold tracking-wider">결의일자 :</span>
                <span className="ml-3 tracking-wider">
                  20 <span className="mx-1 font-bold">{resDate.y.slice(2)}</span> 년
                  <span className="mx-2 font-bold">{resDate.m}</span> 월
                  <span className="mx-2 font-bold">{resDate.d}</span> 일
                </span>
              </div>

              {/* ── 금액 ── */}
              <div className="border-b-2 border-gray-800 py-2 px-4 flex items-baseline bg-sky-50/30">
                <span className="font-bold tracking-[0.3em] text-sm">금 액:</span>
                <span className="flex-1 text-center text-sm tracking-wider">
                  {koreanAmount} <span className="font-bold">원 정</span> ( ₩
                  <span className="ml-2 text-base font-extrabold">{totalAmount.toLocaleString()}</span>
                  <span className="ml-1">)</span>
                </span>
              </div>

              {/* ── 항목 테이블 ── */}
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-sky-50/50 border-b border-gray-400">
                    <th className="border-r border-gray-400 px-2 py-2 text-center font-bold w-[90px] sm:w-[110px]">계정과목</th>
                    <th className="border-r border-gray-400 px-2 py-2 text-center font-bold">적 요</th>
                    <th className="border-r border-gray-400 px-2 py-2 text-center font-bold w-[40px] sm:w-[50px]">월분</th>
                    <th className="border-r border-gray-400 px-2 py-2 text-center font-bold w-[40px] sm:w-[50px]">수량</th>
                    <th className="border-r border-gray-400 px-2 py-2 text-center font-bold w-[70px] sm:w-[80px]">단 가</th>
                    <th className="px-2 py-2 text-center font-bold w-[70px] sm:w-[90px]">금 액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-300 hover:bg-yellow-50/30">
                      <td className="border-r border-gray-300 px-2 py-2 text-center text-gray-800">
                        {item?.account_category || ''}
                      </td>
                      <td className="border-r border-gray-300 px-2 py-2 text-gray-800">
                        {item?.description || ''}
                      </td>
                      <td className="border-r border-gray-300 px-2 py-2 text-center text-gray-700">
                        {item?.month_period || ''}
                      </td>
                      <td className="border-r border-gray-300 px-2 py-2 text-center text-gray-700">
                        {item?.quantity || ''}
                      </td>
                      <td className="border-r border-gray-300 px-2 py-2 text-right text-gray-700 tabular-nums">
                        {item ? (item.unit_price || 0).toLocaleString() : ''}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-gray-900 tabular-nums">
                        {item ? (
                          <>
                            {(item.amount || 0).toLocaleString()}
                          </>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* 합계 */}
                <tfoot>
                  <tr className="border-t-2 border-gray-800 bg-sky-50/30">
                    <td colSpan="2" className="border-r border-gray-400 px-2 py-2.5 text-center font-bold tracking-[0.5em] text-sm">
                      합 계
                    </td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="px-2 py-2.5 text-right font-extrabold text-base text-gray-900 tabular-nums">
                      {totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* ── 비고 (계좌번호) ── */}
              <div className="border-t-2 border-gray-800 border-b border-gray-400 py-2 px-4">
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="font-bold tracking-wider whitespace-nowrap">비 고 (계좌번호)</span>
                  <span className="flex-1 text-gray-800">{report.bank_account || '-'}</span>
                </div>
              </div>

              {/* ── 청구부서 서명란 ── */}
              <div className="border-b border-gray-400">
                <table className="w-full text-[11px] sm:text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="border-r border-gray-300 text-center font-semibold px-3 py-2 bg-sky-50/30 w-[100px]">청구위원회</td>
                      <td className="border-r border-gray-300 text-center px-3 py-2 w-[90px]">청년부 회계</td>
                      <td className="border-r border-gray-300 text-center font-semibold px-3 py-2 w-[100px]">청구위원회 회계</td>
                      <td className="text-center px-3 py-2 w-[60px]"></td>
                      <td className="border-l border-gray-300 text-center font-semibold px-3 py-2">서명</td>
                    </tr>
                    <tr>
                      <td className="border-r border-gray-300 text-center font-semibold px-3 py-2 bg-sky-50/30">청구부서</td>
                      <td className="border-r border-gray-300 text-center px-3 py-2">청년부 회계</td>
                      <td className="border-r border-gray-300 text-center font-semibold px-3 py-2">청구부서회계</td>
                      <td className="text-center px-3 py-2"></td>
                      <td className="border-l border-gray-300 text-center font-semibold px-3 py-2">서명</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── 청구일자 ── */}
              <div className="py-2.5 px-4 text-center text-sm bg-sky-50/30">
                <span className="font-bold tracking-wider">청구일자 :</span>
                <span className="ml-3 tracking-wider">
                  20 <span className="mx-1 font-bold">{claimDate.y ? claimDate.y.slice(2) : ''}</span> 년
                  <span className="mx-2 font-bold">{claimDate.m || ''}</span> 월
                  <span className="mx-2 font-bold">{claimDate.d || ''}</span> 일
                </span>
              </div>
            </div>

            {/* ── 영수증 이미지 ── */}
            {receipts.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  첨부 영수증 ({receipts.length}장)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {receipts.map((receipt, idx) => (
                    <a
                      key={receipt.id || idx}
                      href={receipt.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-xl overflow-hidden border border-mist-200 hover:border-gold-400 hover:shadow-md transition-all"
                    >
                      <img
                        src={receipt.image_url}
                        alt={receipt.file_name || `영수증 ${idx + 1}`}
                        className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="px-2 py-1.5 bg-gray-50 text-[10px] text-gray-500 truncate flex items-center gap-1">
                        <Download className="w-3 h-3 flex-shrink-0" />
                        {receipt.file_name || `영수증 ${idx + 1}`}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseReportDetailModal;
