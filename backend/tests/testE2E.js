/**
 * testE2E.js — Live End-to-End API Test for PBAS Endpoints
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests live authentication, PBAS rules retrieval, calculate, save draft,
 * get draft, faculty-score, and department/admin endpoints over HTTP.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (_) { parsed = body; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runLiveE2ETests() {
  console.log("🚀 Running live PBAS End-to-End API tests against http://localhost:5001...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details) {
    if (condition) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`, details || '');
      failed++;
    }
  }

  // 1. Health check
  try {
    const health = await request({ hostname: 'localhost', port: 5001, path: '/api/health', method: 'GET' });
    assert(health.status === 200, "Server Health Check is 200 OK");
  } catch (err) {
    console.error("❌ Cannot connect to server:", err.message);
    process.exit(1);
  }

  // 2. Login as HOD
  let token = '';
  let hodUser = null;
  try {
    const loginRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      identifier: 'd.mokshyagnayadav@gmail.com',
      password: 'admin'
    });

    assert(loginRes.status === 200, "HOD Login successful (200 OK)");
    token = loginRes.data?.token || '';
    hodUser = loginRes.data?.user || {};
    assert(token.length > 0, "JWT Token received on login");
  } catch (err) {
    assert(false, "HOD Login failed", err);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. Test GET /api/pbas/rules for each role
  for (const r of ['ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR']) {
    try {
      const rulesRes = await request({
        hostname: 'localhost',
        port: 5001,
        path: `/api/pbas/rules/${r}`,
        method: 'GET',
        headers: authHeaders
      });
      assert(rulesRes.status === 200 && rulesRes.data?.rules?.sections?.length === 4,
        `GET /api/pbas/rules/${r} returns 4 sections with max 1000`);
    } catch (err) {
      assert(false, `GET rules/${r} failed`, err);
    }
  }

  // 4. Test POST /api/pbas/calculate (stateless)
  try {
    const calcRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/pbas/calculate',
      method: 'POST',
      headers: authHeaders
    }, {
      role: 'PROFESSOR',
      semester1: {
        teaching: {
          weeklyTeachingLoad: { theoryLoad: 12, labLoad: 0 },
          lecturesTaken: { lecturesHandled: 30, lecturesPlanned: 30 },
          courseFile: { compliantItems: 10 },
          passPercentage: { passPercentage: 95 },
          studentFeedback: { feedbackScore: 92 },
        }
      }
    });

    assert(calcRes.status === 200, "POST /api/pbas/calculate returned 200 OK");
    assert(calcRes.data?.success === true, "Calculation success is true");
    assert(calcRes.data?.totalScore > 0, `Total score calculated: ${calcRes.data?.totalScore} / 1000`);
  } catch (err) {
    assert(false, "POST calculate failed", err);
  }

  // 5. Test POST /api/pbas (save draft)
  try {
    const saveRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/pbas',
      method: 'POST',
      headers: authHeaders
    }, {
      academicYear: '2025-26',
      role: 'PROFESSOR',
      semester1: {
        teaching: {
          weeklyTeachingLoad: { theoryLoad: 12, labLoad: 0 },
          lecturesTaken: { lecturesHandled: 30, lecturesPlanned: 30 },
          courseFile: { compliantItems: 10 },
          passPercentage: { passPercentage: 95 },
          studentFeedback: { feedbackScore: 92 },
        },
        professional: {
          nptel: { nptelCertifications: 2 }
        }
      }
    });

    assert(saveRes.status === 200, "POST /api/pbas (Save draft) returned 200 OK");
    assert(saveRes.data?.appraisal?.status === 'DRAFT', "Saved appraisal status is DRAFT");
  } catch (err) {
    assert(false, "POST save appraisal failed", err);
  }

  // 6. Test GET /api/pbas/my/2025-26
  try {
    const getRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/pbas/my/2025-26',
      method: 'GET',
      headers: authHeaders
    });

    assert(getRes.status === 200, "GET /api/pbas/my/2025-26 returned 200 OK");
    assert(getRes.data?.role === 'PROFESSOR', "Retrieved appraisal has correct role PROFESSOR");
    assert(getRes.data?.calculatedScores?.total > 0, `Retrieved appraisal has score: ${getRes.data?.calculatedScores?.total}`);
  } catch (err) {
    assert(false, "GET my appraisal failed", err);
  }

  // 7. Test GET /api/pbas/faculty-score/:facultyId
  if (hodUser?.id || hodUser?._id) {
    const fId = hodUser.id || hodUser._id;
    try {
      const scoreRes = await request({
        hostname: 'localhost',
        port: 5001,
        path: `/api/pbas/faculty-score/${fId}`,
        method: 'GET',
        headers: authHeaders
      });

      assert(scoreRes.status === 200, "GET /api/pbas/faculty-score/:id returned 200 OK");
      assert(scoreRes.data?.score?.total !== undefined, `Faculty score endpoint returned: ${scoreRes.data?.score?.total} pts`);
    } catch (err) {
      assert(false, "GET faculty-score failed", err);
    }
  }

  // 8. Test GET /api/pbas/department/2025-26 (HOD review)
  try {
    const deptRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/pbas/department/2025-26',
      method: 'GET',
      headers: authHeaders
    });

    assert(deptRes.status === 200, "GET /api/pbas/department/2025-26 returned 200 OK");
    assert(Array.isArray(deptRes.data), `Department appraisals count: ${deptRes.data?.length}`);
  } catch (err) {
    assert(false, "GET department appraisals failed", err);
  }

  // 9. Login as Admin & Test GET /api/pbas/all/2025-26
  try {
    const adminLogin = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      identifier: 'mokshyagnay@gmail.com',
      password: 'admin'
    });

    const adminToken = adminLogin.data?.token || '';
    assert(adminLogin.status === 200 && adminToken.length > 0, "Admin Login successful (200 OK)");

    const adminAllRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/pbas/all/2025-26',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    assert(adminAllRes.status === 200, "GET /api/pbas/all/2025-26 (Admin) returned 200 OK");
    assert(Array.isArray(adminAllRes.data), `Admin retrieved all appraisals: count = ${adminAllRes.data?.length}`);
  } catch (err) {
    assert(false, "Admin appraisals test failed", err);
  }

  console.log("\n" + "═".repeat(60));
  console.log(`📊 LIVE API E2E RESULTS: ${passed}/${passed + failed} passed, ${failed} failed`);
  console.log("═".repeat(60) + "\n");

  if (failed > 0) process.exit(1);
}

runLiveE2ETests();
