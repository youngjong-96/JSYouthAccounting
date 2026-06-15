import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * 회원정보 수정 API 호출에 사용할 access token을 준비합니다.
 * @param {string | null | undefined} token
 * @returns {Promise<string>}
 */
async function getProfileAccessToken(token) {
  if (token) {
    return token;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('로그인이 필요합니다.');
  }

  return session.access_token;
}

/**
 * 회원정보 수정 API 요청 URL을 반환합니다.
 * @returns {string}
 */
function buildProfileUpdateUrl() {
  return `${API_URL}/api/accounts/profile`;
}

/**
 * 현재 로그인한 사용자의 회원정보를 서버 API를 통해 수정합니다.
 * @param {{ name: string, organization?: string | null, contact?: string | null }} profileData
 * @param {{ token?: string | null }} options
 * @returns {Promise<object>}
 */
export async function updateMyProfile(profileData, options = {}) {
  const accessToken = await getProfileAccessToken(options.token);
  const response = await fetch(buildProfileUpdateUrl(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: profileData.name,
      organization: profileData.organization ?? '',
      contact: profileData.contact ?? '',
    }),
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.error || '회원정보 저장에 실패했습니다.');
  }

  return result;
}
