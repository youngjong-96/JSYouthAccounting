import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload, X, Save, Send, Loader2, ImageIcon, CheckCircle, ChevronLeft } from 'lucide-react';
import { createExpenseReport } from '../lib/expenseReportService';
import { uploadReceipt } from '../lib/uploadReceipt';

/* ── 한글 금액 변환 ── */
const KOREAN_UNITS    = ['', '만', '억', '조'];
const KOREAN_DIGITS   = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const KOREAN_SUBUNITS = ['', '십', '백', '천'];

function numberToKorean(n) {
  if (n === 0) return '영';
  let result = '', unitIndex = 0;
  while (n > 0) {
    const chunk = n % 10000;
    if (chunk > 0) {
      let chunkStr = '', c = chunk;
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10;
        if (d > 0) chunkStr = KOREAN_DIGITS[d] + KOREAN_SUBUNITS[i] + chunkStr;
        c = Math.floor(c / 10);
      }
      result = chunkStr + KOREAN_UNITS[unitIndex] + result;
    }
    n = Math.floor(n / 10000); unitIndex++;
  }
  return result;
}

const emptyItem = () => ({ account_category: '', description: '', month_period: '', quantity: 1, unit_price: 0, amount: 0 });
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function formatDateKorean(s) { if (!s) return ''; const [y,m,d] = s.split('-'); return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`; }

const inputCls = "w-full px-3 py-2.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-300 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]";
const labelCls = "block text-xs font-medium text-navy-400 mb-1.5 uppercase tracking-wider";

/* ========================================= */
const ExpenseReportCreate = () => {
  const navigate = useNavigate();
  const [resolutionDate, setResolutionDate] = useState(todayStr());
  const [bankAccount, setBankAccount]       = useState('');
  const [claimDate, setClaimDate]           = useState(todayStr());
  const [items, setItems]                   = useState([emptyItem()]);
  const [receiptFiles, setReceiptFiles]     = useState([]);
  const [receiptPreviews, setReceiptPreviews] = useState([]);
  const [saving, setSaving]                 = useState(false);
  const [successMsg, setSuccessMsg]         = useState('');

  const updateItem = useCallback((idx, field, val) => {
    setItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      if (field === 'quantity' || field === 'unit_price') {
        const qty   = field === 'quantity'   ? Number(val)||0 : Number(copy[idx].quantity)||0;
        const price = field === 'unit_price' ? Number(val)||0 : Number(copy[idx].unit_price)||0;
        copy[idx].amount = qty * price;
      }
      return copy;
    });
  }, []);

  const addItem    = () => setItems(p => [...p, emptyItem()]);
  const removeItem = (i) => { if (items.length > 1) setItems(p => p.filter((_,j) => j !== i)); };

  const totalAmount = items.reduce((s, item) => s + (Number(item.amount)||0), 0);
  const totalKorean = totalAmount > 0 ? numberToKorean(totalAmount) + ' 원정' : '';

  const handleReceiptSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setReceiptFiles(p => [...p, ...files]);
    setReceiptPreviews(p => [...p, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
    e.target.value = '';
  };

  const removeReceipt = (i) => {
    URL.revokeObjectURL(receiptPreviews[i].preview);
    setReceiptFiles(p => p.filter((_,j) => j !== i));
    setReceiptPreviews(p => p.filter((_,j) => j !== i));
  };

  const validate = () => {
    if (!resolutionDate) { alert('결의일자를 입력해주세요.'); return false; }
    if (items.filter(it => it.account_category.trim() && it.description.trim()).length === 0) {
      alert('최소 1개 이상의 항목을 입력해주세요.'); return false;
    }
    if (totalAmount <= 0) { alert('금액이 0원입니다. 항목을 확인해주세요.'); return false; }
    return true;
  };

  const handleSave = async (status = 'draft') => {
    if (!validate()) return;
    setSaving(true);
    try {
      const validItems = items.filter(it => it.account_category.trim() && it.description.trim());
      const tempId = crypto.randomUUID();
      const uploadedReceipts = receiptFiles.length > 0
        ? await Promise.all(receiptFiles.map(f => uploadReceipt(f, tempId)))
        : [];
      await createExpenseReport(
        { resolution_date: resolutionDate, total_amount: totalAmount, bank_account: bankAccount||null, claim_date: claimDate||null, status },
        validItems, uploadedReceipts
      );
      setSuccessMsg(status === 'draft' ? '임시 저장되었습니다.' : '제출되었습니다.');
      setTimeout(() => navigate('/expense'), 1500);
    } catch (err) {
      alert(`저장에 실패했습니다: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-10 animate-slideUp">

      {/* ── 토스트 ── */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl animate-fadeIn text-sm font-medium">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* ── 페이지 헤더 ── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/expense')}
          className="p-2 text-mist-400 hover:text-navy-500 hover:bg-white rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-navy-500">지출결의서 작성</h1>
          <p className="text-xs text-mist-500">항목을 입력하고 제출해주세요</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── 결의서 제목 ── */}
        <div className="bg-navy-500 rounded-2xl px-5 py-4 text-center relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-[0.5em] relative z-10">
            지 출 결 의 서
          </h2>
        </div>

        {/* ── 결의일자 ── */}
        <div className="bg-white rounded-2xl border border-mist-200 p-4">
          <label className={labelCls}>결의일자</label>
          <input
            type="date"
            value={resolutionDate}
            onChange={e => setResolutionDate(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-mist-400 mt-1.5">{formatDateKorean(resolutionDate)}</p>
        </div>

        {/* ── 지출 항목 ── */}
        <div className="bg-white rounded-2xl border border-mist-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-mist-100">
            <h3 className="text-sm font-semibold text-navy-500">지출 항목</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold-400 hover:bg-gold-500 active:bg-gold-600 text-navy-700 text-sm font-bold rounded-xl transition-all shadow-sm shadow-gold-400/30"
            >
              <Plus className="w-4 h-4" /> 행 추가
            </button>
          </div>

          {/* 데스크톱 테이블 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100 border-b border-mist-200 text-xs text-mist-500">
                  <th className="px-3 py-2.5 text-left font-semibold w-[120px]">계정과목</th>
                  <th className="px-3 py-2.5 text-left font-semibold">적요</th>
                  <th className="px-3 py-2.5 text-center font-semibold w-[65px]">월분</th>
                  <th className="px-3 py-2.5 text-center font-semibold w-[65px]">수량</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-[100px]">단가</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-[100px]">금액</th>
                  <th className="px-3 py-2.5 w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-cream-100/50 group">
                    <td className="px-2 py-2">
                      <input type="text" value={item.account_category}
                        onChange={e => updateItem(idx,'account_category',e.target.value)}
                        placeholder="간식비"
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-navy-500 placeholder-mist-300 focus:outline-none focus:border-gold-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={item.description}
                        onChange={e => updateItem(idx,'description',e.target.value)}
                        placeholder="간식비 구입(3/5)"
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-navy-500 placeholder-mist-300 focus:outline-none focus:border-gold-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={item.month_period}
                        onChange={e => updateItem(idx,'month_period',e.target.value)}
                        placeholder="3"
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-center text-navy-500 focus:outline-none focus:border-gold-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={item.quantity} min="1"
                        onChange={e => updateItem(idx,'quantity',e.target.value)}
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-center text-navy-500 focus:outline-none focus:border-gold-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={item.unit_price}
                        onChange={e => updateItem(idx,'unit_price',e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-mist-200 rounded-lg text-xs text-right text-navy-500 focus:outline-none focus:border-gold-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <div className="px-2 py-1.5 bg-cream-100 rounded-lg text-xs text-right font-semibold text-navy-500 tabular-nums border border-mist-200">
                        {(Number(item.amount)||0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeItem(idx)} disabled={items.length<=1}
                        className="p-1.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy-500 bg-cream-100">
                  <td colSpan="5" className="px-4 py-3 text-right text-sm font-bold text-navy-500">합 계</td>
                  <td className="px-4 py-3 text-right font-extrabold text-base text-navy-500 tabular-nums">
                    {totalAmount.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden divide-y divide-mist-100">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gold-500 bg-gold-50 px-2.5 py-1 rounded-lg border border-gold-100">
                    항목 {idx + 1}
                  </span>
                  <button type="button" onClick={() => removeItem(idx)} disabled={items.length<=1}
                    className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>계정과목</label>
                    <input type="text" value={item.account_category}
                      onChange={e => updateItem(idx,'account_category',e.target.value)}
                      placeholder="간식비" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>월분</label>
                    <input type="number" value={item.month_period}
                      onChange={e => updateItem(idx,'month_period',e.target.value)}
                      placeholder="3" className={`${inputCls} text-center`} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>적요</label>
                  <input type="text" value={item.description}
                    onChange={e => updateItem(idx,'description',e.target.value)}
                    placeholder="간식비 구입(3/5)" className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>수량</label>
                    <input type="number" value={item.quantity} min="1"
                      onChange={e => updateItem(idx,'quantity',e.target.value)}
                      className={`${inputCls} text-center`} />
                  </div>
                  <div>
                    <label className={labelCls}>단가</label>
                    <input type="number" value={item.unit_price}
                      onChange={e => updateItem(idx,'unit_price',e.target.value)}
                      placeholder="0" className={`${inputCls} text-right`} />
                  </div>
                  <div>
                    <label className={labelCls}>금액</label>
                    <div className="w-full px-3 py-2.5 bg-cream-100 border-2 border-mist-200 rounded-xl text-right font-semibold text-sm text-navy-500 tabular-nums">
                      {(Number(item.amount)||0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* 모바일 행추가 + 합계 */}
            <div className="p-4 space-y-3">
              <button type="button" onClick={addItem}
                className="w-full py-3 bg-gold-400 hover:bg-gold-500 active:bg-gold-600 text-navy-700 text-sm font-bold rounded-xl transition-all shadow-sm shadow-gold-400/30 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> 항목 추가
              </button>
              <div className="bg-navy-500 rounded-xl p-3.5 flex justify-between items-center">
                <span className="text-sm font-bold text-white">합 계</span>
                <span className="text-lg font-extrabold text-gold-400 tabular-nums">
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 비고 (계좌번호) ── */}
        <div className="bg-white rounded-2xl border border-mist-200 p-4">
          <label className={labelCls}>비고 (계좌번호)</label>
          <input
            type="text"
            value={bankAccount}
            onChange={e => setBankAccount(e.target.value)}
            placeholder="예: 김민아 토스뱅크 000-00-00000"
            className={inputCls}
          />
        </div>

        {/* ── 청구일자 ── */}
        <div className="bg-white rounded-2xl border border-mist-200 p-4">
          <label className={labelCls}>청구일자</label>
          <input
            type="date"
            value={claimDate}
            onChange={e => setClaimDate(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-mist-400 mt-1.5">{formatDateKorean(claimDate)}</p>
        </div>

        {/* ── 영수증 이미지 ── */}
        <div className="bg-white rounded-2xl border border-mist-200 p-4">
          <label className={labelCls}>영수증 이미지 첨부</label>

          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-mist-200 rounded-xl cursor-pointer hover:border-gold-400 hover:bg-gold-50/30 transition-all group">
            <Upload className="w-7 h-7 text-mist-300 group-hover:text-gold-400 transition-colors mb-1.5" />
            <p className="text-sm text-mist-400 group-hover:text-gold-500 transition-colors">
              <span className="font-semibold">클릭하여 이미지 선택</span>
            </p>
            <p className="text-xs text-mist-300 mt-0.5">JPG, PNG, WEBP (최대 5MB)</p>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleReceiptSelect} className="hidden" />
          </label>

          {receiptPreviews.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
                {receiptPreviews.map((item, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-mist-200">
                    <img src={item.preview} alt={`영수증 ${idx+1}`} className="w-full h-28 object-cover" />
                    <button type="button" onClick={() => removeReceipt(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                      <p className="text-[10px] text-white truncate">{item.file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-mist-400 mt-2 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                {receiptPreviews.length}개의 영수증 첨부됨
              </p>
            </>
          )}
        </div>

        {/* ── 버튼 ── */}
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
    </div>
  );
};

export default ExpenseReportCreate;
