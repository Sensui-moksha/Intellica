/**
 * pbasRules.js — PBAS (Performance Based Appraisal System) Rule Definitions
 * ─────────────────────────────────────────────────────────────────────────────
 * This file contains the COMPLETE rule configuration for all three faculty
 * designation tiers. It is the single source of truth for PBAS scoring.
 *
 * IMPORTANT: This file does NOT contain calculation logic. It only contains
 * rule metadata and configuration. The calculation engine is in
 * ../services/pbasCalculator.js
 *
 * Rule versioning: Each rule set is tagged with a version and academic year.
 * Historical appraisals retain the rules version under which they were scored.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const RULES_VERSION = "PBAS-v1";
const DEFAULT_ACADEMIC_YEAR = "2025-26";

// ── Formula types used by the calculation engine ────────────────────────────
const FORMULA = {
  LOAD:       "LOAD",       // (input × maxScore) / denominator, capped
  RATIO:      "RATIO",      // (actual / expected) × maxScore, capped
  COUNT:      "COUNT",      // count × pointsPerItem, capped
  THRESHOLD:  "THRESHOLD",  // range-based lookup table
  COMPONENT:  "COMPONENT",  // sum of sub-components (manual entry per component)
  DIRECT:     "DIRECT",     // direct numeric entry, capped at maxScore
  CONFIGURABLE: "CONFIGURABLE", // unresolved — requires institutional clarification
};

// ── Threshold scales ────────────────────────────────────────────────────────
const PASS_PERCENTAGE_SCALE_ASSISTANT = [
  { min: 0,     max: 59.99, score: 0  },
  { min: 60,    max: 69.99, score: 35 },
  { min: 70,    max: 79.99, score: 45 },
  { min: 80,    max: 89.99, score: 55 },
  { min: 90,    max: 94.99, score: 65 },
  { min: 95,    max: 99.99, score: 70 },
  { min: 100,   max: 100,   score: 75 },
];

const PASS_PERCENTAGE_SCALE_ASSOCIATE = [
  { min: 0,     max: 59.99, score: 0  },
  { min: 60,    max: 69.99, score: 30 },
  { min: 70,    max: 79.99, score: 40 },
  { min: 80,    max: 89.99, score: 50 },
  { min: 90,    max: 94.99, score: 60 },
  { min: 95,    max: 99.99, score: 65 },
  { min: 100,   max: 100,   score: 70 },
];

const PASS_PERCENTAGE_SCALE_PROFESSOR = [
  { min: 0,     max: 59.99, score: 0  },
  { min: 60,    max: 69.99, score: 10 },
  { min: 70,    max: 79.99, score: 20 },
  { min: 80,    max: 89.99, score: 30 },
  { min: 90,    max: 94.99, score: 35 },
  { min: 95,    max: 99.99, score: 40 },
  { min: 100,   max: 100,   score: 45 },
];

// ── Sponsored Research Amount Tiers ─────────────────────────────────────────
const SPONSORED_RESEARCH_TIERS_ASSISTANT = [
  { min: 500001, max: Infinity, score: 40, label: "Above ₹5 Lakhs" },
  { min: 200001, max: 500000,   score: 30, label: "₹2–5 Lakhs" },
  { min: 0,      max: 200000,   score: 20, label: "Below ₹2 Lakhs" },
];

const SPONSORED_RESEARCH_TIERS_ASSOC_PROF = [
  { min: 1000001, max: Infinity, score: 80, label: "Above ₹10 Lakhs" },
  { min: 500001,  max: 1000000,  score: 60, label: "₹5–10 Lakhs" },
  { min: 0,       max: 500000,   score: 40, label: "Below ₹5 Lakhs" },
];

const CONSULTANCY_TIERS_ASSISTANT = [
  { min: 300001, max: Infinity, score: 30, label: "Above ₹3 Lakhs" },
  { min: 100001, max: 300000,   score: 20, label: "₹1–3 Lakhs" },
  { min: 0,      max: 100000,   score: 10, label: "Below ₹1 Lakh" },
];

const CONSULTANCY_TIERS_ASSOCIATE = [
  { min: 100001, max: Infinity, score: 35, label: "Above ₹1 Lakh" },
  { min: 0,      max: 100000,   score: 25, label: "Below ₹1 Lakh" },
];

const CONSULTANCY_TIERS_PROFESSOR = [
  { min: 100001, max: Infinity, score: 40, label: "Above ₹1 Lakh" },
  { min: 0,      max: 100000,   score: 20, label: "Below ₹1 Lakh" },
];

const AWARD_TIERS_PROFESSOR = [
  { key: "international", score: 30, label: "International" },
  { key: "national",      score: 20, label: "National" },
  { key: "state",         score: 15, label: "State" },
  { key: "university",    score: 10, label: "University" },
  { key: "college",       score: 5,  label: "College" },
];


// ═══════════════════════════════════════════════════════════════════════════
//  ASSISTANT PROFESSOR RULES — Total: 1000
// ═══════════════════════════════════════════════════════════════════════════
const ASSISTANT_PROFESSOR = {
  role: "ASSISTANT_PROFESSOR",
  label: "Assistant Professor",
  totalMax: 1000,
  sections: [
    // ── SECTION I: Teaching, Learning & Evaluation — 500 ──
    {
      key: "teaching",
      label: "Teaching, Learning & Evaluation",
      maxScore: 500,
      semesterAveraged: true,
      parameters: [
        {
          key: "weeklyTeachingLoad",
          label: "Weekly Teaching Load",
          maxScore: 50,
          formula: FORMULA.LOAD,
          denominator: 18,
          labConversion: 0.5,
          inputFields: [
            { key: "theoryLoad", label: "Theory periods/week", type: "number" },
            { key: "labLoad", label: "Lab periods/week", type: "number" },
          ],
          description: "score = (weeklyLoad × 50) / 18. Lab load counted as 0.5× theory.",
        },
        {
          key: "lecturesTaken",
          label: "Lectures Taken vs Planned",
          maxScore: 50,
          formula: FORMULA.RATIO,
          inputFields: [
            { key: "lecturesHandled", label: "Total lectures handled", type: "number" },
            { key: "lecturesPlanned", label: "Total lectures planned", type: "number" },
          ],
          description: "score = (handled / planned) × 50, capped at 50.",
        },
        {
          key: "courseFile",
          label: "Course File Compliance",
          maxScore: 50,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "compliantItems", label: "Compliant items (out of 10)", type: "number", max: 10 },
          ],
          description: "10 compliance items, 5 points each. Max = 50.",
        },
        {
          key: "examDuties",
          label: "Exam Duties / Internal Observer / Moderator",
          maxScore: 50,
          formula: FORMULA.RATIO,
          inputFields: [
            { key: "dutiesPerformed", label: "Duties performed", type: "number" },
            { key: "dutiesAllotted", label: "Duties allotted", type: "number" },
          ],
          description: "score = (performed / allotted) × 50, capped at 50.",
        },
        {
          key: "innovativeTeaching",
          label: "Innovative Teaching Methods",
          maxScore: 50,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "pptAnimations", label: "PPT / Animations / NPTEL / Video Lectures", maxScore: 20 },
            { key: "rolePlayPBL", label: "Role Play / Project Based Learning / Quiz", maxScore: 30 },
          ],
          description: "PPT/Animations/NPTEL/Video = 20, Role Play/PBL/Quiz = 30. Total max = 50.",
        },
        {
          key: "remedialActivities",
          label: "Remedial / Bridge / Career / Beyond Syllabus / Design of Experiments / Projects",
          maxScore: 60,
          formula: FORMULA.COUNT,
          pointsPerItem: 15,
          inputFields: [
            { key: "qualifyingActivities", label: "Qualifying activities (any four)", type: "number", max: 4 },
          ],
          description: "Any four qualifying activities × 15 points each. Max = 60.",
        },
        {
          key: "counseling",
          label: "Counseling Sessions",
          maxScore: 40,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "counselingSessions", label: "Number of sessions", type: "number" },
          ],
          description: "Each session = 10 points. Max = 40.",
        },
        {
          key: "passPercentage",
          label: "Pass Percentage",
          maxScore: 75,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_ASSISTANT,
          inputFields: [
            { key: "passPercentage", label: "Pass percentage (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Threshold-based: <60=0, 60-70=35, 70-80=45, 80-90=55, 90-95=65, 95-99=70, 100=75.",
        },
        {
          key: "studentFeedback",
          label: "Student Feedback Score",
          maxScore: 75,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_ASSISTANT,
          inputFields: [
            { key: "feedbackScore", label: "Feedback score (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Same scale as pass percentage. Max = 75.",
        },
      ],
    },

    // ── SECTION II: Professional Development & Co-Curricular — 150 ──
    {
      key: "professional",
      label: "Professional Development & Co-Curricular",
      maxScore: 150,
      semesterAveraged: false,
      parameters: [
        {
          key: "professionalMembership",
          label: "Professional Society Membership",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "memberships", label: "Number of memberships", type: "number" },
          ],
          description: "Each membership = 5 points. Max = 10.",
        },
        {
          key: "shortTermCourses",
          label: "Short-term Courses / Conferences / FDP / Workshops",
          maxScore: 60,
          formula: FORMULA.DIRECT,
          inputFields: [
            { key: "shortTermScore", label: "Score (per appraisal form rules)", type: "number" },
          ],
          description: "Use exact activity-specific points from the appraisal form. Max = 60.",
        },
        {
          key: "industrialActivity",
          label: "Industrial Visit / Tour",
          maxScore: 10,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "industrialVisits", label: "Industrial Visits (5 pts each)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "industrialTours", label: "Industrial Tours (10 pts each)", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Visits = 5 pts, Tours = 10 pts. Combined max = 10.",
        },
        {
          key: "coCurricular",
          label: "Aagama / Working Model Exhibition / Co-curricular",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "coCurricularActivities", label: "Number of activities", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "nptel",
          label: "NPTEL Certification",
          maxScore: 20,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "nptelCertifications", label: "Number of NPTEL certifications", type: "number" },
          ],
          description: "10 points per certification. Max = 20.",
        },
      ],
    },

    // ── SECTION III: Research & Academic Contributions — 250 ──
    {
      key: "research",
      label: "Research & Academic Contributions",
      maxScore: 250,
      semesterAveraged: false,
      parameters: [
        {
          key: "books",
          label: "Books Published",
          maxScore: 50,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "booksSoleAuthor", label: "Books (Sole Author) — 20 pts each", maxScore: 50, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "booksMultipleAuthor", label: "Books (Multiple Authors) — 10 pts each", maxScore: 50, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "chapterSoleAuthor", label: "Book Chapter (Sole) — 10 pts each", maxScore: 50, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "chapterMultipleAuthor", label: "Book Chapter (Multiple) — 5 pts each", maxScore: 50, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "Sole author book=20, Multiple=10, Chapter sole=10, Chapter multiple=5.",
        },
        {
          key: "researchPublications",
          label: "Research Publications",
          maxScore: 100,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "intlJournalHighIF", label: "International Journal (IF > 1) — 30 pts each", maxScore: 100, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "intlJournalLowIF", label: "International Journal (IF < 1) — 25 pts each", maxScore: 100, pointsPerItem: 25, formula: FORMULA.COUNT },
            { key: "natlJournalHighIF", label: "National Journal (IF > 1) — 20 pts each", maxScore: 100, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "natlJournalLowIF", label: "National Journal (IF < 1) — 15 pts each", maxScore: 100, pointsPerItem: 15, formula: FORMULA.COUNT },
          ],
          description: "Intl IF>1=30, IF<1=25, Natl IF>1=20, IF<1=15. Max = 100.",
        },
        {
          key: "sponsoredResearch",
          label: "Sponsored Research Projects",
          maxScore: 60,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "projectAmount", label: "Project amount (₹)", maxScore: 60, formula: FORMULA.DIRECT },
            { key: "roleInProject", label: "Role", maxScore: 60, formula: FORMULA.DIRECT, options: [
              { value: "PI", label: "Principal Investigator (100%)", multiplier: 1.0 },
              { value: "CO_PI", label: "Co-PI (50%)", multiplier: 0.5 },
            ]},
          ],
          amountTiers: SPONSORED_RESEARCH_TIERS_ASSISTANT,
          description: "Above ₹5L=40, ₹2-5L=30, Below ₹2L=20. PI=100%, Co-PI=50%. Max=60.",
        },
        {
          key: "consultancy",
          label: "Consultancy",
          maxScore: 30,
          formula: FORMULA.DIRECT,
          amountTiers: CONSULTANCY_TIERS_ASSISTANT,
          inputFields: [
            { key: "consultancyAmount", label: "Consultancy amount (₹)", type: "number" },
          ],
          description: "<₹1L=10, >₹1L=20, >₹3L=30. Max = 30.",
        },
        {
          key: "patents",
          label: "Patents",
          maxScore: 30,
          formula: FORMULA.CONFIGURABLE,
          status: "REQUIRES_CLARIFICATION",
          clarificationNote: "The appraisal form specifies maximum score of 30 but does not provide the complete per-patent scoring formula. Score must be entered manually until institutional clarification is received.",
          inputFields: [
            { key: "patentScore", label: "Patent score (manual entry)", type: "number" },
          ],
          description: "Max = 30. UNRESOLVED: No per-patent formula provided in appraisal form.",
        },
      ],
    },

    // ── SECTION IV: Administrative & Extension — 100 ──
    {
      key: "administrative",
      label: "Administrative & Extension Activities",
      maxScore: 100,
      semesterAveraged: false,
      parameters: [
        {
          key: "adminScore",
          label: "Administrative & Extension Activities",
          maxScore: 100,
          formula: FORMULA.DIRECT,
          inputFields: [
            { key: "adminScore", label: "Administrative score", type: "number" },
          ],
          description: "Enter total administrative & extension activities score. Max = 100.",
        },
      ],
    },
  ],
};


// ═══════════════════════════════════════════════════════════════════════════
//  ASSOCIATE PROFESSOR RULES — Total: 1000
// ═══════════════════════════════════════════════════════════════════════════
const ASSOCIATE_PROFESSOR = {
  role: "ASSOCIATE_PROFESSOR",
  label: "Associate Professor",
  totalMax: 1000,
  sections: [
    // ── SECTION I: Teaching, Learning & Evaluation — 425 ──
    {
      key: "teaching",
      label: "Teaching, Learning & Evaluation",
      maxScore: 425,
      semesterAveraged: true,
      parameters: [
        {
          key: "weeklyTeachingLoad",
          label: "Weekly Teaching Load",
          maxScore: 50,
          formula: FORMULA.LOAD,
          denominator: 16,
          labConversion: 0.5,
          inputFields: [
            { key: "theoryLoad", label: "Theory periods/week", type: "number" },
            { key: "labLoad", label: "Lab periods/week", type: "number" },
          ],
          description: "score = (weeklyLoad × 50) / 16. Lab load counted as 0.5× theory.",
        },
        {
          key: "lecturesTaken",
          label: "Lectures Taken vs Planned",
          maxScore: 50,
          formula: FORMULA.RATIO,
          ratioMultiplier: 40,
          status: "REQUIRES_CLARIFICATION",
          clarificationNote: "INCONSISTENCY: Stated maximum = 50, but the printed formula in the appraisal form uses multiplier ×40. Implementing with ×40 as printed, but max may need to be adjusted to 40 or multiplier to 50 pending institutional clarification.",
          inputFields: [
            { key: "lecturesHandled", label: "Total lectures handled", type: "number" },
            { key: "lecturesPlanned", label: "Total lectures planned", type: "number" },
          ],
          description: "score = (handled / planned) × 40, capped at 50. WARNING: form inconsistency.",
        },
        {
          key: "courseFile",
          label: "Course File Compliance",
          maxScore: 20,
          formula: FORMULA.COUNT,
          pointsPerItem: 2.5,
          inputFields: [
            { key: "compliantItems", label: "Compliant items (out of 10)", type: "number", max: 10 },
          ],
          description: "10 items × 2.5 points each. Max = 20.",
        },
        {
          key: "examDuties",
          label: "Exam Duties",
          maxScore: 30,
          formula: FORMULA.RATIO,
          inputFields: [
            { key: "dutiesPerformed", label: "Duties performed", type: "number" },
            { key: "dutiesAllotted", label: "Duties allotted", type: "number" },
          ],
          description: "score = (performed / allotted) × 30, capped at 30.",
        },
        {
          key: "innovativeTeaching",
          label: "Innovative Teaching Methods",
          maxScore: 35,
          formula: FORMULA.CONFIGURABLE,
          status: "REQUIRES_CLARIFICATION",
          clarificationNote: "INCONSISTENCY: The form states maximum = 35, but the listed component values do not appear to reconcile to 35. Points are not redistributed — enter score manually until clarified.",
          inputFields: [
            { key: "innovativeScore", label: "Innovative teaching score (manual)", type: "number" },
          ],
          description: "Max = 35. UNRESOLVED: Component breakdown inconsistent in appraisal form.",
        },
        {
          key: "remedialActivities",
          label: "Remedial / Bridge / Career / Beyond Syllabus / Design of Experiments",
          maxScore: 60,
          formula: FORMULA.COUNT,
          pointsPerItem: 15,
          inputFields: [
            { key: "qualifyingActivities", label: "Qualifying activities (any four)", type: "number", max: 4 },
          ],
          description: "Any four × 15 points. Max = 60.",
        },
        {
          key: "counseling",
          label: "Counseling Sessions",
          maxScore: 40,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "counselingSessions", label: "Number of sessions", type: "number" },
          ],
          description: "Each session = 10 points. Max = 40.",
        },
        {
          key: "passPercentage",
          label: "Pass Percentage",
          maxScore: 70,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_ASSOCIATE,
          inputFields: [
            { key: "passPercentage", label: "Pass percentage (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Threshold: <60=0, 60-70=30, 70-80=40, 80-90=50, 90-95=60, 95-99=65, 100=70.",
        },
        {
          key: "studentFeedback",
          label: "Student Feedback Score",
          maxScore: 70,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_ASSOCIATE,
          inputFields: [
            { key: "feedbackScore", label: "Feedback score (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Same scale as pass percentage. Max = 70.",
        },
      ],
    },

    // ── SECTION II: Professional Development & Co-Curricular — 100 ──
    {
      key: "professional",
      label: "Professional Development & Co-Curricular",
      maxScore: 100,
      semesterAveraged: false,
      parameters: [
        {
          key: "professionalMembership",
          label: "Professional Society Membership",
          maxScore: 10,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "nationalMemberships", label: "National (2.5 pts each)", maxScore: 10, pointsPerItem: 2.5, formula: FORMULA.COUNT },
            { key: "internationalMemberships", label: "International (5 pts each)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "National = 2.5 pts, International = 5 pts. Max = 10.",
        },
        {
          key: "shortTermCourses",
          label: "Short-term Courses / Conferences / FDP / Workshops",
          maxScore: 30,
          formula: FORMULA.DIRECT,
          inputFields: [
            { key: "shortTermScore", label: "Score (per appraisal form rules)", type: "number" },
          ],
          description: "Use exact activity-specific points from the appraisal form. Max = 30.",
        },
        {
          key: "industrialActivity",
          label: "Industrial Visit / Tour",
          maxScore: 10,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "industrialVisits", label: "Industrial Visits (5 pts each)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "industrialTours", label: "Industrial Tours (10 pts each)", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Visits = 5 pts, Tours = 10 pts. Combined max = 10.",
        },
        {
          key: "coCurricular",
          label: "Co-curricular Activities",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "coCurricularActivities", label: "Number of activities", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "nptel",
          label: "NPTEL Certification",
          maxScore: 20,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "nptelCertifications", label: "Number of NPTEL certifications", type: "number" },
          ],
          description: "10 points per certification. Max = 20.",
        },
      ],
    },

    // ── SECTION III: Research & Academic Contributions — 325 ──
    {
      key: "research",
      label: "Research & Academic Contributions",
      maxScore: 325,
      semesterAveraged: false,
      parameters: [
        {
          key: "books",
          label: "Books Published",
          maxScore: 50,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "booksSoleAuthor", label: "Books (Sole Author) — 20 pts each", maxScore: 50, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "booksMultipleAuthor", label: "Books (Multiple Authors) — 10 pts each", maxScore: 50, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "chapterSoleAuthor", label: "Book Chapter (Sole) — 10 pts each", maxScore: 50, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "chapterMultipleAuthor", label: "Book Chapter (Multiple) — 5 pts each", maxScore: 50, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "Sole author=20, Multiple=10, Chapter sole=10, Chapter multiple=5.",
        },
        {
          key: "researchPublications",
          label: "Research Publications",
          maxScore: 80,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "intlJournalHighIF", label: "International Journal (IF > 1) — 30 pts each", maxScore: 80, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "intlJournalLowIF", label: "International Journal (IF < 1) — 25 pts each", maxScore: 80, pointsPerItem: 25, formula: FORMULA.COUNT },
            { key: "natlJournalHighIF", label: "National Journal (IF > 1) — 15 pts each", maxScore: 80, pointsPerItem: 15, formula: FORMULA.COUNT },
            { key: "natlJournalLowIF", label: "National Journal (IF < 1) — 10 pts each", maxScore: 80, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Intl IF>1=30, IF<1=25, Natl IF>1=15, IF<1=10. Max = 80.",
        },
        {
          key: "sponsoredResearch",
          label: "Sponsored Research Projects",
          maxScore: 80,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "projectAmount", label: "Project amount (₹)", maxScore: 80, formula: FORMULA.DIRECT },
            { key: "roleInProject", label: "Role", maxScore: 80, formula: FORMULA.DIRECT, options: [
              { value: "PI", label: "Principal Investigator (100%)", multiplier: 1.0 },
              { value: "CO_PI", label: "Co-PI (50%)", multiplier: 0.5 },
            ]},
          ],
          amountTiers: SPONSORED_RESEARCH_TIERS_ASSOC_PROF,
          description: ">₹10L=80, ₹5-10L=60, <₹5L=40. PI=100%, Co-PI=50%. Max=80.",
        },
        {
          key: "proposalAwaiting",
          label: "Proposal Sanction Awaiting",
          maxScore: 40,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "proposalBaseScore", label: "Base score from sponsored research tier", maxScore: 40, formula: FORMULA.DIRECT },
            { key: "proposalRole", label: "Role", maxScore: 40, formula: FORMULA.DIRECT, options: [
              { value: "KEY_MEMBER", label: "Key Member (50%)", multiplier: 0.5 },
              { value: "OTHER", label: "Other (25%)", multiplier: 0.25 },
            ]},
          ],
          description: "Key member = 50%, Other = 25% of sponsored research tier score.",
        },
        {
          key: "phdGuidance",
          label: "PhD Guidance",
          maxScore: 30,
          formula: FORMULA.COUNT,
          pointsPerItem: 15,
          inputFields: [
            { key: "phdCandidates", label: "Number of PhD candidates", type: "number" },
          ],
          description: "15 points per candidate. Max = 30.",
        },
        {
          key: "proceedings",
          label: "Conference Proceedings",
          maxScore: 40,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "intlOutsideCountry", label: "International (outside country) — 40 pts each", maxScore: 40, pointsPerItem: 40, formula: FORMULA.COUNT },
            { key: "intlWithinCountry", label: "International (within country) — 30 pts each", maxScore: 40, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "national", label: "National — 25 pts each", maxScore: 40, pointsPerItem: 25, formula: FORMULA.COUNT },
          ],
          description: "Intl outside=40, Intl within=30, National=25. Max = 40.",
        },
        {
          key: "consultancy",
          label: "Consultancy",
          maxScore: 35,
          formula: FORMULA.DIRECT,
          amountTiers: CONSULTANCY_TIERS_ASSOCIATE,
          inputFields: [
            { key: "consultancyAmount", label: "Consultancy amount (₹)", type: "number" },
          ],
          description: "<₹1L=25, >₹1L=35. Max = 35.",
        },
        {
          key: "patents",
          label: "Patents",
          maxScore: 30,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "patentsApplied", label: "Patents Applied — 15 pts each", maxScore: 30, pointsPerItem: 15, formula: FORMULA.COUNT },
            { key: "patentsAwarded", label: "Patents Awarded — 30 pts each", maxScore: 30, pointsPerItem: 30, formula: FORMULA.COUNT },
          ],
          description: "Applied = 15, Awarded = 30. Max = 30.",
        },
      ],
    },

    // ── SECTION IV: Administrative & Extension — 150 ──
    {
      key: "administrative",
      label: "Administrative & Extension Activities",
      maxScore: 150,
      semesterAveraged: false,
      parameters: [
        {
          key: "deptAdmin",
          label: "Department Administration",
          maxScore: 60,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "deptCoordinator", label: "Coordinator activities (20 pts each)", maxScore: 60, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "deptOther", label: "Other activities (10 pts each)", maxScore: 60, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Coordinator = 20, Other = 10 per activity. Max = 60.",
        },
        {
          key: "instAdmin",
          label: "Institutional Administration",
          maxScore: 70,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "instCoordinator", label: "Coordinator activities (10 pts each)", maxScore: 70, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "instOther", label: "Other activities (5 pts each)", maxScore: 70, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "Coordinator = 10, Other = 5 per activity. Max = 70.",
        },
        {
          key: "nss",
          label: "NSS Activities",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "nssActivities", label: "Number of NSS activities", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "trainingPlacement",
          label: "Training & Placement",
          maxScore: 10,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "tpCoordinator", label: "Department coordinator (10 pts)", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "tpOther", label: "Others (5 pts each)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "tpActivities", label: "Other qualifying activities (10 pts each)", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Coordinator=10, Others=5, Other activities=10 each. Max=10.",
        },
      ],
    },
  ],
};


// ═══════════════════════════════════════════════════════════════════════════
//  PROFESSOR RULES — Total: 1000
// ═══════════════════════════════════════════════════════════════════════════
const PROFESSOR = {
  role: "PROFESSOR",
  label: "Professor",
  totalMax: 1000,
  sections: [
    // ── SECTION I: Teaching, Learning & Evaluation — 350 ──
    {
      key: "teaching",
      label: "Teaching, Learning & Evaluation",
      maxScore: 350,
      semesterAveraged: true,
      parameters: [
        {
          key: "weeklyTeachingLoad",
          label: "Weekly Teaching Load",
          maxScore: 50,
          formula: FORMULA.LOAD,
          denominator: 12,
          labConversion: 0.5,
          inputFields: [
            { key: "theoryLoad", label: "Theory periods/week", type: "number" },
            { key: "labLoad", label: "Lab periods/week", type: "number" },
          ],
          description: "score = (weeklyLoad × 50) / 12. Lab load counted as 0.5× theory.",
        },
        {
          key: "lecturesTaken",
          label: "Lectures Taken vs Allocated",
          maxScore: 30,
          formula: FORMULA.RATIO,
          inputFields: [
            { key: "lecturesHandled", label: "Total lectures taken", type: "number" },
            { key: "lecturesPlanned", label: "Allocated lectures", type: "number" },
          ],
          description: "score = (taken / allocated) × 30, capped at 30.",
        },
        {
          key: "courseFile",
          label: "Course File Compliance",
          maxScore: 20,
          formula: FORMULA.COUNT,
          pointsPerItem: 2.5,
          inputFields: [
            { key: "compliantItems", label: "Compliant items (out of 10)", type: "number", max: 10 },
          ],
          description: "10 items × 2.5 points each. Max = 20.",
        },
        {
          key: "examDuties",
          label: "Exam Duties",
          maxScore: 20,
          formula: FORMULA.RATIO,
          inputFields: [
            { key: "dutiesPerformed", label: "Duties performed", type: "number" },
            { key: "dutiesAllotted", label: "Duties allotted", type: "number" },
          ],
          description: "score = (performed / allotted) × 20, capped at 20.",
        },
        {
          key: "innovativeTeaching",
          label: "Innovative Teaching Methods",
          maxScore: 40,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "pptVisuals", label: "PPT / Visuals / Animations / Other", maxScore: 10 },
            { key: "nptelVideo", label: "NPTEL / Video Lectures", maxScore: 10 },
            { key: "eContent", label: "E-content Development", maxScore: 20 },
          ],
          description: "PPT/Visuals=10, NPTEL/Video=10, E-content=20. Total = 40.",
        },
        {
          key: "remedialActivities",
          label: "Remedial / Bridge / Career / Beyond Syllabus / Design of Experiments",
          maxScore: 40,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "qualifyingActivities", label: "Qualifying activities", type: "number" },
          ],
          description: "10 points each. Max = 40.",
        },
        {
          key: "counseling",
          label: "Counseling Sessions",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "counselingSessions", label: "Number of sessions", type: "number" },
          ],
          description: "Each session = 5 points. Max = 10.",
        },
        {
          key: "passPercentage",
          label: "Pass Percentage",
          maxScore: 45,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_PROFESSOR,
          inputFields: [
            { key: "passPercentage", label: "Pass percentage (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Threshold: <60=0, 60-70=10, 70-80=20, 80-90=30, 90-95=35, 95-99=40, 100=45.",
        },
        {
          key: "studentFeedback",
          label: "Student Feedback Score",
          maxScore: 45,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_PROFESSOR,
          inputFields: [
            { key: "feedbackScore", label: "Feedback score (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Same scale as pass percentage. Max = 45.",
        },
        {
          key: "guidance",
          label: "Guidance (UG/PG Projects)",
          maxScore: 50,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "qualifyingActivities", label: "Number of guided projects", type: "number" },
          ],
          description: "10 points each. Max = 50.",
        },
      ],
    },

    // ── SECTION II: Professional Development & Co-Curricular — 100 ──
    {
      key: "professional",
      label: "Professional Development & Co-Curricular",
      maxScore: 100,
      semesterAveraged: false,
      parameters: [
        {
          key: "professionalMembership",
          label: "Professional Society Membership",
          maxScore: 10,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "nationalMemberships", label: "National (2.5 pts each)", maxScore: 10, pointsPerItem: 2.5, formula: FORMULA.COUNT },
            { key: "internationalMemberships", label: "International (5 pts each)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "National = 2.5, International = 5. Max = 10.",
        },
        {
          key: "conferencePresentation",
          label: "Conference Presentations",
          maxScore: 15,
          formula: FORMULA.COUNT,
          pointsPerItem: 7.5,
          inputFields: [
            { key: "presentations", label: "Number of presentations", type: "number" },
          ],
          description: "7.5 points each. Max = 15.",
        },
        {
          key: "conferenceOrganized",
          label: "Conferences Organized",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "conferencesOrganized", label: "Number organized", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "workshopAttended",
          label: "Workshop / FDP / STTP / Seminar / Guest Lecture Attended",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "workshopsAttended", label: "Number attended", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "workshopOrganized",
          label: "Workshop / FDP / STTP / Seminar / Guest Lecture Organized",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "workshopsOrganized", label: "Number organized", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "industrialActivity",
          label: "Industrial Visit / Tour",
          maxScore: 10,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "industrialVisits", label: "Industrial Visits (5 pts each)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "industrialTours", label: "Industrial Tours (10 pts each)", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Visits = 5 pts, Tours = 10 pts. Combined max = 10.",
        },
        {
          key: "coCurricular",
          label: "Aagama / Working Model / Co-curricular",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "coCurricularActivities", label: "Number of activities", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "studentInnovation",
          label: "Student Innovation Activities",
          maxScore: 5,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "studentInnovations", label: "Number of activities", type: "number" },
          ],
          description: "5 points each. Max = 5.",
        },
        {
          key: "nptel",
          label: "NPTEL Certification",
          maxScore: 20,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "nptelCertifications", label: "Number of NPTEL certifications", type: "number" },
          ],
          description: "10 points per certification. Max = 20.",
        },
      ],
    },

    // ── SECTION III: Research & Academic Contributions — 350 ──
    {
      key: "research",
      label: "Research & Academic Contributions",
      maxScore: 350,
      semesterAveraged: false,
      parameters: [
        {
          key: "books",
          label: "Books Published",
          maxScore: 60,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "booksSoleAuthor", label: "Books (Sole Author) — 30 pts each", maxScore: 60, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "booksMultipleAuthor", label: "Books (Multiple Authors) — 15 pts each", maxScore: 60, pointsPerItem: 15, formula: FORMULA.COUNT },
            { key: "chapterSoleAuthor", label: "Book Chapter (Sole) — 20 pts each", maxScore: 60, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "chapterMultipleAuthor", label: "Book Chapter (Multiple) — 10 pts each", maxScore: 60, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Sole author=30, Multiple=15, Chapter sole=20, Chapter multiple=10.",
        },
        {
          key: "researchPublications",
          label: "Research Publications",
          maxScore: 80,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "intlJournalHighIF", label: "International Journal (IF > 1) — 30 pts each", maxScore: 80, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "intlJournalLowIF", label: "International Journal (IF < 1) — 25 pts each", maxScore: 80, pointsPerItem: 25, formula: FORMULA.COUNT },
            { key: "natlJournalHighIF", label: "National Journal (IF > 1) — 15 pts each", maxScore: 80, pointsPerItem: 15, formula: FORMULA.COUNT },
            { key: "natlJournalLowIF", label: "National Journal (IF < 1) — 10 pts each", maxScore: 80, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Intl IF>1=30, IF<1=25, Natl IF>1=15, IF<1=10. Max = 80.",
        },
        {
          key: "sponsoredResearch",
          label: "Sponsored Research Projects",
          maxScore: 80,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "projectAmount", label: "Project amount (₹)", maxScore: 80, formula: FORMULA.DIRECT },
            { key: "roleInProject", label: "Role", maxScore: 80, formula: FORMULA.DIRECT, options: [
              { value: "PI", label: "Principal Investigator (100%)", multiplier: 1.0 },
              { value: "CO_PI", label: "Co-PI (50%)", multiplier: 0.5 },
            ]},
          ],
          amountTiers: SPONSORED_RESEARCH_TIERS_ASSOC_PROF,
          description: ">₹10L=80, ₹5-10L=60, <₹5L=40. PI=100%, Co-PI=50%. Max=80.",
        },
        {
          key: "proposalAwaiting",
          label: "Proposal Sanction Awaiting",
          maxScore: 40,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "proposalBaseScore", label: "Base score from sponsored research tier", maxScore: 40, formula: FORMULA.DIRECT },
            { key: "proposalRole", label: "Role", maxScore: 40, formula: FORMULA.DIRECT, options: [
              { value: "KEY_MEMBER", label: "Key Member (50%)", multiplier: 0.5 },
              { value: "OTHER", label: "Other (25%)", multiplier: 0.25 },
            ]},
          ],
          description: "Key member = 50%, Other = 25% of sponsored research tier score.",
        },
        {
          key: "phdGuidance",
          label: "PhD Guidance",
          maxScore: 40,
          formula: FORMULA.COUNT,
          pointsPerItem: 20,
          inputFields: [
            { key: "phdCandidates", label: "Number of PhD candidates", type: "number" },
          ],
          description: "20 points per candidate. Max = 40.",
        },
        {
          key: "proceedings",
          label: "Conference Proceedings",
          maxScore: 40,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "intlOutsideCountry", label: "International (outside country) — 40 pts each", maxScore: 40, pointsPerItem: 40, formula: FORMULA.COUNT },
            { key: "intlWithinCountry", label: "International (within country) — 30 pts each", maxScore: 40, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "national", label: "National — 25 pts each", maxScore: 40, pointsPerItem: 25, formula: FORMULA.COUNT },
          ],
          description: "Intl outside=40, Intl within=30, National=25. Max = 40.",
        },
        {
          key: "consultancy",
          label: "Consultancy",
          maxScore: 40,
          formula: FORMULA.DIRECT,
          amountTiers: CONSULTANCY_TIERS_PROFESSOR,
          inputFields: [
            { key: "consultancyAmount", label: "Consultancy amount (₹)", type: "number" },
          ],
          description: "<₹1L=20, >₹1L=40. Max = 40.",
        },
        {
          key: "patents",
          label: "Patents",
          maxScore: 30,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "patentsApplied", label: "Patents Applied — 15 pts each", maxScore: 30, pointsPerItem: 15, formula: FORMULA.COUNT },
            { key: "patentsAwarded", label: "Patents Awarded — 30 pts each", maxScore: 30, pointsPerItem: 30, formula: FORMULA.COUNT },
          ],
          description: "Applied = 15, Awarded = 30. Max = 30.",
        },
      ],
    },

    // ── SECTION IV: Administrative & Extension — 200 ──
    {
      key: "administrative",
      label: "Administrative & Extension Activities",
      maxScore: 200,
      semesterAveraged: false,
      parameters: [
        {
          key: "deptAdmin",
          label: "Department Administration",
          maxScore: 70,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "deptCoordinator", label: "Coordinator activities (20 pts each)", maxScore: 70, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "deptOther", label: "Other activities (10 pts each)", maxScore: 70, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Coordinator = 20, Other = 10 per activity. Max = 70.",
        },
        {
          key: "instAdmin",
          label: "Institutional Administration",
          maxScore: 70,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "instCoordinator", label: "Coordinator activities (20 pts each)", maxScore: 70, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "instOther", label: "Other activities (10 pts each)", maxScore: 70, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Coordinator = 20, Other = 10 per activity. Max = 70.",
        },
        {
          key: "nss",
          label: "NSS Activities",
          maxScore: 15,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "nssActivities", label: "Number of NSS activities", type: "number" },
          ],
          description: "5 points each. Max = 15.",
        },
        {
          key: "trainingPlacement",
          label: "Training & Placement",
          maxScore: 15,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "tpCoordinator", label: "Department coordinator (10 pts)", maxScore: 15, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "tpOther", label: "Others (5 pts each)", maxScore: 15, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "tpActivities", label: "Other qualifying activities (10 pts each)", maxScore: 15, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Coordinator=10, Others=5, Other activities=10 each. Max=15.",
        },
        {
          key: "awards",
          label: "Awards & Recognitions",
          maxScore: 30,
          formula: FORMULA.COMPONENT,
          awardTiers: AWARD_TIERS_PROFESSOR,
          components: [
            { key: "awardInternational", label: "International (30 pts each)", maxScore: 30, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "awardNational", label: "National (20 pts each)", maxScore: 30, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "awardState", label: "State (15 pts each)", maxScore: 30, pointsPerItem: 15, formula: FORMULA.COUNT },
            { key: "awardUniversity", label: "University (10 pts each)", maxScore: 30, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "awardCollege", label: "College (5 pts each)", maxScore: 30, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "Intl=30, National=20, State=15, University=10, College=5. Max = 30.",
        },
      ],
    },
  ],
};


// ── Designation → PBAS Role mapping ─────────────────────────────────────────
const DESIGNATION_TO_PBAS_ROLE = {
  "assistant professor":    "ASSISTANT_PROFESSOR",
  "asst. professor":        "ASSISTANT_PROFESSOR",
  "asst prof":              "ASSISTANT_PROFESSOR",
  "asst professor":         "ASSISTANT_PROFESSOR",
  "associate professor":    "ASSOCIATE_PROFESSOR",
  "assoc. professor":       "ASSOCIATE_PROFESSOR",
  "assoc professor":        "ASSOCIATE_PROFESSOR",
  "professor":              "PROFESSOR",
  "prof":                   "PROFESSOR",
  "prof.":                  "PROFESSOR",
};

function mapDesignationToRole(designation) {
  if (!designation) return "ASSISTANT_PROFESSOR";
  const normalized = designation.trim().toLowerCase();
  if (DESIGNATION_TO_PBAS_ROLE[normalized]) {
    return DESIGNATION_TO_PBAS_ROLE[normalized];
  }
  if (normalized.includes("associate") || normalized.includes("assoc")) {
    return "ASSOCIATE_PROFESSOR";
  }
  if (normalized.includes("assistant") || normalized.includes("asst") || normalized.includes("lecturer")) {
    return "ASSISTANT_PROFESSOR";
  }
  if (normalized.includes("professor") || normalized.includes("prof") || normalized.includes("hod") || normalized.includes("head") || normalized.includes("dean") || normalized.includes("principal")) {
    return "PROFESSOR";
  }
  return "ASSISTANT_PROFESSOR";
}

// ── Role → Rule set lookup ──────────────────────────────────────────────────
const ROLE_RULES = {
  ASSISTANT_PROFESSOR: ASSISTANT_PROFESSOR,
  ASSOCIATE_PROFESSOR: ASSOCIATE_PROFESSOR,
  PROFESSOR:           PROFESSOR,
};

function getRulesForRole(role) {
  return ROLE_RULES[role] || null;
}

// ── Unresolved rules summary ────────────────────────────────────────────────
const UNRESOLVED_RULES = [
  {
    key: "associate.lectureScore",
    role: "ASSOCIATE_PROFESSOR",
    parameter: "lecturesTaken",
    status: "REQUIRES_CLARIFICATION",
    issue: "Stated maximum = 50, but printed formula uses multiplier ×40",
    statedMax: 50,
    printedMultiplier: 40,
  },
  {
    key: "associate.innovativeTeaching",
    role: "ASSOCIATE_PROFESSOR",
    parameter: "innovativeTeaching",
    status: "REQUIRES_CLARIFICATION",
    issue: "Stated maximum = 35, but component values do not reconcile to 35",
    statedMax: 35,
  },
  {
    key: "assistant.patents",
    role: "ASSISTANT_PROFESSOR",
    parameter: "patents",
    status: "REQUIRES_CLARIFICATION",
    issue: "Maximum score of 30 specified but no per-patent scoring formula provided",
    statedMax: 30,
  },
];

module.exports = {
  RULES_VERSION,
  DEFAULT_ACADEMIC_YEAR,
  FORMULA,
  ROLE_RULES,
  ASSISTANT_PROFESSOR,
  ASSOCIATE_PROFESSOR,
  PROFESSOR,
  UNRESOLVED_RULES,
  DESIGNATION_TO_PBAS_ROLE,
  mapDesignationToRole,
  getRulesForRole,
};
