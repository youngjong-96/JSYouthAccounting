import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ImageIcon, Printer, X } from 'lucide-react';

const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const KOREAN_SUBUNITS = ['', '십', '백', '천'];
const KOREAN_UNITS = ['', '만', '억', '조'];
const MIN_ITEM_ROWS = 8;
const EMPTY_RECEIPTS = [];

/**
 * 숫자 금액을 한글 금액 표기로 변환합니다.
 * @param {number} amount
 * @returns {string}
 */
function numberToKorean(amount) {
  if (!amount) {
    return '영';
  }

  let remaining = Math.floor(Math.abs(amount));
  let result = '';
  let unitIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 10000;

    if (chunk > 0) {
      let chunkText = '';
      let current = chunk;

      for (let i = 0; i < 4 && current > 0; i += 1) {
        const digit = current % 10;

        if (digit > 0) {
          chunkText = `${KOREAN_DIGITS[digit]}${KOREAN_SUBUNITS[i]}${chunkText}`;
        }

        current = Math.floor(current / 10);
      }

      result = `${chunkText}${KOREAN_UNITS[unitIndex]}${result}`;
    }

    remaining = Math.floor(remaining / 10000);
    unitIndex += 1;
  }

  return result;
}

/**
 * 날짜 문자열을 양식 표시용 연, 월, 일로 분리합니다.
 * @param {string | null | undefined} dateStr
 * @returns {{ yearFront: string, yearBack: string, month: string, day: string }}
 */
function parseDateParts(dateStr) {
  if (!dateStr) {
    return {
      yearFront: '',
      yearBack: '',
      month: '',
      day: '',
    };
  }

  const date = new Date(dateStr);
  const year = String(date.getFullYear()).padStart(4, '0');

  return {
    yearFront: year.slice(0, 2),
    yearBack: year.slice(2),
    month: String(date.getMonth() + 1),
    day: String(date.getDate()),
  };
}

/**
 * 숫자 값을 천 단위 표기 문자열로 변환합니다.
 * @param {number | string | null | undefined} value
 * @returns {string}
 */
function formatNumber(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '';
  }

  return numericValue.toLocaleString();
}

/**
 * 날짜 파트를 사람이 읽기 좋은 문자열로 합칩니다.
 * @param {{ yearFront: string, yearBack: string, month: string, day: string }} parts
 * @returns {string}
 */
function formatDateLabel(parts) {
  if (!parts.yearFront && !parts.yearBack && !parts.month && !parts.day) {
    return '-';
  }

  return `20${parts.yearBack}년 ${parts.month}월 ${parts.day}일`;
}

/**
 * 지출결의서 데이터에서 화면 표시용 작성자 이름을 안전하게 추출합니다.
 * @param {object | null | undefined} report
 * @returns {string}
 */
function getReportAuthorName(report) {
  return report?.author_name || '작성자 미상';
}

/**
 * 지출 항목을 정렬하고 인쇄 양식 높이에 맞게 빈 행을 채웁니다.
 * @param {Array<object> | null | undefined} items
 * @param {number} minRows
 * @returns {Array<object | null>}
 */
function padExpenseItems(items, minRows = MIN_ITEM_ROWS) {
  const sortedItems = [...(items || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const rows = [...sortedItems];

  while (rows.length < minRows) {
    rows.push(null);
  }

  return rows;
}

/**
 * 모바일 카드용 지출 항목 목록을 정렬만 해서 반환합니다.
 * @param {Array<object> | null | undefined} items
 * @returns {Array<object>}
 */
function sortExpenseItems(items) {
  return [...(items || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

/**
 * 세로 제목 칸에 한 글자씩 쌓인 텍스트를 렌더링합니다.
 * @param {{ text: string }} props
 * @returns {JSX.Element}
 */
function VerticalLabel({ text }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center leading-tight">
        {text.split('').map((letter, index) => (
          <span key={`${text}-${index}`}>{letter}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * 모바일 요약 행을 렌더링합니다.
 * @param {{ label: string, value: string }} props
 * @returns {JSX.Element}
 */
function MobileInfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 shadow-sm backdrop-blur-sm">
      <p className="text-[11px] font-bold tracking-[0.18em] text-white/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white break-words">{value}</p>
    </div>
  );
}

/**
 * 모바일 지출 항목 카드를 렌더링합니다.
 * @param {{ item: object, index: number }} props
 * @returns {JSX.Element}
 */
function MobileExpenseItemCard({ item, index }) {
  return (
    <div className="rounded-2xl border border-mist-200 bg-cream-100/70 px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex rounded-full bg-gold-100 px-2 py-1 text-[11px] font-bold tracking-wide text-gold-700">
            항목 {index + 1}
          </p>
          <p className="mt-2 text-sm font-semibold text-navy-500">{item.account_category || '-'}</p>
        </div>
        <p className="text-sm font-bold tabular-nums text-navy-500">₩ {formatNumber(item.amount)}</p>
      </div>
      <div className="space-y-1.5 text-[13px] text-mist-500">
        <p><span className="font-bold text-navy-500">적요:</span> {item.description || '-'}</p>
        <p><span className="font-bold text-navy-500">월분:</span> {item.month_period || '-'}</p>
        <p><span className="font-bold text-navy-500">수량:</span> {item.quantity || '-'}</p>
        <p><span className="font-bold text-navy-500">단가:</span> {formatNumber(item.unit_price) || '-'}</p>
      </div>
    </div>
  );
}

/**
 * 첨부 영수증 목록을 화면 전용으로 렌더링합니다.
 * @param {{ receipts: Array<object> }} props
 * @returns {JSX.Element | null}
 */
function ReceiptGallery({ receipts }) {
  if (receipts.length === 0) {
    return null;
  }

  return (
    <div className="expense-report-screen-only mt-6 border-t border-mist-200 pt-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-500">
        <ImageIcon className="h-4 w-4 text-gold-500" />
        첨부 영수증 ({receipts.length}개)
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {receipts.map((receipt, index) => (
          <a
            key={receipt.id || `${receipt.image_url}-${index}`}
            href={receipt.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <img
              src={receipt.image_url}
              alt={receipt.file_name || `영수증 ${index + 1}`}
              className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-105 sm:h-40"
            />
            <div className="flex items-center gap-1 truncate border-t border-mist-100 bg-cream-100/70 px-2 py-1.5 text-[10px] text-mist-500">
              <Download className="h-3 w-3 flex-shrink-0 text-gold-500" />
              {receipt.file_name || `영수증 ${index + 1}`}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * 영수증 렌더링에 사용할 안정적인 키를 생성합니다.
 * @param {object} receipt
 * @param {number} index
 * @returns {string}
 */
function getReceiptKey(receipt, index) {
  return receipt.id || `${receipt.image_url}-${index}`;
}

/**
 * 영수증 원본 비율을 바탕으로 인쇄용 방향 타입을 구분합니다.
 * @param {number} width
 * @param {number} height
 * @returns {'portrait' | 'landscape' | 'square'}
 */
function classifyReceiptOrientation(width, height) {
  if (!width || !height) {
    return 'landscape';
  }

  const ratio = width / height;

  if (ratio >= 1.15) {
    return 'landscape';
  }

  if (ratio <= 0.87) {
    return 'portrait';
  }

  return 'square';
}

/**
 * PC 인쇄 전용 영수증 섹션을 렌더링합니다.
 * 파일명은 종이 낭비를 줄이기 위해 출력하지 않습니다.
 * @param {{ receipts: Array<object>, receiptOrientations: Record<string, 'portrait' | 'landscape' | 'square'> }} props
 * @returns {JSX.Element | null}
 */
function PrintReceiptSection({ receipts, receiptOrientations }) {
  if (receipts.length === 0) {
    return null;
  }

  return (
    <section className="expense-report-print-only expense-report-print-receipts hidden">
      <div className="mb-4 border-b border-black pb-2 text-black">
        <h3 className="text-[18px] font-bold tracking-[0.2em]">첨부 영수증</h3>
        <p className="mt-1 text-[12px]">{receipts.length}건</p>
      </div>

      <div className="expense-report-print-receipts-grid">
        {receipts.map((receipt, index) => {
          const receiptKey = getReceiptKey(receipt, index);
          const orientation = receiptOrientations[receiptKey] || 'landscape';

          return (
            <figure
              key={receiptKey}
              className={`expense-report-print-receipt expense-report-print-receipt--${orientation}`}
            >
              <div className="expense-report-print-receipt-frame">
                <img
                  src={receipt.image_url}
                  alt={`영수증 ${index + 1}`}
                  className="expense-report-print-receipt-image"
                />
              </div>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 모바일 전용 지출결의서 상세 레이아웃을 렌더링합니다.
 * @param {{ report: object, resolutionDateLabel: string, claimDateLabel: string, koreanAmountLabel: string, totalAmount: number, items: Array<object>, authorName: string }} props
 * @returns {JSX.Element}
 */
function MobileExpenseReportView({
  report,
  resolutionDateLabel,
  claimDateLabel,
  koreanAmountLabel,
  totalAmount,
  items,
  authorName,
}) {
  return (
    <div className="expense-report-mobile-only space-y-4 sm:hidden">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-500 via-navy-600 to-navy-800 p-4 text-white shadow-lg shadow-navy-500/15">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.32em] text-white/65">EXPENSE REPORT</p>
            <h1 className="mt-2 text-2xl font-black tracking-[0.28em] text-white">지출결의서</h1>
          </div>
          <span className="rounded-full bg-gold-400 px-3 py-1 text-[11px] font-bold text-navy-700 shadow-sm">
            회계 문서
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MobileInfoRow label="결의일자" value={resolutionDateLabel} />
          <MobileInfoRow label="청구일자" value={claimDateLabel} />
        </div>
        <div className="mt-3 rounded-2xl bg-white px-4 py-4 text-navy-500 shadow-md">
          <p className="text-[11px] font-bold tracking-[0.18em] text-mist-400">금액</p>
          <p className="mt-1 text-sm font-semibold text-mist-500">{koreanAmountLabel}</p>
          <p className="mt-2 text-xl font-black tabular-nums text-navy-500">₩ {formatNumber(totalAmount)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-mist-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-navy-500">지출 항목</h2>
          <p className="text-sm font-bold tabular-nums text-gold-600">합계 ₩ {formatNumber(totalAmount)}</p>
        </div>
        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item, index) => (
              <MobileExpenseItemCard key={`mobile-item-${index}`} item={item} index={index} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-mist-200 bg-cream-100/70 px-3 py-6 text-center text-sm text-mist-500">
              등록된 지출 항목이 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-3xl border border-mist-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-navy-500">비고 (계좌번호)</h2>
          <p className="mt-2 text-sm font-medium break-words text-mist-500">{report.bank_account || '-'}</p>
        </div>

        <div className="rounded-3xl border border-gold-200 bg-gold-50 p-4 shadow-sm">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700">작성자</p>
          <p className="mt-2 text-sm font-semibold text-navy-500">{authorName}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * PC와 인쇄용 지출결의서 양식을 렌더링합니다.
 * @param {{ report: object, resolutionDate: { yearFront: string, yearBack: string, month: string, day: string }, claimDate: { yearFront: string, yearBack: string, month: string, day: string }, koreanAmountLabel: string, totalAmount: number, items: Array<object | null> }} props
 * @returns {JSX.Element}
 */
function DesktopExpenseReportSheet({
  report,
  resolutionDate,
  claimDate,
  koreanAmountLabel,
  totalAmount,
  items,
}) {
  return (
    <div className="expense-report-desktop-sheet hidden sm:block">
      <div className="border-2 border-black bg-white text-black">
        <div className="border-b border-black py-2.5">
          <h1 className="text-center text-[22px] font-black tracking-[0.45em] text-black">
            지 출 결 의 서
          </h1>
        </div>

        <table className="w-full table-fixed border-collapse text-[12px] text-black">
          <colgroup>
            <col className="w-[4%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[4%]" />
            <col className="w-[18%]" />
            <col className="w-[17%]" />
            <col className="w-[4%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
          </colgroup>
          <tbody>
            <tr>
              <td rowSpan="3" className="border-r border-b border-black">
                <VerticalLabel text="지출부서" />
              </td>
              <td className="border-r border-b border-black py-2 text-center font-bold">부 장</td>
              <td className="border-r border-b border-black" />

              <td rowSpan="3" className="border-r border-b border-black">
                <VerticalLabel text="청구부서" />
              </td>
              <td className="border-r border-b border-black py-2 text-center font-bold">위원장</td>
              <td className="border-r border-b border-black" />

              <td rowSpan="3" className="border-r border-b border-black">
                <VerticalLabel text="결재" />
              </td>
              <td className="border-r border-b border-black py-2 text-center font-bold">당회장</td>
              <td className="border-b border-black" />
            </tr>
            <tr>
              <td className="border-r border-b border-black py-2 text-center font-bold">담 당</td>
              <td className="border-r border-b border-black" />

              <td className="border-r border-b border-black py-2 text-center font-bold">부 장</td>
              <td className="border-r border-b border-black" />

              <td className="border-r border-b border-black py-2 text-center font-bold">위원장</td>
              <td className="border-b border-black" />
            </tr>
            <tr>
              <td className="border-r border-black py-2 text-center font-bold" />
              <td className="border-r border-black" />

              <td className="border-r border-black py-2 text-center font-bold">담 당</td>
              <td className="border-r border-black" />

              <td className="border-r border-black py-2 text-center font-bold">재정부장</td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="border-y border-black py-2 text-center text-[13px] font-bold text-black">
          결의일자 :
          <span className="ml-3 font-normal tracking-[0.25em] text-black">
            {resolutionDate.yearFront}
            <span className="mx-1 font-bold">{resolutionDate.yearBack}</span>
            년
            <span className="mx-2 font-bold">{resolutionDate.month}</span>
            월
            <span className="mx-2 font-bold">{resolutionDate.day}</span>
            일
          </span>
        </div>

        <table className="w-full table-fixed border-collapse text-[13px] text-black">
          <tbody>
            <tr>
              <td className="w-[18%] border-b border-r border-black px-6 py-2 text-left font-bold tracking-[0.35em] text-black">
                금 액 :
              </td>
              <td className="border-b border-black px-3 py-2 text-right text-black">
                <span className="tracking-[0.2em]">{koreanAmountLabel}</span>
                <span className="ml-4 font-bold tracking-[0.18em]">( ₩ {formatNumber(totalAmount)} )</span>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full table-fixed border-collapse text-[12px] text-black">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[45%]" />
            <col className="w-[6%]" />
            <col className="w-[7%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black px-2 py-2 text-center text-[13px] font-bold text-black">계정과목</th>
              <th className="border-r border-black px-2 py-2 text-center text-[13px] font-bold text-black">적 요</th>
              <th className="border-r border-black px-2 py-2 text-center text-[13px] font-bold text-black">월분</th>
              <th className="border-r border-black px-2 py-2 text-center text-[13px] font-bold text-black">수량</th>
              <th className="border-r border-black px-2 py-2 text-center text-[13px] font-bold text-black">단 가</th>
              <th className="px-2 py-2 text-center text-[13px] font-bold text-black">금 액</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`expense-row-${index}`} className="border-b border-black">
                <td className="border-r border-black px-2 py-2.5 text-center text-black">{item?.account_category || ''}</td>
                <td className="border-r border-black px-3 py-2.5 text-black">{item?.description || ''}</td>
                <td className="border-r border-black px-2 py-2.5 text-center text-black">{item?.month_period ?? ''}</td>
                <td className="border-r border-black px-2 py-2.5 text-center text-black">{item?.quantity ?? ''}</td>
                <td className="border-r border-black px-3 py-2.5 text-right tabular-nums text-black">
                  {item ? formatNumber(item.unit_price) : ''}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-black">
                  {item ? formatNumber(item.amount) : <span className="text-black">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-black">
              <td colSpan="2" className="border-r border-black px-2 py-3 text-center text-[13px] font-bold tracking-[0.5em] text-black">
                합 계
              </td>
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="px-3 py-3 text-right text-[14px] font-bold tabular-nums text-black">
                {formatNumber(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>

        <table className="w-full table-fixed border-collapse text-[12px] text-black">
          <tbody>
            <tr className="border-y border-black">
              <td className="w-[23%] border-r border-black px-3 py-2 text-left text-[13px] font-bold text-black">
                비 고 (계좌번호)
              </td>
              <td className="px-3 py-2 text-center text-[13px] text-black">
                {report.bank_account || '-'}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full table-fixed border-collapse text-[12px] text-black">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[28%]" />
            <col className="w-[38%]" />
          </colgroup>
          <tbody>
            <tr className="border-b border-black">
              <td className="border-r border-black px-3 py-2 text-center font-bold text-black">청구위원회</td>
              <td className="border-r border-black px-3 py-2 text-center text-black">청년부 회계</td>
              <td className="border-r border-black px-3 py-2 text-center text-black">청구위원회 회계</td>
              <td className="px-5 py-2 text-right font-bold text-black">서명</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black px-3 py-2 text-center font-bold text-black">청구부서</td>
              <td className="border-r border-black px-3 py-2 text-center text-black">청년부 회계</td>
              <td className="border-r border-black px-3 py-2 text-center text-black">청구부서 회계</td>
              <td className="px-5 py-2 text-right font-bold text-black">서명</td>
            </tr>
          </tbody>
        </table>

        <div className="py-2.5 text-center text-[13px] font-bold text-black">
          청구일자 :
          <span className="ml-3 font-normal tracking-[0.25em] text-black">
            {claimDate.yearFront}
            <span className="mx-1 font-bold">{claimDate.yearBack}</span>
            년
            <span className="mx-2 font-bold">{claimDate.month}</span>
            월
            <span className="mx-2 font-bold">{claimDate.day}</span>
            일
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 지출결의서 상세 조회와 인쇄용 양식을 렌더링하는 모달입니다.
 * @param {{ report: object | null, onClose: () => void }} props
 * @returns {JSX.Element | null}
 */
const ExpenseReportDetailModal = ({ report, onClose }) => {
  const receipts = report?.expense_receipts ?? EMPTY_RECEIPTS;
  const [receiptOrientations, setReceiptOrientations] = useState({});
  const totalAmount = Number(report?.total_amount) || 0;
  const isReceiptPrintReady = receipts.length === 0
    || receipts.every((receipt, index) => receiptOrientations[getReceiptKey(receipt, index)]);

  const koreanAmountLabel = `${numberToKorean(totalAmount)} 원 정`;

  /**
   * 인쇄 전에 영수증 비율을 미리 읽어 용지에 맞는 크기 제한을 계산합니다.
   * @returns {void}
   */
  useEffect(() => {
    if (receipts.length === 0) {
      return undefined;
    }

    let isCancelled = false;

    const imageLoaders = receipts.map((receipt, index) => (
      new Promise((resolve) => {
        const receiptKey = getReceiptKey(receipt, index);
        const image = new window.Image();

        image.onload = () => {
          resolve({
            receiptKey,
            orientation: classifyReceiptOrientation(image.naturalWidth, image.naturalHeight),
          });
        };

        image.onerror = () => {
          resolve({
            receiptKey,
            orientation: 'landscape',
          });
        };

        image.src = receipt.image_url;
      })
    ));

    Promise.all(imageLoaders).then((loadedReceipts) => {
      if (isCancelled) {
        return;
      }

      const nextOrientations = {};

      loadedReceipts.forEach(({ receiptKey, orientation }) => {
        nextOrientations[receiptKey] = orientation;
      });

      setReceiptOrientations(nextOrientations);
    });

    return () => {
      isCancelled = true;
    };
  }, [receipts]);

  if (!report) {
    return null;
  }

  const resolutionDate = parseDateParts(report.resolution_date);
  const claimDate = parseDateParts(report.claim_date);
  const desktopItems = padExpenseItems(report.expense_items);
  const mobileItems = sortExpenseItems(report.expense_items);
  const resolutionDateLabel = formatDateLabel(resolutionDate);
  const claimDateLabel = formatDateLabel(claimDate);
  const authorName = getReportAuthorName(report);

  /**
   * 인쇄 전에 화면을 상단으로 이동한 뒤 브라우저 인쇄를 실행합니다.
   * @returns {void}
   */
  const handlePrint = () => {
    if (receipts.length > 0 && !isReceiptPrintReady) {
      return;
    }

    window.scrollTo(0, 0);

    setTimeout(() => {
      window.print();
    }, 100);
  };

  /**
   * 바깥 배경을 누르면 모달을 닫습니다.
   * @returns {void}
   */
  const handleOverlayClick = () => {
    onClose();
  };

  const modalContent = (
    <div className="expense-report-print-overlay fixed inset-0 z-[99999] overflow-y-auto bg-black/60 px-3 py-4 backdrop-blur-sm">
      <div
        className="expense-report-screen-only fixed inset-0"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      <div className="expense-report-modal relative z-10 mx-auto my-4 w-full max-w-[860px] rounded-2xl bg-white shadow-2xl">
        <div className="expense-report-screen-only sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-black bg-white px-4 py-3">
          <h2 className="text-base font-bold text-black">지출결의서 상세</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={receipts.length > 0 && !isReceiptPrintReady}
              className="hidden items-center gap-2 rounded-xl border border-black bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-50 sm:inline-flex"
            >
              <Printer className="h-4 w-4" />
              인쇄하기
            </button>
            <button
              onClick={onClose}
              className="rounded-full border border-black bg-white p-2 text-black transition-colors hover:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="expense-report-print-area p-4 sm:p-6">
          <MobileExpenseReportView
            report={report}
            resolutionDateLabel={resolutionDateLabel}
            claimDateLabel={claimDateLabel}
            koreanAmountLabel={koreanAmountLabel}
            totalAmount={totalAmount}
            items={mobileItems}
            authorName={authorName}
          />

          <DesktopExpenseReportSheet
            report={report}
            resolutionDate={resolutionDate}
            claimDate={claimDate}
            koreanAmountLabel={koreanAmountLabel}
            totalAmount={totalAmount}
            items={desktopItems}
            authorName={authorName}
          />

          <PrintReceiptSection
            receipts={receipts}
            receiptOrientations={receiptOrientations}
          />

          <ReceiptGallery receipts={receipts} />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }

              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                overflow: visible !important;
              }

              body * {
                visibility: hidden !important;
              }

              .expense-report-print-overlay,
              .expense-report-print-overlay * {
                visibility: visible !important;
              }

              .expense-report-print-overlay {
                position: absolute !important;
                inset: 0 !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                overflow: visible !important;
              }

              .expense-report-modal {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }

              .expense-report-print-area {
                padding: 0 !important;
              }

              .expense-report-screen-only,
              .expense-report-screen-only * {
                display: none !important;
              }

              .expense-report-mobile-only,
              .expense-report-mobile-only * {
                display: none !important;
              }

              .expense-report-desktop-sheet {
                display: block !important;
              }

              .expense-report-print-only {
                display: block !important;
              }

              .expense-report-print-receipts {
                margin-top: 0 !important;
                break-before: page;
                page-break-before: always;
              }

              .expense-report-print-receipts-grid {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6mm;
                align-items: start;
              }

              .expense-report-print-receipt {
                break-inside: avoid;
                page-break-inside: avoid;
                border: 1px solid black;
                padding: 4mm;
                background: white;
              }

              .expense-report-print-receipt-frame {
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .expense-report-print-receipt-image {
                display: block;
                max-width: 100%;
                height: auto;
                object-fit: contain;
              }

              .expense-report-print-receipt--portrait .expense-report-print-receipt-image {
                max-height: 118mm;
              }

              .expense-report-print-receipt--square .expense-report-print-receipt-image {
                max-height: 90mm;
              }

              .expense-report-print-receipt--landscape .expense-report-print-receipt-image {
                max-height: 72mm;
              }
            }
          `,
        }}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ExpenseReportDetailModal;
