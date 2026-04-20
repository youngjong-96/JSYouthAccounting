import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organization: '',
    contact: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            organization: formData.organization,
            contact: formData.contact,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError('회원가입 중 오류가 발생했습니다. 입력 정보를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  /* ── 완료 화면 ── */
  if (success) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center px-6 safe-top safe-bottom animate-fadeIn">
        <div className="w-full max-w-sm text-center">
          {/* 성공 아이콘 */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy-500 mb-3">가입 신청 완료!</h2>
          <p className="text-mist-500 text-sm leading-relaxed mb-8">
            가입 신청이 완료되었습니다.<br />
            관리자 승인 후 로그인이 가능합니다.
          </p>

          {/* 안내 카드 */}
          <div className="bg-gold-50 border border-gold-200 rounded-2xl p-5 mb-8 text-left">
            <p className="text-xs font-semibold text-gold-600 uppercase tracking-wider mb-2">안내사항</p>
            <ul className="text-sm text-navy-400 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-gold-400 mt-0.5">•</span>
                관리자가 가입 요청을 검토합니다
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-400 mt-0.5">•</span>
                승인 완료 후 로그인하실 수 있습니다
              </li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 bg-navy-500 hover:bg-navy-600 active:bg-navy-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-navy-500/20 text-[15px]"
          >
            로그인 화면으로 이동
          </button>
        </div>
      </div>
    );
  }

  /* ── 폼 ── */
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col safe-top safe-bottom">

      {/* ── 상단 ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-500 via-navy-600 to-navy-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold-400" />
          <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-gold-400" />
        </div>

        <div className="relative px-6 pt-14 pb-10 sm:pt-16 sm:pb-12">
          {/* 뒤로가기 */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors mb-6 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            로그인으로 돌아가기
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
            <span className="text-xl sm:text-2xl font-bold text-gold-400">JS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            회원가입
          </h1>
          <p className="mt-1 text-sm text-white/60 font-light">
            JSYouth 회계 시스템 가입 신청
          </p>
        </div>

        {/* 곡선 구분선 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-8 sm:h-10 fill-cream-100">
            <path d="M0,0 C480,60 960,60 1440,0 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </div>

      {/* ── 폼 영역 ── */}
      <div className="flex-1 px-6 py-6 sm:px-8">
        <div className="w-full max-w-sm mx-auto">
          <form onSubmit={handleRegister} className="space-y-4">

            {/* 이메일 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                이메일 <span className="text-red-400">*</span>
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]"
                placeholder="이메일 주소"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                비밀번호 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all pr-12 text-[16px]"
                  placeholder="6자 이상 비밀번호"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-mist-400 hover:text-navy-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 구분선 */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-mist-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-cream-100 px-3 text-xs text-mist-400">추가 정보</span>
              </div>
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                이름 <span className="text-red-400">*</span>
              </label>
              <input
                id="register-name"
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]"
                placeholder="실명"
              />
            </div>

            {/* 소속 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                소속 <span className="text-red-400">*</span>
              </label>
              <input
                id="register-organization"
                type="text"
                name="organization"
                required
                value={formData.organization}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]"
                placeholder="청년부, 교사 등"
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                연락처 <span className="text-red-400">*</span>
              </label>
              <input
                id="register-contact"
                type="text"
                name="contact"
                required
                value={formData.contact}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]"
                placeholder="010-0000-0000"
              />
            </div>

            {/* 에러 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-fadeIn">
                {error}
              </div>
            )}

            {/* 제출 버튼 */}
            <div className="pt-2 pb-8">
              <button
                id="register-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-navy-500 hover:bg-navy-600 active:bg-navy-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-navy-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-[15px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    가입 중...
                  </>
                ) : '회원가입 신청'}
              </button>

              <p className="text-center text-sm text-mist-500 mt-5">
                이미 계정이 있으신가요?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-gold-500 hover:text-gold-600 transition-colors"
                >
                  로그인하기
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
