const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

async function run() {
  global.window = {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  };

  const moduleUrl = pathToFileURL(path.join(__dirname, 'authSessionLifetime.js')).href;
  const lifetime = await import(moduleUrl);
  const start = Date.parse('2026-09-04T10:00:00.000Z');
  const twoHoursLater = start + lifetime.AUTH_SESSION_MAX_AGE_MS;

  assert.equal(twoHoursLater, Date.parse('2026-09-04T12:00:00.000Z'));
  assert.equal(lifetime.startAuthSession('user-1', start), twoHoursLater);
  assert.equal(lifetime.isStoredAuthSessionExpired(twoHoursLater - 1), false);
  assert.equal(lifetime.isStoredAuthSessionExpired(twoHoursLater), true);

  const refreshedSession = {
    user: {
      id: 'user-1',
      last_sign_in_at: '2026-09-04T10:30:00.000Z',
    },
  };
  assert.equal(
    lifetime.getAuthSessionDeadline(refreshedSession, start + 30 * 60 * 1000),
    twoHoursLater,
    '토큰 갱신이나 인증 이벤트가 최초 로그인 마감을 연장하면 안 됩니다.',
  );

  lifetime.clearAuthSessionLifetime();
  assert.equal(lifetime.isStoredAuthSessionExpired(twoHoursLater), false);

  const restoredSession = {
    user: {
      id: 'user-2',
      last_sign_in_at: '2026-09-04T11:00:00.000Z',
    },
  };
  assert.equal(
    lifetime.getAuthSessionDeadline(restoredSession, start + 90 * 60 * 1000),
    Date.parse('2026-09-04T13:00:00.000Z'),
    '저장 정보가 없으면 Supabase의 실제 로그인 시각을 사용해야 합니다.',
  );

  lifetime.markAuthSessionExpiredNotice();
  assert.equal(lifetime.consumeAuthSessionExpiredNotice(), true);
  assert.equal(lifetime.consumeAuthSessionExpiredNotice(), false);

  console.log('Auth session hard-expiry tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
