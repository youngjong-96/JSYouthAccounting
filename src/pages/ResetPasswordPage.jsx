import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showCf, setShowCf]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState('');
  const [sessionReady, setReady]    = useState(false);

  /* Supabase는 이메일 링크 클릭 시 URL hash에 access_token 등을 담아 리다이렉트.
     onAuthStateChange의 PASSWORD_RECOVERY 이벤트로 세션을 자동 교환해줌. */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // 이미 세션이 있는 경우 (재방문 등)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== confirm) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (e) {
      setError(e.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /* ── 완료 화면 ── */
  if (done) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center px-6 animate-fadeIn">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy-500 mb-3">비밀번호 변경 완료!</h2>
          <p className="text-mist-500 text-sm leading-relaxed mb-8">
            새 비밀번호로 로그인하실 수 있습니다.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 bg-navy-500 hover:bg-navy-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-navy-500/20 text-[15px]"
          >
            로그인 화면으로 이동
          </button>
        </div>
      </div>
    );
  }

  /* ── 세션 준비 전 ── */
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-cream-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-mist-400" />
          </div>
          <h2 className="text-base font-bold text-navy-500 mb-2">링크 확인 중...</h2>
          <p className="text-sm text-mist-500">이메일의 링크를 통해 접근해주세요.</p>
        </div>
      </div>
    );
  }

  /* ── 비밀번호 입력 폼 ── */
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col safe-top safe-bottom">

      {/* 상단 헤더 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-500 via-navy-600 to-navy-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold-400" />
        </div>
        <div className="relative px-6 pt-14 pb-10 sm:pt-16 sm:pb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
            <KeyRound className="w-7 h-7 text-gold-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">새 비밀번호 설정</h1>
          <p className="mt-1 text-sm text-white/60 font-light">6자 이상의 새 비밀번호를 입력해주세요</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-8 sm:h-10 fill-cream-100">
            <path d="M0,0 C480,60 960,60 1440,0 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </div>

      {/* 폼 */}
      <div className="flex-1 px-6 py-8 sm:px-8">
        <div className="w-full max-w-sm mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 새 비밀번호 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                새 비밀번호 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all pr-12 text-[16px]"
                  placeholder="6자 이상"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-mist-400 hover:text-navy-500">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 새 비밀번호 확인 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                새 비밀번호 확인 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCf ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all pr-12 text-[16px]"
                  placeholder="비밀번호 재입력"
                />
                <button type="button" onClick={() => setShowCf(!showCf)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-mist-400 hover:text-navy-500">
                  {showCf ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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
                  <><Loader2 className="w-5 h-5 animate-spin" />변경 중...</>
                ) : '비밀번호 변경하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
