/**
 * Comprehensive Integration Verification Test for Auth Refresh Lifecycle & Session Integrity
 */

const BASE_URL = 'http://127.0.0.1:5000/api';
let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

function getSetCookies(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers.getSetCookie();
  }
  const raw = res.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function extractCookie(res, cookieName) {
  const list = getSetCookies(res);
  for (const c of list) {
    if (c.includes(`${cookieName}=`)) {
      return c;
    }
  }
  return null;
}

function parseCookieValue(cookieString, cookieName) {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING AUTH REFRESH & SESSION LIFECYCLE VERIFICATION');
  console.log('================================================================\n');

  // Test 1: Health check
  console.log('[Test 1] Health Check');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert(healthRes.status === 200, 'Server returns HTTP 200 OK');

  // Test 2: Admin Login & Refresh Cookie Issue
  console.log('\n[Test 2] Admin Login & Cookie Issuance');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Integration-Test-Browser'
    },
    body: JSON.stringify({
      email: 'vineetkumar182023@gmail.com',
      isGoogleSso: true,
      name: 'Vineet Kumar'
    })
  });
  assert(loginRes.status === 200, 'Admin login succeeded (HTTP 200)');
  const loginData = await loginRes.json();
  assert(Boolean(loginData.data?.accessToken), 'Access token issued');
  assert(loginData.data?.user?.role === 'core_team', 'User role is core_team');

  const setCookieHeader = extractCookie(loginRes, 'mru_refresh_token');
  assert(Boolean(setCookieHeader), 'mru_refresh_token Set-Cookie header present');
  assert(setCookieHeader.includes('Path=/'), 'Cookie path is strictly root (Path=/)');
  assert(setCookieHeader.toLowerCase().includes('httponly'), 'Cookie is HttpOnly');

  const refreshToken1 = parseCookieValue(setCookieHeader, 'mru_refresh_token');
  assert(Boolean(refreshToken1), 'Refresh token extracted from cookie');

  // Test 3: Normal Refresh Request (using cookie)
  console.log('\n[Test 3] Refresh Request using HttpOnly Cookie');
  const refreshRes1 = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `mru_refresh_token=${refreshToken1}`,
      'User-Agent': 'Integration-Test-Browser'
    }
  });

  assert(refreshRes1.status === 200, 'Refresh succeeded with HTTP 200 OK');
  const refreshData1 = await refreshRes1.json();
  assert(Boolean(refreshData1.data?.accessToken), 'Fresh access token returned');
  assert(refreshData1.data?.user?.email === 'vineetkumar182023@gmail.com', 'Admin user identity correctly resolved on refresh');
  assert(refreshData1.data?.user?.role === 'core_team', 'Admin role preserved on refresh');

  const setCookieHeader2 = extractCookie(refreshRes1, 'mru_refresh_token');
  const refreshToken2 = parseCookieValue(setCookieHeader2, 'mru_refresh_token');
  assert(Boolean(refreshToken2), 'Rotated refresh cookie issued');
  assert(refreshToken2 !== refreshToken1, 'Token rotated: new token distinct from previous token');

  // Test 4: Concurrent Refresh within Grace Window (prevents race-condition loops)
  console.log('\n[Test 4] Concurrent Refresh within 15-second Grace Window');
  const concurrentRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `mru_refresh_token=${refreshToken1}`, // presenting old token during grace period
      'User-Agent': 'Integration-Test-Browser'
    }
  });
  const concurrentData = await concurrentRes.json().catch(() => ({}));
  if (concurrentRes.status !== 200) {
    console.log('  Debug Test 4 Status:', concurrentRes.status, concurrentData);
  }
  assert(concurrentRes.status === 200, 'Concurrent request within grace window succeeds with HTTP 200');
  assert(Boolean(concurrentData.data?.accessToken), 'Valid access token issued to concurrent request');

  // Test 5: Missing Refresh Cookie Rejection & Header Clearance
  console.log('\n[Test 5] Missing Refresh Cookie Handling');
  const missingRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert(missingRes.status === 401, 'Missing cookie rejected with HTTP 401');
  const missingData = await missingRes.json();
  assert(missingData.code === 'REFRESH_TOKEN_MISSING', 'Error code is REFRESH_TOKEN_MISSING');
  const rawSetCookies = getSetCookies(missingRes);
  const clearsRootPath = rawSetCookies.some(c => c.includes('mru_refresh_token=') && c.includes('Path=/'));
  assert(clearsRootPath, 'Set-Cookie clears invalid cookie on Path=/');

  // Test 6: Invalid/Unknown Refresh Token Rejection & Header Clearance
  console.log('\n[Test 6] Invalid/Unknown Refresh Token Handling');
  const invalidRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'mru_refresh_token=totally_fake_token_value_xyz123'
    }
  });
  assert(invalidRes.status === 401, 'Invalid token rejected with HTTP 401');
  const invalidData = await invalidRes.json();
  assert(invalidData.code === 'REFRESH_FAILED', 'Error code is REFRESH_FAILED');

  // Test 7: Protected Admin API Access with Fresh Token vs Missing Token
  console.log('\n[Test 7] Protected Admin API Access Control');
  const protectedWithToken = await fetch(`${BASE_URL}/admin/testers`, {
    headers: {
      'Authorization': `Bearer ${refreshData1.data.accessToken}`
    }
  });
  assert(protectedWithToken.status === 200, 'Admin API accepted request with refreshed access token (HTTP 200)');

  const protectedWithoutToken = await fetch(`${BASE_URL}/admin/testers`);
  assert(protectedWithoutToken.status === 401, 'Admin API rejected request without token (HTTP 401)');
  const unauthData = await protectedWithoutToken.json();
  assert(unauthData.error?.includes('Missing Bearer'), 'Rejection message specifies Missing Bearer access token');

  // Test 8: Logout Session Invalidation & Cookie Clearance
  console.log('\n[Test 8] Logout & Complete Invalidation');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `mru_refresh_token=${refreshToken2}`
    }
  });
  assert(logoutRes.status === 200, 'Logout succeeded with HTTP 200 OK');
  const logoutSetCookies = getSetCookies(logoutRes);
  const logoutClearsRoot = logoutSetCookies.some(c => c.includes('mru_refresh_token=') && c.includes('Path=/'));
  assert(logoutClearsRoot, 'Logout explicitly clears refresh cookie at Path=/');

  // Attempting to refresh after logout should fail
  const postLogoutRefresh = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `mru_refresh_token=${refreshToken2}`,
      'User-Agent': 'Integration-Test-Browser'
    }
  });
  assert(postLogoutRefresh.status === 401, 'Refresh using logged-out cookie is rejected with HTTP 401');

  console.log('\n================================================================');
  console.log(`🎯 VERIFICATION COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
