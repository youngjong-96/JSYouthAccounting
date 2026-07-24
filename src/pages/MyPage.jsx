import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { updateMyProfile } from '../lib/profileService';
import { useAuth } from '../context/AuthContext';
import { User, KeyRound, Save, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

/* ── 토스트 메시지 ── */
function Toast({ message, type }) {
  if (!message) return null;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium animate-fadeIn ${
      type === 'success'
        ? 'bg-green-50 border border-green-200 text-green-700'
        : 'bg-red-50 border border-red-200 text-red-600'
    }`}>
      {type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  );
}

const MyPage = () => {
  const { user, token, refreshProfile } = useAuth();

  /* ── 회원정보 수정 ── */
  const [profile, setProfile] = useState({
    name:         user?.name         || '',
    organization: user?.organization || '',
    contact:      user?.contact      || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg]         = useState({ text: '', type: '' });

  const handleProfileChange = e =>
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ text: '', type: '' });

    const nextName = profile.name.trim();

    if (!nextName) {
      setProfileMsg({ text: '이름은 비워둘 수 없습니다.', type: 'error' });
      setProfileLoading(false);
      return;
    }

    try {
      const updatedProfile = await updateMyProfile({
        name: nextName,
        organization: profile.organization,
        contact: profile.contact,
      }, { token });

      setProfile({
        name: updatedProfile.name || '',
        organization: updatedProfile.organization || '',
        contact: updatedProfile.contact || '',
      });

      try {
        await refreshProfile();
      } catch {
        /* 전역 사용자 상태 새로고침이 실패해도 저장 결과 자체는 유지합니다. */
      }

      setProfileMsg({ text: '회원정보가 저장되었습니다.', type: 'success' });
    } catch (error) {
      setProfileMsg({ text: '저장에 실패했습니다: ' + error.message, type: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  /* ── 비밀번호 변경 (B안) ── */
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw]             = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading]       = useState(false);
  const [pwMsg, setPwMsg]               = useState({ text: '', type: '' });

  const handlePwChange = e =>
    setPw(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleShow = key =>
    setShowPw(prev => ({ ...prev, [key]: !prev[key] }));

  const handlePwSave = async (e) => {
    e.preventDefault();
    setPwMsg({ text: '', type: '' });

    if (pw.next.length < 6) {
      setPwMsg({ text: '새 비밀번호는 6자 이상이어야 합니다.', type: 'error' }); return;
    }
    if (pw.next !== pw.confirm) {
      setPwMsg({ text: '새 비밀번호가 일치하지 않습니다.', type: 'error' }); return;
    }

    setPwLoading(true);
    try {
      // 현재 비밀번호 재인증
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pw.current,
      });
      if (signInErr) {
        setPwMsg({ text: '현재 비밀번호가 올바르지 않습니다.', type: 'error' });
        return;
      }
      // 새 비밀번호 설정
      const { error: updateErr } = await supabase.auth.updateUser({ password: pw.next });
      if (updateErr) throw updateErr;

      setPwMsg({ text: '비밀번호가 변경되었습니다.', type: 'success' });
      setPw({ current: '', next: '', confirm: '' });
    } catch (e) {
      setPwMsg({ text: '비밀번호 변경에 실패했습니다: ' + e.message, type: 'error' });
    } finally {
      setPwLoading(false);
    }
  };

  /* ── 공통 인풋 스타일 ── */
  const inputCls = 'w-full px-4 py-3 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[15px]';
  const labelCls = 'block text-xs font-medium text-navy-400 mb-1.5 uppercase tracking-wider';

  return (
    <div className="space-y-5 animate-slideUp pb-8">

      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-navy-50 rounded-xl">
          <User className="w-5 h-5 text-navy-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-navy-500">내 정보</h2>
          <p className="text-xs text-mist-500">{user?.email}</p>
        </div>
      </div>

      {/* ── 회원정보 수정 카드 ── */}
      <form onSubmit={handleProfileSave}>
        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-mist-100">
            <User className="w-4 h-4 text-navy-400" />
            <h3 className="text-sm font-semibold text-navy-500">기본 정보 수정</h3>
          </div>
          <div className="p-5 space-y-4">

            <div>
              <label className={labelCls}>이름 <span className="text-red-400">*</span></label>
              <input
                name="name" type="text" required
                value={profile.name} onChange={handleProfileChange}
                className={inputCls} placeholder="실명"
              />
            </div>

            <div>
              <label className={labelCls}>소속</label>
              <input
                name="organization" type="text"
                value={profile.organization} onChange={handleProfileChange}
                className={inputCls} placeholder="청년부, 교사 등"
              />
            </div>

            <div>
              <label className={labelCls}>연락처</label>
              <input
                name="contact" type="text"
                value={profile.contact} onChange={handleProfileChange}
                className={inputCls} placeholder="010-0000-0000"
              />
            </div>

            <Toast message={profileMsg.text} type={profileMsg.type} />

            <button
              type="submit" disabled={profileLoading}
              className="w-full py-3 bg-navy-500 hover:bg-navy-600 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {profileLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />저장 중...</>
                : <><Save className="w-4 h-4" />정보 저장</>
              }
            </button>
          </div>
        </div>
      </form>

      {/* ── 비밀번호 변경 카드 ── */}
      <form onSubmit={handlePwSave}>
        <div className="bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-mist-100">
            <KeyRound className="w-4 h-4 text-navy-400" />
            <h3 className="text-sm font-semibold text-navy-500">비밀번호 변경</h3>
          </div>
          <div className="p-5 space-y-4">

            {/* 현재 비밀번호 */}
            <div>
              <label className={labelCls}>현재 비밀번호 <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  name="current" type={showPw.current ? 'text' : 'password'} required
                  value={pw.current} onChange={handlePwChange}
                  className={`${inputCls} pr-12`} placeholder="현재 비밀번호 입력"
                />
                <button type="button" onClick={() => toggleShow('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-mist-400 hover:text-navy-500">
                  {showPw.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="border-t border-mist-100 pt-4">
              {/* 새 비밀번호 */}
              <div className="mb-4">
                <label className={labelCls}>새 비밀번호 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    name="next" type={showPw.next ? 'text' : 'password'} required
                    value={pw.next} onChange={handlePwChange}
                    className={`${inputCls} pr-12`} placeholder="6자 이상"
                  />
                  <button type="button" onClick={() => toggleShow('next')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-mist-400 hover:text-navy-500">
                    {showPw.next ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* 새 비밀번호 확인 */}
              <div>
                <label className={labelCls}>새 비밀번호 확인 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    name="confirm" type={showPw.confirm ? 'text' : 'password'} required
                    value={pw.confirm} onChange={handlePwChange}
                    className={`${inputCls} pr-12`} placeholder="새 비밀번호 재입력"
                  />
                  <button type="button" onClick={() => toggleShow('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-mist-400 hover:text-navy-500">
                    {showPw.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Toast message={pwMsg.text} type={pwMsg.type} />

            <button
              type="submit" disabled={pwLoading}
              className="w-full py-3 bg-gold-400 hover:bg-gold-500 text-navy-700 font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {pwLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />변경 중...</>
                : <><KeyRound className="w-4 h-4" />비밀번호 변경</>
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MyPage;
