// LCP #712 focused auth persistence validation.
// This harness guards the production admin-login bug where a successful
// token/user login was immediately cleared before the router guard could read it.

const fs = require('fs');

const useAuthPath = './src/composables/useAuth.js';
const routerPath = './src/router/index.js';

const useAuthCode = fs.readFileSync(useAuthPath, 'utf8');
const routerCode = fs.readFileSync(routerPath, 'utf8');

const BROWSER_MAX_TIMEOUT_MS = 2_147_483_647;
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log('  PASS:', message);
    passed += 1;
  } else {
    console.error('  FAIL:', message);
    failed += 1;
  }
}

function createJwtExpiringIn(secondsFromNow) {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + secondsFromNow,
  })).toString('base64url');
  return `header.${payload}.signature`;
}

function decodeJwtExpirationMs(jwt) {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
  return payload.exp * 1000;
}

function createMemoryLocalStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

function loadUseAuth() {
  const executableUseAuthCode = useAuthCode
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/export\s+function\s+useAuth\s*\(/, 'function useAuth(');
  return new Function(
    'computed',
    'router',
    'formatDistanceToNow',
    'apiClient',
    'devLog',
    'useLocalStorage',
    'useStorage',
    'jwtDecode',
    `${executableUseAuthCode}\nreturn useAuth;`,
  );
}

async function runLoginPersistenceScenario(secondsFromNow) {
  const jwt = createJwtExpiringIn(secondsFromNow);
  const scheduledDelays = [];
  const routerPushes = [];
  const localStorage = createMemoryLocalStorage();
  const originalLocalStorage = global.localStorage;
  const originalSetTimeout = global.setTimeout;

  global.localStorage = localStorage;
  global.setTimeout = (callback, delay) => {
    scheduledDelays.push(delay);
    if (delay > BROWSER_MAX_TIMEOUT_MS) {
      callback();
    }
    return scheduledDelays.length;
  };

  try {
    const refs = new Map();
    const useLocalStorage = (key, defaultValue) => {
      const initialValue = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
      refs.set(key, initialValue);
      return {
        get value() {
          return refs.get(key);
        },
        set value(value) {
          refs.set(key, value);
        },
      };
    };

    const useAuth = loadUseAuth()(
      getter => ({ get value() { return getter(); } }),
      {
        currentRoute: { value: { path: '/admin/login' } },
        push: path => routerPushes.push(path),
      },
      () => 'in the future',
      {
        post: async () => ({
          data: {
            token: jwt,
            refreshToken: 'refresh-token',
            user: {
              id: 3,
              name: 'Laudium Post Admin',
              email: 'info@lauduimpost.co.za',
              businessId: null,
              role: { id: 1, name: 'admin' },
            },
          },
        }),
      },
      { debug() {}, info() {} },
      useLocalStorage,
      () => ({}),
      encodedJwt => JSON.parse(Buffer.from(encodedJwt.split('.')[1], 'base64url').toString('utf8')),
    );

    const auth = useAuth();
    await auth.login('info@lauduimpost.co.za', 'correct-password');
    return { jwt, localStorage, scheduledDelays, routerPushes };
  } finally {
    global.localStorage = originalLocalStorage;
    global.setTimeout = originalSetTimeout;
  }
}

async function main() {
  console.log('\n=== LCP #712 AUTH PERSISTENCE VALIDATION ===\n');

  const oneHourToken = createJwtExpiringIn(3600);
  const expirationMs = decodeJwtExpirationMs(oneHourToken);
  const expectedDelayMs = expirationMs - Date.now();
  const overflowDelayMs = new Date(expirationMs * 1000).getTime() - Date.now();

  console.log('1. Token timer regression guard:');
  assert(expectedDelayMs > 3_500_000 && expectedDelayMs <= 3_600_000,
    'JWT exp decoded to an approximately one-hour millisecond delay');
  assert(overflowDelayMs > BROWSER_MAX_TIMEOUT_MS,
    'Legacy fromUnixTime(milliseconds) calculation would overflow browser timers');
  assert(!/fromUnixTime\(\s*getTokenExpiration\(token\.value\)\s*\)/.test(useAuthCode),
    'setupAutoLogout no longer passes millisecond token expiration into fromUnixTime');
  assert(/expirationTime\s*=\s*getTokenExpiration\(token\.value\)/.test(useAuthCode) &&
         /timeout\s*=\s*expirationTime\s*-\s*Date\.now\(\)/.test(useAuthCode),
    'setupAutoLogout schedules logout from expiration milliseconds minus Date.now()');

  console.log('\n2. Long-lived token browser timer contract:');
  const longLivedLogin = await runLoginPersistenceScenario(THIRTY_DAYS_SECONDS);
  assert(longLivedLogin.scheduledDelays.length > 0,
    'long-lived admin login schedules an auto-logout timer or recheck');
  assert(longLivedLogin.scheduledDelays.every(delay => delay <= BROWSER_MAX_TIMEOUT_MS),
    'long-lived admin login never schedules one timer beyond the browser maximum delay');
  assert(longLivedLogin.localStorage.getItem('auth.token') === longLivedLogin.jwt,
    'long-lived admin token remains in localStorage immediately after login');
  assert(longLivedLogin.localStorage.getItem('auth.user') !== null,
    'long-lived admin user remains in localStorage immediately after login');
  assert(!longLivedLogin.routerPushes.includes('/admin/login'),
    'long-lived admin login does not immediately redirect back to /admin/login');

  console.log('\n3. Expired token enforcement contract:');
  const expiredLogin = await runLoginPersistenceScenario(-60);
  assert(expiredLogin.scheduledDelays.length === 0,
    'expired admin token does not schedule a future logout timer');
  assert(expiredLogin.localStorage.getItem('auth.token') === null &&
         expiredLogin.localStorage.getItem('auth.user') === null &&
         expiredLogin.localStorage.getItem('auth.refresh_token') === null,
    'expired admin token is cleared immediately');
  assert(expiredLogin.routerPushes.includes('/admin/login'),
    'expired admin token redirects to /admin/login immediately');

  console.log('\n4. Login persistence contract:');
  assert(/localStorage\.setItem\(\s*["']auth\.token["']\s*,\s*tokens\.token\s*\)/.test(useAuthCode),
    'login persistence writes auth.token for the router guard');
  assert(/localStorage\.setItem\(\s*["']auth\.user["']\s*,\s*JSON\.stringify\(tokens\.user\)\s*\)/.test(useAuthCode),
    'login persistence writes auth.user for the router guard');
  assert(/localStorage\.getItem\(\s*["']auth\.token["']\s*\)/.test(routerCode) &&
         /localStorage\.getItem\(\s*["']auth\.user["']\s*\)/.test(routerCode),
    'router guard reads the same auth.token/auth.user keys saved after login');

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
