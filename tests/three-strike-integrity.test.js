import { strict as assert } from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function testThreeStrikeIntegrity() {
  console.log('================================================================');
  console.log('🧪 RUNNING 3-STRIKE INTEGRITY & COMPLETE LOCKDOWN TEST');
  console.log('================================================================\n');

  // 1. Authenticate student
  const authRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '22cse0002@mru.ac.in', isGoogleSso: true, name: 'Riya Sharma' })
  });
  const authData = await authRes.json();
  const token = authData.data?.accessToken;
  assert(token, 'JWT Token acquired');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Start a fresh attempt
  const startRes = await fetch(`${BASE_URL}/attempts/start`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      assessmentId: `asmt-strike-test-${Date.now()}`,
      assessmentName: 'Integrity Strike Test',
      timeLimitMinutes: 10,
      totalQuestions: 10,
    })
  });
  const startData = await startRes.json();
  const attemptId = startData.data?.id;
  assert(attemptId, 'Attempt started');
  console.log(`[Step 1] Attempt started: ${attemptId}`);

  // 3. Strike 1
  const strike1Res = await fetch(`${BASE_URL}/attempts/${attemptId}/integrity-event`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ type: 'TAB_SWITCH', note: 'Switched tab 1st time' })
  });
  const strike1Data = await strike1Res.json();
  assert.equal(strike1Data.focusLostCount, 1, 'Strike 1 count is 1');
  assert.equal(strike1Data.remainingWarnings, 2, '2 warnings remaining');
  assert.equal(strike1Data.autoSubmitted, false, 'Not auto-submitted on strike 1');
  console.log('  ✅ PASS: Strike 1 recorded. 2 warnings remaining.');

  // 4. Strike 2
  const strike2Res = await fetch(`${BASE_URL}/attempts/${attemptId}/integrity-event`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ type: 'FOCUS_LOST', note: 'Window minimized 2nd time' })
  });
  const strike2Data = await strike2Res.json();
  assert.equal(strike2Data.focusLostCount, 2, 'Strike 2 count is 2');
  assert.equal(strike2Data.remainingWarnings, 1, '1 warning remaining');
  assert.equal(strike2Data.autoSubmitted, false, 'Not auto-submitted on strike 2');
  console.log('  ✅ PASS: Strike 2 recorded. 1 warning remaining.');

  // 5. Strike 3 (Breach Trigger)
  const strike3Res = await fetch(`${BASE_URL}/attempts/${attemptId}/integrity-event`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ type: 'FULLSCREEN_EXIT', note: 'Exited fullscreen 3rd time' })
  });
  const strike3Data = await strike3Res.json();
  assert.equal(strike3Data.focusLostCount, 3, 'Strike 3 count is 3');
  assert.equal(strike3Data.autoSubmitted, true, 'Auto-submitted triggered on strike 3');
  assert.equal(strike3Data.breachExceeded, true, 'Breach threshold exceeded');
  console.log('  ✅ PASS: Strike 3 triggered immediate automatic final submission!');

  // 6. Verify attempt in DB is now finalized (status = 'submitted')
  const lookupRes = await fetch(`${BASE_URL}/attempts/${attemptId}`, { headers: authHeaders });
  const lookupData = await lookupRes.json();
  assert.equal(lookupData.data?.status, 'submitted', 'Attempt status in DB is submitted');
  console.log(`  ✅ PASS: Database verified attempt status is "${lookupData.data?.status}".`);

  // 7. Verify subsequent autosave is rejected with 409
  const autosaveAfterRes = await fetch(`${BASE_URL}/attempts/${attemptId}/autosave`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ answers: { 1: 5 } })
  });
  assert.equal(autosaveAfterRes.status, 409, 'Autosave rejected with HTTP 409 Conflict after finalization');
  console.log('  ✅ PASS: Autosave post-finalization safely rejected with HTTP 409.');

  console.log('\n================================================================');
  console.log('🎯 3-STRIKE INTEGRITY & COMPLETE LOCKDOWN TEST: ALL PASSED!');
  console.log('================================================================');
}

testThreeStrikeIntegrity().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
