import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // 로그인 성공 후 AuthContext가 user를 세팅하면 자동 이동
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('아이디 또는 비밀번호가 잘못되었습니다.');
        return;
      }

      // 승인 여부 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', data.user.id)
        .single();

      if (!profile?.is_approved) {
        await supabase.auth.signOut();
        setError('승인 대기 중입니다. 관리자의 승인을 기다려주세요.');
        return;
      }

      // AuthContext의 onAuthStateChange가 user를 업데이트하면 useEffect가 navigate 호출
    } catch {
      setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col safe-top safe-bottom">

      {/* ── 상단 장식 ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-500 via-navy-600 to-navy-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold-400" />
          <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-gold-400" />
        </div>

        <div className="relative px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          {/* 로고 */}
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 mb-5 shadow-lg">
            <span className="text-2xl sm:text-3xl font-bold text-gold-400">JS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            JSYouth
          </h1>
          <p className="mt-1.5 text-sm text-white/60 font-light">
            청년부 회계 관리 시스템
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
      <div className="flex-1 flex flex-col justify-center px-6 pb-8 sm:px-8">
        <div className="w-full max-w-sm mx-auto">

          <h2 className="text-xl font-bold text-navy-500 mb-1">로그인</h2>
          <p className="text-sm text-mist-500 mb-8">계정 정보를 입력해주세요</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* 이메일 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                이메일
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]"
                placeholder="이메일 주소를 입력하세요"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-2 uppercase tracking-wider">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all pr-12 text-[16px]"
                  placeholder="비밀번호를 입력하세요"
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

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-fadeIn">
                {error}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-navy-500 hover:bg-navy-600 active:bg-navy-700 text-white font-semibold rounded-xl shadow-lg shadow-navy-500/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-[15px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  로그인 중...
                </>
              ) : '로그인'}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-8 text-center">
            <span className="text-sm text-mist-500">
              계정이 없으신가요?{' '}
            </span>
            <Link
              to="/register"
              className="text-sm font-semibold text-gold-500 hover:text-gold-600 transition-colors"
            >
              회원가입하기
            </Link>
          </div>
        </div>
      </div>

      {/* ── 하단 ── */}
      <div className="pb-6 text-center safe-bottom">
        <p className="text-xs text-mist-400">
          © 2026 제일성도교회 청년부
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
