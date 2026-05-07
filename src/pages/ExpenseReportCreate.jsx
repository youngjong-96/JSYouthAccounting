import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  createExpenseReport,
  getExpenseReport,
  updateExpenseReport,
} from '../lib/expenseReportService';
import { uploadReceipt } from '../lib/uploadReceipt';
import { useAuth } from '../context/AuthContext';
import guideImg from '../assets/guide.png';

/* 큰 금액을 한글 표기로 변환할 때 사용하는 단위입니다. */
const KOREAN_UNITS = ['', '만', '억', '조'];

/* 숫자 한 자리 표기를 위한 한글 숫자입니다. */
const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

/* 네 자리 묶음 안에서 사용하는 하위 단위입니다. */
const KOREAN_SUBUNITS = ['', '십', '백', '천'];

/* 입력 필드 공통 스타일입니다. */
const inputCls = 'w-full px-3 py-2.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-300 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]';

/* 라벨 공통 스타일입니다. */
const labelCls = 'block text-xs font-medium text-navy-400 mb-1.5 uppercase tracking-wider';

/* 계정과목 선택 목록입니다. */
const ACCOUNT_CATEGORIES = [
  '간식비',
  '강사사례비',
  '경조사비',
  '고정비',
  '기타비',
  '나들이비',
  '도서구입비',
  '비품구입비',
  '선교비',
  '선물지원비',
  '시상비',
  '식비',
  '심방비',
  '유류비',
  '음료비',
  '지원비',
  '진행비',
  '홍보비',
  '활동비'
];

/**
 * 숫자를 한글 금액 문자열로 변환합니다.
 * @param {number} amount
 * @returns {string}
 */
function numberToKorean(amount) {
  if (!amount) {
    return '영';
  }

  let remaining = Math.floor(amount);
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
 * 새 항목의 기본값을 생성합니다.
 * @returns {object}
 */
function emptyItem() {
  return {
    account_category: '',
    description: '',
    month_period: '',
    quantity: 1,
    unit_price: 0,
    amount: 0,
  };
}

/**
 * 오늘 날짜를 input[type=date] 형식으로 반환합니다.
 * @returns {string}
 */
function todayStr() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 날짜 문자열을 한글 표시용 형식으로 변환합니다.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDateKorean(dateStr) {
  if (!dateStr) {
    return '';
  }

  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
}

/**
 * DB에서 불러온 항목을 입력폼 구조로 정리합니다.
 * @param {object} item
 * @returns {object}
 */
function normalizeItem(item = {}) {
  const quantity = item.quantity ?? 1;
  const unitPrice = item.unit_price ?? 0;

  return {
    account_category: item.account_category || '',
    description: item.description || '',
    month_period: item.month_period || '',
    quantity,
    unit_price: unitPrice,
    amount: Number(item.amount ?? (Number(quantity) || 0) * (Number(unitPrice) || 0)) || 0,
  };
}

/**
 * 결의서 상태값을 비교용 문자열로 정규화합니다.
 * @param {string | null | undefined} status
 * @returns {string}
 */
function normalizeReportStatus(status) {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

/**
 * 다시 수정 가능한 초안 상태인지 판별합니다.
 * @param {string | null | undefined} status
 * @returns {boolean}
 */
function isDraftReportStatus(status) {
  return normalizeReportStatus(status) === 'draft';
}

/**
 * 항목에 임시저장할 만한 입력값이 있는지 확인합니다.
 * @param {object} item
 * @returns {boolean}
 */
function hasItemContent(item) {
  return Boolean(
    item.account_category?.trim()
    || item.description?.trim()
    || item.month_period
    || Number(item.quantity) > 1
    || Number(item.unit_price) > 0
    || Number(item.amount) > 0,
  );
}

/**
 * 저장 상태에 맞게 항목 목록을 정리합니다.
 * @param {Array<object>} items
 * @param {'draft' | 'submitted'} status
 * @returns {Array<object>}
 */
function prepareItemsForSave(items, status) {
  const sourceItems = status === 'draft'
    ? items.filter(hasItemContent)
    : items.filter((item) => item.account_category.trim() && item.description.trim());

  return sourceItems.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;

    return {
      account_category: item.account_category.trim(),
      description: item.description.trim(),
      month_period: item.month_period || null,
      quantity,
      unit_price: unitPrice,
      amount: Number(item.amount) || (quantity * unitPrice),
    };
  });
}

/**
 * 제출 전에 필수 입력값을 검증합니다.
 * @param {{ resolutionDate: string, items: Array<object>, totalAmount: number }} payload
 * @returns {boolean}
 */
function validateForSubmit({ resolutionDate, items, totalAmount }) {
  if (!resolutionDate) {
    alert('결의일자를 입력해주세요.');
    return false;
  }

  const hasCompleteItem = items.some(
    (item) => item.account_category.trim() && item.description.trim(),
  );

  if (!hasCompleteItem) {
    alert('최소 1개 이상의 항목을 입력해주세요.');
    return false;
  }

  const hasIncompleteItem = items.some(
    (item) => hasItemContent(item) && (!item.account_category.trim() || !item.description.trim()),
  );

  if (hasIncompleteItem) {
    alert('작성 중인 항목이 있습니다. 계정과목과 적요를 모두 입력한 뒤 제출해주세요.');
    return false;
  }

  if (totalAmount <= 0) {
    alert('금액이 0원입니다. 항목 금액을 확인해주세요.');
    return false;
  }

  return true;
}

/* ========================================= */
const ExpenseReportCreate = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(reportId);

  const [resolutionDate, setResolutionDate] = useState(todayStr());
  const [bankAccount, setBankAccount] = useState('');
  const [claimDate, setClaimDate] = useState(todayStr());
  const [items, setItems] = useState([emptyItem()]);
  const [existingReceipts, setExistingReceipts] = useState([]);
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [receiptPreviews, setReceiptPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(isEditMode);
  const [successMsg, setSuccessMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  /* 입력 항목을 수정하고 금액을 즉시 재계산합니다. */
  const updateItem = useCallback((index, field, value) => {
    setItems((prevItems) => {
      const nextItems = [...prevItems];
      const nextItem = { ...nextItems[index], [field]: value };

      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity'
          ? Number(value) || 0
          : Number(nextItem.quantity) || 0;
        const unitPrice = field === 'unit_price'
          ? Number(value) || 0
          : Number(nextItem.unit_price) || 0;

        nextItem.amount = quantity * unitPrice;
      }

      nextItems[index] = nextItem;
      return nextItems;
    });
  }, []);

  /**
   * 임시저장된 결의서를 불러와 폼에 채웁니다.
   * @returns {Promise<void>}
   */
  const loadDraftReport = useCallback(async () => {
    if (!reportId || !user?.id) {
      setLoadingDraft(false);
      return;
    }

    setLoadingDraft(true);

    try {
      const report = await getExpenseReport(reportId, { currentUserId: user.id });

      if (report.user_id !== user.id || !isDraftReportStatus(report.status)) {
        throw new Error('작성 중인 임시저장 문서만 수정할 수 있습니다.');
      }

      const sortedItems = [...(report.expense_items || [])].sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
      );

      setResolutionDate(report.resolution_date || todayStr());
      setBankAccount(report.bank_account || '');
      setClaimDate(report.claim_date || '');
      setItems(sortedItems.length > 0 ? sortedItems.map(normalizeItem) : [emptyItem()]);
      setExistingReceipts(
        (report.expense_receipts || []).map((receipt) => ({
          id: receipt.id,
          url: receipt.image_url,
          fileName: receipt.file_name || '영수증',
        })),
      );
    } catch (loadError) {
      alert(`결의서를 불러오지 못했습니다: ${loadError.message}`);
      navigate('/expense', { replace: true });
    } finally {
      setLoadingDraft(false);
    }
  }, [navigate, reportId, user?.id]);

  useEffect(() => {
    if (!isEditMode) {
      setLoadingDraft(false);
      return;
    }

    loadDraftReport();
  }, [isEditMode, loadDraftReport]);

  /* 항목 행을 추가합니다. */
  const addItem = () => {
    setItems((prevItems) => [...prevItems, emptyItem()]);
  };

  /* 선택한 항목 행을 삭제합니다. */
  const removeItem = (index) => {
    if (items.length <= 1) {
      return;
    }

    setItems((prevItems) => prevItems.filter((_, itemIndex) => itemIndex !== index));
  };

  /* 새 영수증 파일을 선택해 미리보기를 추가합니다. */
  const handleReceiptSelect = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    setReceiptFiles((prevFiles) => [...prevFiles, ...files]);
    setReceiptPreviews((prevPreviews) => [
      ...prevPreviews,
      ...files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);

    event.target.value = '';
  };

  /* 새로 첨부한 영수증 미리보기를 제거합니다. */
  const removeNewReceipt = (index) => {
    const targetPreview = receiptPreviews[index];

    if (targetPreview?.preview) {
      URL.revokeObjectURL(targetPreview.preview);
    }

    setReceiptFiles((prevFiles) => prevFiles.filter((_, fileIndex) => fileIndex !== index));
    setReceiptPreviews((prevPreviews) => prevPreviews.filter((_, previewIndex) => previewIndex !== index));
  };

  /* 기존에 저장된 영수증을 목록에서 제외합니다. */
  const removeExistingReceipt = (receiptId) => {
    setExistingReceipts((prevReceipts) => prevReceipts.filter((receipt) => receipt.id !== receiptId));
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const totalKorean = totalAmount > 0 ? `${numberToKorean(totalAmount)}정` : '';
  const allReceipts = [
    ...existingReceipts.map((receipt) => ({
      key: `existing-${receipt.id}`,
      name: receipt.fileName,
      preview: receipt.url,
      onRemove: () => removeExistingReceipt(receipt.id),
    })),
    ...receiptPreviews.map((receipt, index) => ({
      key: `new-${index}`,
      name: receipt.file.name,
      preview: receipt.preview,
      onRemove: () => removeNewReceipt(index),
    })),
  ];

  /**
   * 현재 폼 내용을 임시저장하거나 제출합니다.
   * @param {'draft' | 'submitted'} status
   * @returns {Promise<void>}
   */
  const handleSave = async (status = 'draft') => {
    if (status === 'submitted' && !validateForSubmit({ resolutionDate, items, totalAmount })) {
      return;
    }

    setSaving(true);

    try {
      const nextItems = prepareItemsForSave(items, status);
      const uploadTargetId = reportId || crypto.randomUUID();
      const uploadedReceipts = receiptFiles.length > 0
        ? await Promise.all(receiptFiles.map((file) => uploadReceipt(file, uploadTargetId)))
        : [];
      const savedReceipts = [
        ...existingReceipts.map((receipt) => ({
          url: receipt.url,
          fileName: receipt.fileName,
        })),
        ...uploadedReceipts,
      ];
      const reportPayload = {
        resolution_date: resolutionDate || null,
        total_amount: totalAmount,
        bank_account: bankAccount || null,
        claim_date: claimDate || null,
        status,
      };

      if (isEditMode) {
        await updateExpenseReport(reportId, reportPayload, nextItems, savedReceipts);
      } else {
        await createExpenseReport(reportPayload, nextItems, uploadedReceipts);
      }

      setSuccessMsg(status === 'draft' ? '임시 저장되었습니다.' : '제출되었습니다.');
      setTimeout(() => navigate('/expense'), 1200);
    } catch (saveError) {
      alert(`저장에 실패했습니다: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loadingDraft) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-9 h-9 text-navy-400 animate-spin mb-3" />
        <p className="text-sm text-mist-500">임시저장 문서를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="pb-10 animate-slideUp">
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl animate-fadeIn text-sm font-medium">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/expense')}
          className="p-2 text-mist-400 hover:text-navy-500 hover:bg-white rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-navy-500">
            {isEditMode ? '임시저장 결의서 수정' : '지출결의서 작성'}
          </h1>
          <p className="text-xs text-mist-500">
            {isEditMode ? '임시저장한 내용을 이어서 수정할 수 있습니다.' : '항목을 입력하고 제출하거나 임시저장해주세요.'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-navy-500 rounded-2xl px-5 py-4 text-center relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-[0.5em] relative z-10">
            지 출 결 의 서
          </h2>
        </div>

        {isEditMode && (
          <div className="bg-gold-50 border border-gold-200 rounded-2xl px-4 py-3 text-sm text-gold-700">
            임시저장 상태의 결의서를 불러왔습니다. 내용을 수정한 뒤 다시 임시저장하거나 제출할 수 있습니다.
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-gold-300 hover:border-gold-400 hover:bg-gold-50 text-gold-600 hover:text-gold-700 font-semibold rounded-2xl transition-all text-sm"
        >
          <BookOpen className="w-4 h-4" />
          지출결의서 작성 가이드 보기
        </button>

        <div className="bg-white rounded-2xl border border-mist-200 p-4">
          <label className={labelCls}>결의일자</label>
          <input
            type="date"
            value={resolutionDate}
            onChange={(event) => setResolutionDate(event.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-mist-400 mt-1.5">{formatDateKorean(resolutionDate)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-mist-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-mist-100">
            <h3 className="text-sm font-semibold text-navy-500">지출 항목</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold-400 hover:bg-gold-500 active:bg-gold-600 text-navy-700 text-sm font-bold rounded-xl transition-all shadow-sm shadow-gold-400/30"
            >
              <Plus className="w-4 h-4" />
              항목 추가
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100 border-b border-mist-200 text-xs text-mist-500">
                  <th className="px-3 py-2.5 text-left font-semibold w-[120px]">계정과목</th>
                  <th className="px-3 py-2.5 text-left font-semibold">적요</th>
                  <th className="px-3 py-2.5 text-center font-semibold w-[70px]">월분</th>
                  <th className="px-3 py-2.5 text-center font-semibold w-[70px]">수량</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-[100px]">단가</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-[100px]">금액</th>
                  <th className="px-3 py-2.5 w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {items.map((item, index) => (
                  <tr key={`${item.account_category}-${index}`} className="hover:bg-cream-100/50 group">
                    <td className="px-2 py-2">
                      <select
                        value={item.account_category}
                        onChange={(event) => updateItem(index, 'account_category', event.target.value)}
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-navy-500 focus:outline-none focus:border-gold-400 bg-white appearance-none cursor-pointer"
                      >
                        <option value="">선택</option>
                        {ACCOUNT_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) => updateItem(index, 'description', event.target.value)}
                        placeholder="예: 간식비 구입(3/5)"
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-navy-500 placeholder-mist-300 focus:outline-none focus:border-gold-400 bg-white"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.month_period}
                        onChange={(event) => updateItem(index, 'month_period', event.target.value)}
                        placeholder="3"
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-center text-navy-500 focus:outline-none focus:border-gold-400 bg-white"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-center text-navy-500 focus:outline-none focus:border-gold-400 bg-white"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-right text-navy-500 focus:outline-none focus:border-gold-400 bg-white"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="px-2 py-1.5 bg-cream-100 rounded-lg text-xs text-right font-semibold text-navy-500 tabular-nums border border-mist-200">
                        {(Number(item.amount) || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        className="p-1.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy-500 bg-cream-100">
                  <td colSpan="5" className="px-4 py-3 text-right text-sm font-bold text-navy-500">총액</td>
                  <td className="px-4 py-3 text-right font-extrabold text-base text-navy-500 tabular-nums">
                    {totalAmount.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="md:hidden divide-y divide-mist-100">
            {items.map((item, index) => (
              <div key={`${item.account_category}-${index}`} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gold-500 bg-gold-50 px-2.5 py-1 rounded-lg border border-gold-100">
                    항목 {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>계정과목</label>
                    <select
                      value={item.account_category}
                      onChange={(event) => updateItem(index, 'account_category', event.target.value)}
                      className={`${inputCls} appearance-none cursor-pointer`}
                    >
                      <option value="">선택해주세요</option>
                      {ACCOUNT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>월분</label>
                    <input
                      type="number"
                      value={item.month_period}
                      onChange={(event) => updateItem(index, 'month_period', event.target.value)}
                      placeholder="3"
                      className={`${inputCls} text-center`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>적요</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) => updateItem(index, 'description', event.target.value)}
                    placeholder="예: 간식비 구입(3/5)"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>수량</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                      className={`${inputCls} text-center`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>단가</label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                      placeholder="0"
                      className={`${inputCls} text-right`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>금액</label>
                    <div className="w-full px-3 py-2.5 bg-cream-100 border-2 border-mist-200 rounded-xl text-right font-semibold text-sm text-navy-500 tabular-nums">
                      {(Number(item.amount) || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="p-4 space-y-3">
              <button
                type="button"
                onClick={addItem}
                className="w-full py-3 bg-gold-400 hover:bg-gold-500 active:bg-gold-600 text-navy-700 text-sm font-bold rounded-xl transition-all shadow-sm shadow-gold-400/30 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                항목 추가
              </button>
              <div className="bg-navy-500 rounded-xl p-3.5 flex justify-between items-center">
                <span className="text-sm font-bold text-white">총액</span>
                <span className="text-lg font-extrabold text-gold-400 tabular-nums">
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {totalKorean && (
            <div className="px-4 py-3 border-t border-mist-100 bg-white text-right text-xs text-mist-500">
              일금 {totalKorean}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-mist-200 p-4">
          <label className={labelCls}>비고 (계좌번호)</label>
          <input
            type="text"
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
            placeholder="예: 홍길동 카카오뱅크 000-00-00000"
            className={inputCls}
          />
        </div>

        <div className="bg-white rounded-2xl border border-mist-200 p-4">
          <label className={labelCls}>청구일자</label>
          <input
            type="date"
            value={claimDate}
            onChange={(event) => setClaimDate(event.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-mist-400 mt-1.5">{formatDateKorean(claimDate)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-mist-200 p-4">
          <label className={labelCls}>영수증 이미지 첨부</label>

          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-mist-200 rounded-xl cursor-pointer hover:border-gold-400 hover:bg-gold-50/30 transition-all group">
            <Upload className="w-7 h-7 text-mist-300 group-hover:text-gold-400 transition-colors mb-1.5" />
            <p className="text-sm text-mist-400 group-hover:text-gold-500 transition-colors">
              <span className="font-semibold">클릭하여 이미지 선택</span>
            </p>
            <p className="text-xs text-mist-300 mt-0.5">JPG, PNG, WEBP, GIF</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleReceiptSelect}
              className="hidden"
            />
          </label>

          {allReceipts.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
                {allReceipts.map((receipt) => (
                  <div key={receipt.key} className="relative group rounded-xl overflow-hidden border border-mist-200">
                    <img src={receipt.preview} alt={receipt.name} className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={receipt.onRemove}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                      <p className="text-[10px] text-white truncate">{receipt.name}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-mist-400 mt-2 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                총 {allReceipts.length}개의 영수증이 첨부되었습니다.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="py-3.5 bg-white border-2 border-mist-200 text-navy-500 font-semibold rounded-xl hover:border-navy-300 hover:bg-cream-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            임시 저장
          </button>
          <button
            type="button"
            onClick={() => handleSave('submitted')}
            disabled={saving}
            className="py-3.5 bg-navy-500 hover:bg-navy-600 active:bg-navy-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-navy-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            제출하기
          </button>
        </div>
      </div>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowGuide(false)}
        >
          <div className="fixed inset-0 bg-navy-900/70 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col animate-slideUp"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-navy-400" />
                <h3 className="text-sm font-bold text-navy-500">지출결의서 작성 가이드</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 text-mist-400 hover:text-navy-500 hover:bg-cream-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <img
                src={guideImg}
                alt="지출결의서 작성 가이드"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseReportCreate;
