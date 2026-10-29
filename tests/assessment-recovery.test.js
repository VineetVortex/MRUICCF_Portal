/**
 * Assessment Recovery and Session Lifecycle Automated Integration Test
 * Verifies Phase 2 (Exam Session & Recovery), Phase 3 (Integrity), Phase 7 (RBAC) & Phase 8 (Scoring)
 */

async function runRecoveryVerificationTest() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('================================================================');
  console.log('🧪 RUNNING ICCF PORTAL EXAM RECOVERY & INTEGRITY TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check verification
    console.log('\n[Test 1] Health & Connectivity Check:');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Server returns HTTP 200 OK');
    assert(healthData.database.connected === true, 'Supabase Database connected');

    // 2. Authenticate to obtain authoritative 30s JWT Access Token
    console.log('\n[Test 2] Phase 7: Authenticate Student Account:');
    const authRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '22cse0002@mru.ac.in',
        isGoogleSso: true,
        name: 'Riya Sharma'
      })
    });
    const authData = await authRes.json();
    assert(authRes.status === 200, 'Student authentication succeeded');
    const token = authData.data?.accessToken;
    assert(Boolean(token), 'Valid Bearer JWT Access Token issued');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Fetch approved questions list from server to know exact questions
    const questionsRes = await fetch(`${BASE_URL}/questions?status=approved`, { headers: authHeaders });
    const questionsData = await questionsRes.json();
    const approvedQuestions = Array.isArray(questionsData.data) ? questionsData.data : [];

    // 3. Start new examination session
    console.log('\n[Test 3] Phase 2.1 & 2.2: Start Authoritative Timed Session:');
    const startPayload = {
      assessmentId: 'asmt-2026-core',
      assessmentName: 'Human-Centric Skills Verification Test',
      timeLimitMinutes: 45,
      totalQuestions: approvedQuestions.length || 150,
      userId: authData.data?.user?.id || 'usr_22cse0002',
      studentName: 'Riya Sharma',
      rollNo: '22CSE0002',
      department: 'Computer Science & Technology'
    };

    const startRes = await fetch(`${BASE_URL}/attempts/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(startPayload)
    });
    const startData = await startRes.json();
    assert(startRes.status === 201 || startRes.status === 200, 'Attempt started/resumed successfully');
    assert(startData.data?.id !== undefined, `Attempt ID generated: ${startData.data?.id}`);
    assert(startData.data?.deadlineAt !== undefined, `Authoritative deadline set: ${startData.data?.deadlineAt}`);
    assert(startData.data?.remainingSeconds > 0, `Remaining seconds calculated: ${startData.data?.remainingSeconds}s`);

    const attemptId = startData.data?.id;
    const initialDeadline = startData.data?.deadlineAt;

    // 4. Answer Autosave Verification
    console.log('\n[Test 4] Phase 2.3: Real-Time Answer Autosave:');
    const answersDraft = { 1: 5, 2: 4, 3: 5, 4: 4, 5: 5 };
    const autosaveRes = await fetch(`${BASE_URL}/attempts/${attemptId}/autosave`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        answers: answersDraft,
        answeredQuestionIds: [1, 2, 3, 4, 5],
        flaggedQuestionIds: [3],
        currentIndex: 4,
        version: 1,
        lastActivityAt: new Date().toISOString()
      })
    });
    const autosaveData = await autosaveRes.json();
    assert(autosaveRes.status === 200, 'Autosave returned HTTP 200');
    assert(autosaveData.success === true, 'Autosave successfully persisted');
    assert(autosaveData.answeredCount >= 5, `Answer count validated: ${autosaveData.answeredCount}`);

    // 5. Interruption & Refresh Recovery (Idempotent Resume)
    console.log('\n[Test 5] Phase 2.4: Browser Refresh / Disconnect Recovery:');
    const resumeRes = await fetch(`${BASE_URL}/attempts/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(startPayload)
    });
    const resumeData = await resumeRes.json();
    assert(resumeRes.status === 200, 'Resume returned HTTP 200');
    assert(resumeData.resumed === true, 'Server identified existing active session and returned resumed: true');
    assert(resumeData.data?.id === attemptId, 'Restored exact same attemptId');
    const deadlineMatches = Math.abs(new Date(resumeData.data?.deadlineAt).getTime() - new Date(initialDeadline).getTime()) < 1000;
    assert(deadlineMatches, 'Authoritative deadline remained unchanged after reload');
    assert(Object.keys(resumeData.data?.answers || {}).length >= 5, 'Restored previously answered questions');
    assert(resumeData.data?.flaggedQuestionIds?.includes(3), 'Restored flagged question navigation state');

    // 6. Active Attempt Discovery (Dashboard Resume Action)
    console.log('\n[Test 6] Phase 2.4 & Phase 4: Student Dashboard Active Attempt Discovery:');
    const activeRes = await fetch(`${BASE_URL}/attempts/active?userId=${startPayload.userId}`, {
      headers: authHeaders
    });
    const activeData = await activeRes.json();
    assert(activeRes.status === 200, 'Active attempt lookup returned HTTP 200');
    assert(activeData.active === true, 'Active attempt detected for student');
    assert(activeData.data?.id === attemptId, 'Matches current in-progress attempt');

    // 7. Integrity Monitoring (Tab Switch & Fullscreen Event Logging)
    console.log('\n[Test 7] Phase 3: Tab Visibility & Integrity Event Logging:');
    const integrityRes = await fetch(`${BASE_URL}/attempts/${attemptId}/integrity-event`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'TAB_SWITCH',
        note: 'Test automated tab switch'
      })
    });
    const integrityData = await integrityRes.json();
    assert(integrityRes.status === 200, 'Integrity event logged successfully');
    assert(integrityData.focusLostCount >= 1, `Focus lost count incremented: ${integrityData.focusLostCount}`);

    // 8. Authoritative Finalization & Certification Scoring
    console.log('\n[Test 8] Phase 2.6 & Phase 8: Idempotent Submission & Certified Grading:');
    // Generate answers for questions to test certified grading
    const finalAnswers = {};
    if (approvedQuestions.length > 0) {
      approvedQuestions.forEach(q => {
        finalAnswers[q.id] = q.isReverse ? 1 : 5;
      });
    } else {
      for (let i = 1; i <= 150; i++) {
        finalAnswers[i] = 5;
      }
    }

    const finalizeRes = await fetch(`${BASE_URL}/attempts/${attemptId}/finalize`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        answers: finalAnswers,
        timeSpentSeconds: 1200,
        timeTakenFormatted: '20m 00s'
      })
    });
    const finalizeData = await finalizeRes.json();
    assert(finalizeRes.status === 200, 'Finalize returned HTTP 200');
    assert(finalizeData.data?.attempt?.status === 'submitted', `Status updated to 'submitted'`);
    assert(finalizeData.data?.attempt?.overallScore >= 65, `Composite score calculated: ${finalizeData.data?.attempt?.overallScore}%`);
    assert(finalizeData.data?.attempt?.isCertified === true, 'Institutional certification awarded');
    assert(finalizeData.data?.certificate?.certificateNumber !== undefined, `Official Certificate Number issued: ${finalizeData.data?.certificate?.certificateNumber}`);

    // 9. Idempotency Check: Second Submission Request
    console.log('\n[Test 9] Phase 2.6: Idempotent Double-Submission Protection:');
    const duplicateRes = await fetch(`${BASE_URL}/attempts/${attemptId}/finalize`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ answers: finalAnswers })
    });
    const duplicateData = await duplicateRes.json();
    assert(duplicateRes.status === 200, 'Duplicate submission request handled gracefully');
    assert(duplicateData.alreadyFinalized === true, 'Server detected attempt was already finalized (Zero duplicate calculation)');
    assert(duplicateData.data?.attempt?.id === attemptId, 'Returned original result safely');

    console.log('\n================================================================');
    console.log(`🎯 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

runRecoveryVerificationTest();
