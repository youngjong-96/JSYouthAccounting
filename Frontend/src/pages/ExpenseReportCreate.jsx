import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload, X, Save, Send, Loader2, ImageIcon, CheckCircle } from 'lucide-react';
import { createExpenseReport } from '../lib/expenseReportService';
import { uploadReceipt } from '../lib/uploadReceipt';

/* ───────── 한글 금액 변환 ───────── */
const KOREAN_UNITS = ['', '만', '억', '조'];
const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const KOREAN_SUBUNITS = ['', '십', '백', '천'];

function numberToKorean(n) {
  if (n === 0) return '영';
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

/* ───────── 빈 항목 행 생성 ───────── */
const emptyItem = () => ({
  account_category: '',
  description: '',
  month_period: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
});

/* ───────── 오늘 날짜 YYYY-MM-DD ───────── */
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ───────── 날짜 → 한글 포맷 ───────── */
function formatDateKorean(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

/* ========================================= */
/*         ExpenseReportCreate Component     */
/* ========================================= */
const ExpenseReportCreate = () => {
  const navigate = useNavigate();

  // 결의서 메인 정보
  const [resolutionDate, setResolutionDate] = useState(todayStr());
  const [bankAccount, setBankAccount] = useState('');
  const [claimDate, setClaimDate] = useState(todayStr());

  // 항목 행들
  const [items, setItems] = useState([emptyItem(), emptyItem(), emptyItem()]);

  // 영수증 이미지
  const [receiptFiles, setReceiptFiles] = useState([]); // File[]
  const [receiptPreviews, setReceiptPreviews] = useState([]); // {file, preview}[]

  // UI 상태
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  /* ─── 항목 변경 ─── */
  const updateItem = useCallback((index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      // 수량 * 단가 → 금액 자동 계산
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? Number(value) || 0 : Number(copy[index].quantity) || 0;
        const price = field === 'unit_price' ? Number(value) || 0 : Number(copy[index].unit_price) || 0;
        copy[index].amount = qty * price;
      }
      return copy;
    });
  }, []);

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  /* ─── 합계 계산 ─── */
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalKorean = totalAmount > 0 ? numberToKorean(totalAmount) + ' 원정' : '';

  /* ─── 영수증 이미지 선택 ─── */
  const handleReceiptSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setReceiptFiles(prev => [...prev, ...files]);
    setReceiptPreviews(prev => [...prev, ...newPreviews]);

    // input 초기화
    e.target.value = '';
  };

  const removeReceipt = (index) => {
    URL.revokeObjectURL(receiptPreviews[index].preview);
    setReceiptFiles(prev => prev.filter((_, i) => i !== index));
    setReceiptPreviews(prev => prev.filter((_, i) => i !== index));
  };

  /* ─── 유효성 검사 ─── */
  const validateForm = () => {
    if (!resolutionDate) {
      alert('결의일자를 입력해주세요.');
      return false;
    }
    const validItems = items.filter(item => item.account_category.trim() && item.description.trim());
    if (validItems.length === 0) {
      alert('최소 1개 이상의 항목을 입력해주세요.');
      return false;
    }
    if (totalAmount <= 0) {
      alert('금액이 0원입니다. 항목을 확인해주세요.');
      return false;
    }
    return true;
  };

  /* ─── 저장 / 제출 ─── */
  const handleSave = async (status = 'draft') => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // 1. 유효한 항목만 필터링
      const validItems = items.filter(item => item.account_category.trim() && item.description.trim());

      // 2. 임시 ID 생성 (영수증 업로드용)
      const tempId = crypto.randomUUID();

      // 3. 영수증 업로드
      let uploadedReceipts = [];
      if (receiptFiles.length > 0) {
        const uploadPromises = receiptFiles.map(file => uploadReceipt(file, tempId));
        uploadedReceipts = await Promise.all(uploadPromises);
      }

      // 4. 결의서 저장
      const report = await createExpenseReport(
        {
          resolution_date: resolutionDate,
          total_amount: totalAmount,
          bank_account: bankAccount || null,
          claim_date: claimDate || null,
          status,
        },
        validItems,
        uploadedReceipts
      );

      setSuccessMessage(status === 'draft' ? '임시 저장되었습니다.' : '제출되었습니다.');
      setTimeout(() => {
        navigate('/expense');
      }, 1500);
    } catch (error) {
      console.error('저장 실패:', error);
      alert(`저장에 실패했습니다: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  /* ────────── 렌더 ────────── */
  return (
    <div className="max-w-5xl mx-auto">
      {/* 성공 메시지 토스트 */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-[slideIn_0.3s_ease-out]">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* ── 결의서 헤더 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 제목 바 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 sm:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center tracking-widest">
            지 출 결 의 서
          </h1>
        </div>

        <div className="p-5 sm:p-8 space-y-8">
          {/* ── 결의일자 & 금액 ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 결의일자 */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <label className="block text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                결의일자
              </label>
              <input
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                className="w-full px-4 py-3 text-lg font-medium border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white transition-colors"
              />
              <p className="text-sm text-gray-400 mt-2">{formatDateKorean(resolutionDate)}</p>
            </div>

            {/* 금액 (자동 계산) */}
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
              <label className="block text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wide">
                금 액
              </label>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                ₩ {totalAmount.toLocaleString()}
              </div>
              {totalKorean && (
                <p className="text-sm text-blue-600 font-medium mt-2">
                  {totalKorean}
                </p>
              )}
            </div>
          </div>

          {/* ── 항목 테이블 ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">지출 항목</h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                행 추가
              </button>
            </div>

            {/* 데스크톱 테이블 */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="px-3 py-3 text-left font-semibold w-[130px]">계정과목</th>
                    <th className="px-3 py-3 text-left font-semibold">적요</th>
                    <th className="px-3 py-3 text-center font-semibold w-[70px]">월분</th>
                    <th className="px-3 py-3 text-center font-semibold w-[70px]">수량</th>
                    <th className="px-3 py-3 text-right font-semibold w-[110px]">단가</th>
                    <th className="px-3 py-3 text-right font-semibold w-[110px]">금액</th>
                    <th className="px-3 py-3 text-center font-semibold w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={item.account_category}
                          onChange={(e) => updateItem(idx, 'account_category', e.target.value)}
                          placeholder="간식비"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-white"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="이솝목장 간식비 구입(3/5)"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-white"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.month_period}
                          onChange={(e) => updateItem(idx, 'month_period', e.target.value)}
                          placeholder="3"
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-center bg-white"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          min="1"
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-center bg-white"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-right bg-white"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-right font-semibold text-gray-800 border border-gray-100">
                          {(Number(item.amount) || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan="5" className="px-4 py-3 text-right font-bold text-gray-700">
                      합 계
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-extrabold text-blue-700">
                        {totalAmount.toLocaleString()}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 모바일 카드 뷰 */}
            <div className="md:hidden space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      항목 {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">계정과목</label>
                      <input
                        type="text"
                        value={item.account_category}
                        onChange={(e) => updateItem(idx, 'account_category', e.target.value)}
                        placeholder="간식비"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">월분</label>
                      <input
                        type="number"
                        value={item.month_period}
                        onChange={(e) => updateItem(idx, 'month_period', e.target.value)}
                        placeholder="3"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">적요</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="이솝목장 간식비 구입(3/5)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">수량</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">단가</label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">금액</label>
                      <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-right font-semibold text-gray-800 border border-gray-100">
                        {(Number(item.amount) || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 모바일 합계 */}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex justify-between items-center">
                <span className="font-bold text-gray-700">합 계</span>
                <span className="text-xl font-extrabold text-blue-700">
                  ₩ {totalAmount.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                항목 추가
              </button>
            </div>
          </div>

          {/* ── 비고 (계좌번호) ── */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              비고 (계좌번호)
            </label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="예: 김민아 토스뱅크 000-00-00000"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-base bg-white transition-colors"
            />
          </div>

          {/* ── 청구일자 ── */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              청구일자
            </label>
            <input
              type="date"
              value={claimDate}
              onChange={(e) => setClaimDate(e.target.value)}
              className="w-full px-4 py-3 text-lg font-medium border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white transition-colors"
            />
            <p className="text-sm text-gray-400 mt-2">{formatDateKorean(claimDate)}</p>
          </div>

          {/* ── 영수증 이미지 첨부 ── */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              영수증 이미지 첨부
            </label>

            {/* 업로드 영역 */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
              <div className="flex flex-col items-center justify-center py-4">
                <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                <p className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors">
                  <span className="font-semibold">클릭하여 이미지 선택</span> 또는 드래그 앤 드롭
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (최대 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleReceiptSelect}
                className="hidden"
              />
            </label>

            {/* 미리보기 그리드 */}
            {receiptPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {receiptPreviews.map((item, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                    <img
                      src={item.preview}
                      alt={`영수증 ${idx + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeReceipt(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                      <p className="text-[10px] text-white truncate">{item.file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {receiptPreviews.length > 0 && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                {receiptPreviews.length}개의 영수증 이미지 첨부됨
              </p>
            )}
          </div>

          {/* ── 버튼 영역 ── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/expense')}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              취소
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              임시 저장
            </button>
            <button
              type="button"
              onClick={() => handleSave('submitted')}
              disabled={saving}
              className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-200 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 hover:shadow-lg hover:-translate-y-0.5"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              제출하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseReportCreate;
