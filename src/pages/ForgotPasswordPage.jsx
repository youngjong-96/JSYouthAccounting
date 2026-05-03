import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Loader2, CheckCircle2, ChevronLeft, ArrowRight } from 'lucide-react';

/**
 * 비밀번호 재설정 메일 발송 화면을 렌더링합니다.
 * @returns {JSX.Element}
 */
const ForgotPasswordPage = () => {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  /**
   * 입력한 이메일로 비밀번호 재설정 메일을 발송합니다.
   * @param {React.FormEvent<HTMLFormElement>} e
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSent(true);
    } catch {
      setError('이메일 발송에 실패했습니다. 이메일 주소를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  /* ── 발송 완료 화면 ── */
  if (sent) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center px-6 animate-fadeIn">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy-500 mb-3">이메일을 확인해주세요</h2>
          <p className="text-mist-500 text-sm leading-relaxed mb-8">
            <span className="font-semibold text-navy-500">{email}</span>로<br />
            비밀번호 재설정 링크를 발송했습니다.<br />
            이메일의 링크를 클릭해 새 비밀번호를 설정하세요.
          </p>
          <div className="bg-gold-50 border border-gold-200 rounded-2xl p-5 mb-8 text-left">
            <p className="text-xs font-semibold text-gold-600 uppercase tracking-wider mb-2">안내사항</p>
            <ul className="text-sm text-navy-400 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-gold-400 mt-0.5">•</span>
                링크는 1시간 동안 유효합니다
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-400 mt-0.5">•</span>
                스팸 메일함도 확인해주세요
              </li>
            </ul>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-400 hover:text-navy-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  /* ── 이메일 입력 폼 ── */
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col safe-top safe-bottom">

      {/* 상단 헤더 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-500 via-navy-600 to-navy-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold-400" />
          <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-gold-400" />
        </div>
        <div className="relative px-6 pt-14 pb-10 sm:pt-16 sm:pb-12">
          <Link
            to="/login"
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors mb-6 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            로그인으로 돌아가기
          </Link>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
            <Mail className="w-7 h-7 text-gold-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">비밀번호 찾기</h1>
          <p className="mt-1 text-sm text-white/60 font-light">가입 이메일로 재설정 링크를 발송합니다</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-8 sm:h-10 fill-cream-100">
            <path d="M0,0 C480,60 960,60 1440,0 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </div>

      {/* 폼 영역 */}
      <div className="flex-1 px-6 py-8 sm:px-8">
        <div className="w-full max-w-sm mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                이메일 주소 <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]"
                placeholder="가입 시 사용한 이메일"
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-fadeIn">
                {error}
              </div>
            )}

            <div className="pt-2 pb-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-navy-500 hover:bg-navy-600 active:bg-navy-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-navy-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-[15px]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />발송 중...</>
                ) : (
                  <><ArrowRight className="w-5 h-5" />재설정 링크 발송</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
