import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logoWhite from '../assets/logo_white.png';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * 로그인 화면을 렌더링하고 인증 절차를 처리합니다.
 * @returns {JSX.Element}
 */
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // 이미 로그인된 사용자는 메인 화면으로 바로 이동합니다.
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * 이메일과 비밀번호로 로그인을 시도합니다.
   * @param {React.FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      // 승인되지 않은 계정은 로그인 상태를 유지하지 않도록 차단합니다.
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', data.user.id)
        .single();

      if (!profile?.is_approved) {
        await supabase.auth.signOut();
        setError('승인 대기 중입니다. 관리자 승인 후 다시 시도해 주세요.');
        return;
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col safe-top safe-bottom">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-500 via-navy-600 to-navy-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold-400" />
          <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-gold-400" />
        </div>

        <div className="relative px-6 pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
          <div className="flex justify-center mb-5">
            <img
              src={logoWhite}
              alt="JSYouth 로고"
              className="h-16 w-auto object-contain drop-shadow-lg sm:h-20"
            />
          </div>
          <p className="mt-1.5 text-sm font-light text-white/60">
            청년부 회계 관리 시스템
          </p>
        </div>

        {/* <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="h-8 w-full fill-cream-100 sm:h-10">
            <path d="M0,0 C480,60 960,60 1440,0 L1440,60 L0,60 Z" />
          </svg>
        </div> */}
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-8 sm:px-8 lg:px-10 xl:px-12">
        <div className="mx-auto w-full max-w-sm lg:max-w-[560px]">
          <div className="lg:rounded-[28px] lg:border lg:border-mist-200 lg:bg-white lg:p-8 lg:shadow-xl lg:shadow-navy-500/10">
              <h2 className="mb-1 text-xl font-bold text-navy-500">로그인</h2>
              <p className="mb-8 text-sm text-mist-500">계정 정보를 입력해 주세요.</p>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-navy-400">
                    이메일
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border-2 border-mist-200 bg-white px-4 py-3.5 text-[16px] text-navy-500 placeholder-mist-400 transition-all focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400/30"
                    placeholder="이메일 주소를 입력해 주세요"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-medium uppercase tracking-wider text-navy-400">
                      비밀번호
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-gold-500 transition-colors hover:text-gold-600"
                    >
                      비밀번호 찾기
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border-2 border-mist-200 bg-white px-4 py-3.5 pr-12 text-[16px] text-navy-500 placeholder-mist-400 transition-all focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400/30"
                      placeholder="비밀번호를 입력해 주세요"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-mist-400 transition-colors hover:text-navy-500"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 animate-fadeIn">
                    {error}
                  </div>
                )}

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-500 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-navy-500/20 transition-all hover:bg-navy-600 active:bg-navy-700 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      로그인 중...
                    </>
                  ) : '로그인'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <span className="text-sm text-mist-500">계정이 없으신가요? </span>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-gold-500 transition-colors hover:text-gold-600"
                >
                  회원가입하기
                </Link>
              </div>
          </div>
        </div>
      </div>

      <div className="pb-6 text-center safe-bottom">
        <p className="text-xs text-mist-400">© 2026 제이에스유스 청년부</p>
      </div>
    </div>
  );
};

export default LoginPage;
