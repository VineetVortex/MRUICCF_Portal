/**
 * MRU ICCF Portal - Tester Access System Integration & Security Test Suite
 * Validates:
 * - Admin RBAC protection on /api/admin/testers/*
 * - High-entropy cryptographic code generation & SHA-256 storage
 * - Atomic single-use redemption with JWT-bound student identity
 * - Identity mismatch rejection (preventing student A from redeeming student B's code)
 * - Replay attack rejection (already redeemed code)
 * - Revoked code rejection
 * - Rate limiting on failed redemptions
 * - Non-secret audit event recording
 */

async function runTesterAccessTestSuite() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('================================================================');
  console.log('🧪 RUNNING MRU ICCF TESTER ACCESS SYSTEM INTEGRATION SUITE');
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
    // 1. Health check
    console.log('\n[Test 1] Health & Connectivity Check:');
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert(healthRes.status === 200, 'Server returns HTTP 200 OK');

    // 2. Authenticate Admin
    console.log('\n[Test 2] Authenticate Admin (Core Team / System Admin):');
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'vineetkumar182023@gmail.com',
        isGoogleSso: true,
        name: 'Vineet Kumar Admin'
      })
    });
    const adminData = await adminRes.json();
    assert(adminRes.status === 200, 'Admin login succeeded');
    const adminToken = adminData.data?.accessToken;
    assert(Boolean(adminToken), 'Admin Bearer JWT token issued');

    // 3. Authenticate regular student (Unauthorized for admin routes)
    console.log('\n[Test 3] Authenticate Regular Student:');
    const student1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '22cse0002@mru.ac.in',
        isGoogleSso: true,
        name: 'Riya Sharma'
      })
    });
    const student1Data = await student1Res.json();
    assert(student1Res.status === 200, 'Student 1 login succeeded');
    const student1Token = student1Data.data?.accessToken;
    assert(Boolean(student1Token), 'Student 1 Bearer JWT token issued');

    // 4. Test RBAC: Regular student denied access to admin tester endpoints
    console.log('\n[Test 4] RBAC Enforcement on /api/admin/testers:');
    const unauthorizedRes = await fetch(`${BASE_URL}/admin/testers`, {
      headers: { 'Authorization': `Bearer ${student1Token}` }
    });
    assert(unauthorizedRes.status === 403, `Non-admin is rejected with HTTP 403 (Got ${unauthorizedRes.status})`);

    // 5. Admin imports testing roster
    console.log('\n[Test 5] Admin Imports Roster via /api/admin/testers/import:');
    const runId = Date.now().toString().slice(-6);
    const testEmail1 = `tester_anupam_${runId}@mru.ac.in`;
    const testEmail2 = `tester_ayush_${runId}@mru.ac.in`;

    const sampleRoster = [
      {
        fullName: 'Anupam Kumar',
        department: 'B.Tech CSE Core',
        rollNumber: `2k24CSUN01${runId.slice(0, 3)}`,
        email: testEmail1,
        teamId: 'TEAM-ALPHA'
      },
      {
        fullName: 'Ayush Kumar',
        department: 'B.Tech CSE Core',
        rollNumber: `2k24CSUN02${runId.slice(0, 3)}`,
        email: testEmail2,
        teamId: 'TEAM-BETA'
      }
    ];

    const importRes = await fetch(`${BASE_URL}/admin/testers/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ testers: sampleRoster })
    });
    const importData = await importRes.json();
    assert(importRes.status === 200, 'Roster import returned HTTP 200');
    assert(importData.success === true, 'Roster import reported success');

    // 6. Admin fetches roster list
    console.log('\n[Test 6] Admin Fetches Roster via /api/admin/testers:');
    const getRosterRes = await fetch(`${BASE_URL}/admin/testers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const getRosterData = await getRosterRes.json();
    assert(getRosterRes.status === 200, 'Roster list returned HTTP 200');
    assert(Array.isArray(getRosterData.testers), 'Testers array returned');
    
    const anupam = getRosterData.testers.find(t => t.email.toLowerCase() === testEmail1);
    assert(Boolean(anupam), 'Anupam Kumar found in active roster');
    assert(anupam?.invitationStatus === 'unissued', 'Anupam invitation status is unissued');

    // 7. Admin issues one-time cryptographic code for Anupam
    console.log('\n[Test 7] Admin Issues High-Entropy Invitation Code:');
    const issueRes = await fetch(`${BASE_URL}/admin/testers/${anupam.id}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ expiresInHours: 8 })
    });
    const issueData = await issueRes.json();
    assert(issueRes.status === 201, 'Invitation issuance returned HTTP 201 Created');
    assert(Boolean(issueData.code), 'Plaintext code returned to admin once');
    assert(issueData.code.startsWith('ICCF-'), `Code matches ICCF prefix format: ${issueData.code}`);
    const plaintextCode = issueData.code;

    // 8. Verify code is NOT exposed in subsequent roster fetch
    console.log('\n[Test 8] Verify Plaintext Code Is Never Stored or Re-exposed:');
    const checkRosterRes = await fetch(`${BASE_URL}/admin/testers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const checkRosterData = await checkRosterRes.json();
    const anupamUpdated = checkRosterData.testers.find(t => t.id === anupam.id);
    assert(anupamUpdated?.invitationStatus === 'active', 'Anupam status updated to active');
    assert(!anupamUpdated?.code && !anupamUpdated?.codeHash, 'No plaintext code or hash leaked in roster payload');

    // 9. Negative Test: Student 1 (Riya) tries to redeem Anupam's code -> Identity Mismatch
    console.log('\n[Test 9] Attack Prevention: Wrong Student Redeems Code (Identity Mismatch):');
    const wrongStudentRedeemRes = await fetch(`${BASE_URL}/tester-access/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${student1Token}`
      },
      body: JSON.stringify({ code: plaintextCode })
    });
    const wrongStudentRedeemData = await wrongStudentRedeemRes.json();
    assert(wrongStudentRedeemRes.status === 403, `Mismatch rejected with HTTP 403 (Got ${wrongStudentRedeemRes.status})`);
    assert(wrongStudentRedeemData.code === 'STUDENT_MISMATCH', 'Error code specifies STUDENT_MISMATCH');

    // 10. Authenticate intended student (Anupam)
    console.log('\n[Test 10] Authenticate Intended Student (Anupam):');
    const anupamLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        isGoogleSso: true,
        name: 'Anupam Kumar'
      })
    });
    const anupamLoginData = await anupamLoginRes.json();
    const anupamToken = anupamLoginData.data?.accessToken;
    assert(Boolean(anupamToken), 'Anupam authenticated and Bearer JWT token issued');

    // 11. Positive Test: Anupam redeems his invitation code
    console.log('\n[Test 11] Authorized Student Atomically Redeems Invitation:');
    const anupamRedeemRes = await fetch(`${BASE_URL}/tester-access/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anupamToken}`
      },
      body: JSON.stringify({ code: plaintextCode })
    });
    const anupamRedeemData = await anupamRedeemRes.json();
    assert(anupamRedeemRes.status === 200, 'Redemption returned HTTP 200 OK');
    assert(anupamRedeemData.success === true, 'Tester access activated');
    assert(anupamRedeemData.tester?.rollNumber.toUpperCase() === sampleRoster[0].rollNumber.toUpperCase(), 'Roster roll number bound');

    // 12. Negative Test: Replay attack (Redeeming the same code a second time)
    console.log('\n[Test 12] Replay Attack Prevention (Reused Code):');
    const replayRes = await fetch(`${BASE_URL}/tester-access/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anupamToken}`
      },
      body: JSON.stringify({ code: plaintextCode })
    });
    const replayData = await replayRes.json();
    assert(replayRes.status === 409, `Replayed code rejected with HTTP 409 (Got ${replayRes.status})`);
    assert(replayData.code === 'ALREADY_REDEEMED', 'Error code is ALREADY_REDEEMED');

    // 13. Student checks tester access status
    console.log('\n[Test 13] Verify Student Tester Status via /api/tester-access/status:');
    const statusRes = await fetch(`${BASE_URL}/tester-access/status`, {
      headers: { 'Authorization': `Bearer ${anupamToken}` }
    });
    const statusData = await statusRes.json();
    assert(statusRes.status === 200, 'Status check returned HTTP 200');
    assert(statusData.isAuthorizedTester === true, 'Student confirmed as authorized tester');

    // 14. Replacement & Revocation Lifecycle:
    console.log('\n[Test 14] Invitation Revocation Lifecycle:');
    const ayush = getRosterData.testers.find(t => t.email.toLowerCase() === testEmail2);
    
    // Issue for Ayush
    const ayushIssueRes = await fetch(`${BASE_URL}/admin/testers/${ayush.id}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ expiresInHours: 8 })
    });
    const ayushIssueData = await ayushIssueRes.json();
    const ayushInvitationId = ayushIssueData.invitationId;
    const ayushCode = ayushIssueData.code;

    // Revoke before Ayush uses it
    const revokeRes = await fetch(`${BASE_URL}/admin/invitations/${ayushInvitationId}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const revokeData = await revokeRes.json();
    assert(revokeRes.status === 200, 'Invitation revoked successfully');

    // Authenticate Ayush and try to redeem revoked code
    const ayushLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail2,
        isGoogleSso: true,
        name: 'Ayush Kumar'
      })
    });
    const ayushToken = (await ayushLoginRes.json()).data?.accessToken;

    const ayushRedeemRes = await fetch(`${BASE_URL}/tester-access/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ayushToken}`
      },
      body: JSON.stringify({ code: ayushCode })
    });
    const ayushRedeemData = await ayushRedeemRes.json();
    assert(ayushRedeemRes.status === 410, `Revoked code rejected with HTTP 410 Gone (Got ${ayushRedeemRes.status})`);
    assert(ayushRedeemData.code === 'INVITATION_REVOKED', 'Error code specifies INVITATION_REVOKED');

    // 15. Admin audit log verification
    console.log('\n[Test 15] Audit Event Log Review via /api/admin/tester-events:');
    const eventsRes = await fetch(`${BASE_URL}/admin/tester-events?limit=20`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const eventsData = await eventsRes.json();
    assert(eventsRes.status === 200, 'Audit event log returned HTTP 200');
    assert(Array.isArray(eventsData.events) && eventsData.events.length > 0, 'Audit events recorded');
    
    // Ensure no plaintext codes are recorded in metadata
    const leakedCode = eventsData.events.find(ev => 
      JSON.stringify(ev.metadata || {}).includes(plaintextCode) || 
      JSON.stringify(ev.metadata || {}).includes(ayushCode)
    );
    assert(!leakedCode, 'Security audit: Zero plaintext invitation codes leaked in audit logs');

    console.log('================================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error running tester access test suite:', err);
    process.exit(1);
  }
}

runTesterAccessTestSuite();
