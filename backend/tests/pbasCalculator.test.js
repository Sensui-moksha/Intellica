/**
 * pbasCalculator.test.js — Unit Tests for PBAS Calculation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Run: node backend/tests/pbasCalculator.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  calculatePBAS,
  calculateSection,
  calculateParameter,
  safeNum,
  cap,
  round2,
  calcLoadScore,
  calcRatioScore,
  calcCountScore,
  calcThresholdScore,
  calcDirectScore,
  calcAmountTierScore,
} = require("../services/pbasCalculator");

const { getRulesForRole, ASSISTANT_PROFESSOR, ASSOCIATE_PROFESSOR, PROFESSOR } = require("../constants/pbasRules");

let passed = 0;
let failed = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

function assertApprox(actual, expected, tolerance, testName) {
  totalTests++;
  if (Math.abs(actual - expected) <= (tolerance || 0.01)) {
    passed++;
    console.log(`  ✅ ${testName} (${actual})`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName} — expected ~${expected}, got ${actual}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  1. UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n🧮 UTILITY FUNCTIONS");

assert(safeNum(null) === 0, "safeNum(null) = 0");
assert(safeNum(undefined) === 0, "safeNum(undefined) = 0");
assert(safeNum("") === 0, 'safeNum("") = 0');
assert(safeNum(NaN) === 0, "safeNum(NaN) = 0");
assert(safeNum(-5) === 0, "safeNum(-5) = 0 (negative)");
assert(safeNum(Infinity) === 0, "safeNum(Infinity) = 0");
assert(safeNum(42) === 42, "safeNum(42) = 42");
assert(safeNum("12.5") === 12.5, 'safeNum("12.5") = 12.5');

assert(cap(120, 100) === 100, "cap(120, 100) = 100");
assert(cap(50, 100) === 50, "cap(50, 100) = 50");
assert(cap(-10, 100) === 0, "cap(-10, 100) = 0");

assertApprox(round2(44.4444), 44.44, 0.001, "round2(44.4444)");
assertApprox(round2(99.999), 100, 0.001, "round2(99.999)");

// ═════════════════════════════════════════════════════════════════════════════
//  2. FORMULA HELPERS
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n📐 FORMULA HELPERS");

// Load-based
{
  const r = calcLoadScore(16, 50, 18);
  assertApprox(r.finalScore, 44.44, 0.01, "loadScore(16, 50, 18) = 44.44");
}
{
  const r = calcLoadScore(20, 50, 18);
  assertApprox(r.finalScore, 50, 0.01, "loadScore(20, 50, 18) capped at 50");
}
{
  const r = calcLoadScore(10, 50, 0);
  assert(r.finalScore === 0, "loadScore with zero denominator = 0");
}

// Ratio-based
{
  const r = calcRatioScore(45, 50, 50);
  assertApprox(r.finalScore, 45, 0.01, "ratioScore(45/50 × 50) = 45");
}
{
  const r = calcRatioScore(55, 50, 50);
  assertApprox(r.finalScore, 50, 0.01, "ratioScore(55/50 × 50) capped at 50");
}
{
  const r = calcRatioScore(10, 0, 50);
  assert(r.finalScore === 0, "ratioScore division by zero = 0");
}

// Count-based
{
  const r = calcCountScore(3, 10, 40);
  assertApprox(r.finalScore, 30, 0.01, "countScore(3 × 10, max 40) = 30");
}
{
  const r = calcCountScore(10, 10, 40);
  assertApprox(r.finalScore, 40, 0.01, "countScore(10 × 10, max 40) capped at 40");
}
{
  const r = calcCountScore(100, 15, 60);
  assertApprox(r.finalScore, 60, 0.01, "countScore(100 × 15, max 60) capped at 60");
}

// Threshold-based
{
  const thresholds = [
    { min: 0, max: 59.99, score: 0 },
    { min: 60, max: 69.99, score: 35 },
    { min: 70, max: 79.99, score: 45 },
    { min: 80, max: 89.99, score: 55 },
    { min: 90, max: 94.99, score: 65 },
    { min: 95, max: 99.99, score: 70 },
    { min: 100, max: 100, score: 75 },
  ];

  assert(calcThresholdScore(59.99, thresholds, 75).finalScore === 0, "threshold 59.99% = 0");
  assert(calcThresholdScore(60, thresholds, 75).finalScore === 35, "threshold 60% = 35");
  assert(calcThresholdScore(69.99, thresholds, 75).finalScore === 35, "threshold 69.99% = 35");
  assert(calcThresholdScore(70, thresholds, 75).finalScore === 45, "threshold 70% = 45");
  assert(calcThresholdScore(79.99, thresholds, 75).finalScore === 45, "threshold 79.99% = 45");
  assert(calcThresholdScore(80, thresholds, 75).finalScore === 55, "threshold 80% = 55");
  assert(calcThresholdScore(89.99, thresholds, 75).finalScore === 55, "threshold 89.99% = 55");
  assert(calcThresholdScore(90, thresholds, 75).finalScore === 65, "threshold 90% = 65");
  assert(calcThresholdScore(94.99, thresholds, 75).finalScore === 65, "threshold 94.99% = 65");
  assert(calcThresholdScore(95, thresholds, 75).finalScore === 70, "threshold 95% = 70");
  assert(calcThresholdScore(99, thresholds, 75).finalScore === 70, "threshold 99% = 70");
  assert(calcThresholdScore(100, thresholds, 75).finalScore === 75, "threshold 100% = 75");
}

// Direct
{
  const r = calcDirectScore(42, 50);
  assertApprox(r.finalScore, 42, 0.01, "directScore(42, max 50) = 42");
}
{
  const r = calcDirectScore(60, 50);
  assertApprox(r.finalScore, 50, 0.01, "directScore(60, max 50) capped at 50");
}

// Amount tier
{
  const tiers = [
    { min: 500001, max: Infinity, score: 40 },
    { min: 200001, max: 500000, score: 30 },
    { min: 0, max: 200000, score: 20 },
  ];
  assert(calcAmountTierScore(100000, tiers, 60, 1).finalScore === 20, "amountTier ₹1L = 20");
  assert(calcAmountTierScore(300000, tiers, 60, 1).finalScore === 30, "amountTier ₹3L = 30");
  assert(calcAmountTierScore(600000, tiers, 60, 1).finalScore === 40, "amountTier ₹6L = 40");
  assert(calcAmountTierScore(600000, tiers, 60, 0.5).finalScore === 20, "amountTier ₹6L Co-PI (50%) = 20");
}

// ═════════════════════════════════════════════════════════════════════════════
//  3. ASSISTANT PROFESSOR — Full Calculation
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n🎓 ASSISTANT PROFESSOR");

{
  const result = calculatePBAS("ASSISTANT_PROFESSOR", {
    teaching: {
      weeklyTeachingLoad: { theoryLoad: 16, labLoad: 4 },
      lecturesTaken: { lecturesHandled: 45, lecturesPlanned: 50 },
      courseFile: { compliantItems: 10 },
      examDuties: { dutiesPerformed: 8, dutiesAllotted: 10 },
      innovativeTeaching: { pptAnimations: 20, rolePlayPBL: 25 },
      remedialActivities: { qualifyingActivities: 4 },
      counseling: { counselingSessions: 3 },
      passPercentage: { passPercentage: 85 },
      studentFeedback: { feedbackScore: 78 },
    },
    professional: {
      professionalMembership: { memberships: 2 },
      shortTermCourses: { shortTermScore: 40 },
      industrialActivity: { industrialVisits: 1, industrialTours: 1 },
      coCurricular: { coCurricularActivities: 2 },
      nptel: { nptelCertifications: 1 },
    },
    research: {
      books: { booksSoleAuthor: 1, booksMultipleAuthor: 0, chapterSoleAuthor: 1, chapterMultipleAuthor: 0 },
      researchPublications: { intlJournalHighIF: 2, intlJournalLowIF: 1, natlJournalHighIF: 0, natlJournalLowIF: 1 },
      sponsoredResearch: { projectAmount: 300000, roleInProject: "PI" },
      consultancy: { consultancyAmount: 150000 },
      patents: { patentScore: 15 },
    },
    administrative: {
      adminScore: { adminScore: 70 },
    },
  });

  assert(result.success === true, "ASST PROF: calculation succeeds");
  assert(result.role === "ASSISTANT_PROFESSOR", "ASST PROF: correct role returned");
  assert(result.totalMax === 1000, "ASST PROF: totalMax = 1000");
  assert(result.totalScore <= 1000, "ASST PROF: total <= 1000");
  assert(result.totalScore > 0, "ASST PROF: total > 0");
  assert(result.sections.length === 4, "ASST PROF: 4 sections");

  const teaching = result.sections.find(s => s.key === "teaching");
  assert(teaching.maxScore === 500, "ASST PROF teaching max = 500");
  assert(teaching.finalScore <= 500, "ASST PROF teaching <= 500");

  const prof = result.sections.find(s => s.key === "professional");
  assert(prof.maxScore === 150, "ASST PROF professional max = 150");

  const res = result.sections.find(s => s.key === "research");
  assert(res.maxScore === 250, "ASST PROF research max = 250");

  const admin = result.sections.find(s => s.key === "administrative");
  assert(admin.maxScore === 100, "ASST PROF admin max = 100");

  // Verify specific parameter calculations
  const weeklyLoad = teaching.parameters.find(p => p.key === "weeklyTeachingLoad");
  // 16 + (4 * 0.5) = 18 → (18 * 50) / 18 = 50
  assertApprox(weeklyLoad.finalScore, 50, 0.01, "ASST PROF weeklyLoad = 50");

  const lectures = teaching.parameters.find(p => p.key === "lecturesTaken");
  // (45 / 50) * 50 = 45
  assertApprox(lectures.finalScore, 45, 0.01, "ASST PROF lectures = 45");

  const courseFile = teaching.parameters.find(p => p.key === "courseFile");
  // 10 * 5 = 50
  assertApprox(courseFile.finalScore, 50, 0.01, "ASST PROF courseFile = 50");

  const counseling = teaching.parameters.find(p => p.key === "counseling");
  // 3 * 10 = 30
  assertApprox(counseling.finalScore, 30, 0.01, "ASST PROF counseling = 30");

  const passPerc = teaching.parameters.find(p => p.key === "passPercentage");
  // 85% → 55
  assertApprox(passPerc.finalScore, 55, 0.01, "ASST PROF passPercentage 85% = 55");

  const feedback = teaching.parameters.find(p => p.key === "studentFeedback");
  // 78% → 45
  assertApprox(feedback.finalScore, 45, 0.01, "ASST PROF feedback 78% = 45");

  // Verify explainability
  assert(weeklyLoad.formulaExplain !== undefined, "ASST PROF: weeklyLoad has formulaExplain");
  assert(weeklyLoad.inputValues !== undefined, "ASST PROF: weeklyLoad has inputValues");
}

// ═════════════════════════════════════════════════════════════════════════════
//  4. ASSOCIATE PROFESSOR — Full Calculation
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n📚 ASSOCIATE PROFESSOR");

{
  const result = calculatePBAS("ASSOCIATE_PROFESSOR", {
    teaching: {
      weeklyTeachingLoad: { theoryLoad: 14, labLoad: 4 },
      lecturesTaken: { lecturesHandled: 40, lecturesPlanned: 50 },
      courseFile: { compliantItems: 8 },
      examDuties: { dutiesPerformed: 7, dutiesAllotted: 10 },
      innovativeTeaching: { innovativeScore: 25 },
      remedialActivities: { qualifyingActivities: 3 },
      counseling: { counselingSessions: 4 },
      passPercentage: { passPercentage: 92 },
      studentFeedback: { feedbackScore: 88 },
    },
  });

  assert(result.success === true, "ASSOC PROF: calculation succeeds");
  assert(result.role === "ASSOCIATE_PROFESSOR", "ASSOC PROF: correct role");
  assert(result.totalMax === 1000, "ASSOC PROF: totalMax = 1000");

  const teaching = result.sections.find(s => s.key === "teaching");
  assert(teaching.maxScore === 425, "ASSOC PROF teaching max = 425");

  // Check lectures — uses ratioMultiplier of 40, not 50
  const lectures = teaching.parameters.find(p => p.key === "lecturesTaken");
  // (40 / 50) * 40 = 32
  assertApprox(lectures.finalScore, 32, 0.01, "ASSOC PROF lectures (×40 formula) = 32");
  assert(lectures.status === "REQUIRES_CLARIFICATION", "ASSOC PROF lectures flagged as REQUIRES_CLARIFICATION");

  // Check innovative teaching — configurable
  const innovative = teaching.parameters.find(p => p.key === "innovativeTeaching");
  assert(innovative.status === "REQUIRES_CLARIFICATION", "ASSOC PROF innovative flagged as REQUIRES_CLARIFICATION");
  assertApprox(innovative.finalScore, 25, 0.01, "ASSOC PROF innovative (manual entry) = 25");

  // courseFile = 8 * 2.5 = 20
  const cf = teaching.parameters.find(p => p.key === "courseFile");
  assertApprox(cf.finalScore, 20, 0.01, "ASSOC PROF courseFile 8×2.5 = 20");

  // Verify sections exist
  const professional = result.sections.find(s => s.key === "professional");
  assert(professional.maxScore === 100, "ASSOC PROF professional max = 100");

  const research = result.sections.find(s => s.key === "research");
  assert(research.maxScore === 325, "ASSOC PROF research max = 325");

  const admin = result.sections.find(s => s.key === "administrative");
  assert(admin.maxScore === 150, "ASSOC PROF admin max = 150");
}

// ═════════════════════════════════════════════════════════════════════════════
//  5. PROFESSOR — Full Calculation
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n🏛️ PROFESSOR");

{
  const result = calculatePBAS("PROFESSOR", {
    teaching: {
      weeklyTeachingLoad: { theoryLoad: 10, labLoad: 4 },
      lecturesTaken: { lecturesHandled: 28, lecturesPlanned: 30 },
      courseFile: { compliantItems: 10 },
      examDuties: { dutiesPerformed: 5, dutiesAllotted: 5 },
      innovativeTeaching: { pptVisuals: 10, nptelVideo: 8, eContent: 15 },
      remedialActivities: { qualifyingActivities: 4 },
      counseling: { counselingSessions: 2 },
      passPercentage: { passPercentage: 100 },
      studentFeedback: { feedbackScore: 95 },
      guidance: { qualifyingActivities: 5 },
    },
  });

  assert(result.success === true, "PROF: calculation succeeds");
  assert(result.role === "PROFESSOR", "PROF: correct role");

  const teaching = result.sections.find(s => s.key === "teaching");
  assert(teaching.maxScore === 350, "PROF teaching max = 350");

  // weeklyLoad: (10 + 4*0.5) = 12 → (12 * 50) / 12 = 50
  const weeklyLoad = teaching.parameters.find(p => p.key === "weeklyTeachingLoad");
  assertApprox(weeklyLoad.finalScore, 50, 0.01, "PROF weeklyLoad = 50 (12 periods)");

  // lectures: (28/30) * 30 = 28
  const lectures = teaching.parameters.find(p => p.key === "lecturesTaken");
  assertApprox(lectures.finalScore, 28, 0.01, "PROF lectures = 28");

  // counseling: 2 * 5 = 10
  const counseling = teaching.parameters.find(p => p.key === "counseling");
  assertApprox(counseling.finalScore, 10, 0.01, "PROF counseling = 10");

  // passPerc: 100% → 45
  const passPerc = teaching.parameters.find(p => p.key === "passPercentage");
  assertApprox(passPerc.finalScore, 45, 0.01, "PROF passPercentage 100% = 45");

  // feedback: 95% → 40
  const fb = teaching.parameters.find(p => p.key === "studentFeedback");
  assertApprox(fb.finalScore, 40, 0.01, "PROF feedback 95% = 40");

  // guidance: 5 * 10 = 50
  const guidance = teaching.parameters.find(p => p.key === "guidance");
  assertApprox(guidance.finalScore, 50, 0.01, "PROF guidance = 50 (capped)");

  // Sections
  assert(result.sections.find(s => s.key === "professional").maxScore === 100, "PROF professional max = 100");
  assert(result.sections.find(s => s.key === "research").maxScore === 350, "PROF research max = 350");
  assert(result.sections.find(s => s.key === "administrative").maxScore === 200, "PROF admin max = 200");
}

// ═════════════════════════════════════════════════════════════════════════════
//  6. INVALID ROLE
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n🚫 INVALID ROLE");

{
  const result = calculatePBAS("INVALID_ROLE", {});
  assert(result.success === false, "Invalid role returns success=false");
  assert(result.error.includes("Invalid"), "Invalid role returns error message");
}

// ═════════════════════════════════════════════════════════════════════════════
//  7. ZERO / MISSING / INVALID INPUTS
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n🔒 ZERO / MISSING / INVALID INPUTS");

{
  const result = calculatePBAS("ASSISTANT_PROFESSOR", {});
  assert(result.success === true, "Empty inputs: calculation still succeeds");
  assert(result.totalScore === 0, "Empty inputs: total = 0");
}

{
  const result = calculatePBAS("ASSISTANT_PROFESSOR", {
    teaching: {
      weeklyTeachingLoad: { theoryLoad: -10, labLoad: NaN },
      lecturesTaken: { lecturesHandled: Infinity, lecturesPlanned: null },
      counseling: { counselingSessions: -5 },
    },
  });
  assert(result.success === true, "Invalid values: calculation succeeds (sanitized)");
  const teaching = result.sections.find(s => s.key === "teaching");
  const wl = teaching.parameters.find(p => p.key === "weeklyTeachingLoad");
  assert(wl.finalScore === 0, "Invalid weeklyLoad sanitized to 0");
  const c = teaching.parameters.find(p => p.key === "counseling");
  assert(c.finalScore === 0, "Negative counseling sanitized to 0");
}

// ═════════════════════════════════════════════════════════════════════════════
//  8. SCORE CAPS
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n🔝 SCORE CAPS");

{
  const result = calculatePBAS("ASSISTANT_PROFESSOR", {
    teaching: {
      courseFile: { compliantItems: 100 }, // 100 * 5 = 500, but max 50
      counseling: { counselingSessions: 20 }, // 20 * 10 = 200, but max 40
      remedialActivities: { qualifyingActivities: 10 }, // 10 * 15 = 150, but max 60
    },
  });

  const teaching = result.sections.find(s => s.key === "teaching");
  const cf = teaching.parameters.find(p => p.key === "courseFile");
  assertApprox(cf.finalScore, 50, 0.01, "courseFile capped at 50 (input 100)");
  
  const c = teaching.parameters.find(p => p.key === "counseling");
  assertApprox(c.finalScore, 40, 0.01, "counseling capped at 40 (input 20)");

  const r = teaching.parameters.find(p => p.key === "remedialActivities");
  assertApprox(r.finalScore, 60, 0.01, "remedialActivities capped at 60 (input 10)");
}

// ═════════════════════════════════════════════════════════════════════════════
//  9. SEMESTER AVERAGING
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n⚖️ SEMESTER AVERAGING");

{
  const result = calculatePBAS("ASSISTANT_PROFESSOR",
    {
      teaching: {
        weeklyTeachingLoad: { theoryLoad: 18, labLoad: 0 }, // score = 50
        passPercentage: { passPercentage: 100 }, // score = 75
      },
    },
    {
      teaching: {
        weeklyTeachingLoad: { theoryLoad: 14, labLoad: 0 }, // (14*50)/18 = 38.89
        passPercentage: { passPercentage: 60 }, // score = 35
      },
    }
  );

  assert(result.success === true, "Semester averaging succeeds");
  const teaching = result.sections.find(s => s.key === "teaching");
  assert(teaching.isAveraged === true, "Teaching section is averaged");

  const wl = teaching.parameters.find(p => p.key === "weeklyTeachingLoad");
  // avg(50, 38.89) = 44.44
  assertApprox(wl.finalScore, 44.44, 0.02, "weeklyLoad averaged = 44.44");

  const pp = teaching.parameters.find(p => p.key === "passPercentage");
  // avg(75, 35) = 55
  assertApprox(pp.finalScore, 55, 0.01, "passPercentage averaged = 55");
}

// ═════════════════════════════════════════════════════════════════════════════
//  10. ROLE TOTALS VERIFICATION
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n🎯 ROLE TOTALS VERIFICATION");

{
  const asst = getRulesForRole("ASSISTANT_PROFESSOR");
  const assoc = getRulesForRole("ASSOCIATE_PROFESSOR");
  const prof = getRulesForRole("PROFESSOR");

  const asstTotal = asst.sections.reduce((s, sec) => s + sec.maxScore, 0);
  assert(asstTotal === 1000, `ASST PROF section maxes sum to ${asstTotal} (expected 1000)`);

  const assocTotal = assoc.sections.reduce((s, sec) => s + sec.maxScore, 0);
  assert(assocTotal === 1000, `ASSOC PROF section maxes sum to ${assocTotal} (expected 1000)`);

  const profTotal = prof.sections.reduce((s, sec) => s + sec.maxScore, 0);
  assert(profTotal === 1000, `PROF section maxes sum to ${profTotal} (expected 1000)`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  11. UNRESOLVED RULES
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n⚠️ UNRESOLVED RULES");

{
  const result = calculatePBAS("ASSOCIATE_PROFESSOR", {
    teaching: {
      lecturesTaken: { lecturesHandled: 40, lecturesPlanned: 50 },
      innovativeTeaching: { innovativeScore: 20 },
    },
  });

  assert(result.unresolvedRules.length > 0, "ASSOC PROF has unresolved rules");
  assert(result.unresolvedRules.some(u => u.key === "associate.lectureScore"), "lectures discrepancy flagged");
  assert(result.unresolvedRules.some(u => u.key === "associate.innovativeTeaching"), "innovative teaching discrepancy flagged");
}

{
  const result = calculatePBAS("ASSISTANT_PROFESSOR", {
    research: { patents: { patentScore: 20 } },
  });

  assert(result.unresolvedRules.some(u => u.key === "assistant.patents"), "ASST PROF patents flagged");
  const patentParam = result.sections
    .find(s => s.key === "research")?.parameters
    .find(p => p.key === "patents");
  assert(patentParam.status === "REQUIRES_CLARIFICATION", "Patent param status = REQUIRES_CLARIFICATION");
  assertApprox(patentParam.finalScore, 20, 0.01, "Patent manual entry = 20");
}

// ═════════════════════════════════════════════════════════════════════════════
//  12. EXPLAINABILITY
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n🔍 EXPLAINABILITY");

{
  const result = calculatePBAS("ASSISTANT_PROFESSOR", {
    teaching: {
      weeklyTeachingLoad: { theoryLoad: 16, labLoad: 4 },
    },
  });

  const wl = result.sections.find(s => s.key === "teaching")?.parameters.find(p => p.key === "weeklyTeachingLoad");
  assert(typeof wl.formulaExplain === "string", "formulaExplain is a string");
  assert(wl.formulaExplain.includes("16"), "formulaExplain references input 16");
  assert(typeof wl.inputValues === "object", "inputValues is an object");
  assert(wl.inputValues.theoryLoad === 16, "inputValues.theoryLoad = 16");
  assert(wl.inputValues.labLoad === 4, "inputValues.labLoad = 4");
  assert(wl.inputValues.effectiveLoad === 18, "inputValues.effectiveLoad = 18");
}

// ═════════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(60));
console.log(`📊 RESULTS: ${passed}/${totalTests} passed, ${failed} failed`);
console.log("═".repeat(60));

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All tests passed!\n");
}
