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

const RULES_VERSION = "PBAS-v2";
const DEFAULT_ACADEMIC_YEAR = "2024-25";

// ── Formula types used by the calculation engine ────────────────────────────
const FORMULA = {
  LOAD:         "LOAD",         // (input × maxScore) / denominator, capped
  RATIO:        "RATIO",        // (actual / expected) × maxScore, capped
  COUNT:        "COUNT",        // count × pointsPerItem, capped
  THRESHOLD:    "THRESHOLD",    // range-based lookup table
  COMPONENT:    "COMPONENT",    // sum of sub-components (manual entry per component)
  DIRECT:       "DIRECT",       // direct numeric entry, capped at maxScore
  CONFIGURABLE: "CONFIGURABLE", // unresolved — requires institutional clarification
  CHECKLIST:    "CHECKLIST",    // named activity list with role-based scoring (Coordinator/Others)
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


// ── Shared Activity Lists for CHECKLIST formula ─────────────────────────────

const DEPT_ADMIN_ACTIVITIES_ASSISTANT = [
  { key: "timetables",          label: "In-charge of Time Tables" },
  { key: "classIncharge",       label: "Class In-charge" },
  { key: "exams",               label: "Exams" },
  { key: "library",             label: "Library" },
  { key: "labIncharge",         label: "Lab In-charge" },
  { key: "discipline",          label: "Discipline/Anti Ragging" },
  { key: "iso",                 label: "ISO" },
  { key: "dabPac",              label: "DAB/PAC" },
  { key: "programCoordinator",  label: "Program Coordinator / Module Coordinator / Course Coordinator" },
  { key: "maintenance",         label: "Maintenance of facilities and infrastructure" },
  { key: "bosNaac",             label: "BOS, NAAC, Newsletter, Professional Society, any other" },
  { key: "grievance",           label: "Grievance redressal, NPTEL, Women Cell, Cultural, News Letter, VDC, MIC, TEP ISB etc." },
  { key: "profSociety",         label: "Professional Society and any other" },
];

const DEPT_ADMIN_ACTIVITIES_ASSOC_PROF = [
  { key: "timetables",          label: "In-charge of Time Tables" },
  { key: "classCoordinator",    label: "Class Coordinator" },
  { key: "exams",               label: "Exams" },
  { key: "library",             label: "Library" },
  { key: "labs",                label: "Labs" },
  { key: "discipline",          label: "Discipline/Anti Ragging" },
  { key: "iso",                 label: "ISO etc." },
  { key: "dabPac",              label: "DAB/PAC" },
  { key: "programCoordinator",  label: "Program Coordinator / Module Coordinator / Course Coordinator" },
  { key: "maintenance",         label: "Maintenance of facilities and infrastructure" },
  { key: "bosNaac",             label: "BOS, NAAC, Newsletter, Professional Society, any other" },
  { key: "grievance",           label: "Grievance redressal, Knowledge Center, NPTEL, DARC, Women Cell, Cultural, e-Yantra, Newsletter, Professional Society" },
];

const INST_ADMIN_ACTIVITIES = [
  { key: "nba",          label: "NBA" },
  { key: "naac",         label: "NAAC" },
  { key: "autonomous",   label: "Autonomous" },
  { key: "iso",          label: "ISO" },
  { key: "rnd",          label: "R&D" },
  { key: "exams",        label: "Exams" },
  { key: "maintenance",  label: "Maintenance of facilities & infrastructure" },
  { key: "grievance",    label: "Grievance redressal, NPTEL, Women Cell, Cultural, News Letter, VDC, MIC, TEP ISB etc." },
  { key: "profSociety",  label: "Professional Society and any other" },
  { key: "annualDay",    label: "Annual Day Coordination" },
  { key: "cultural",     label: "Cultural Activities" },
  { key: "other",        label: "Any other" },
];

const NSS_ACTIVITIES_ASSISTANT = [
  { key: "studentWelfare",  label: "Student welfare activities" },
  { key: "healthCamps",     label: "Health camps" },
  { key: "bloodCamps",      label: "Blood camps" },
  { key: "servicePoor",     label: "Service to poor" },
  { key: "serviceDisabled", label: "Service to Disabled" },
  { key: "charityCamps",    label: "Charity camps etc." },
  { key: "other",           label: "Any other" },
];

const NSS_ACTIVITIES_ASSOC_PROF = [
  { key: "nssActivities",   label: "NSS activities" },
  { key: "studentWelfare",  label: "Student welfare activities" },
  { key: "healthCamps",     label: "Health camps" },
  { key: "bloodCamps",      label: "Blood camps" },
  { key: "servicePoor",     label: "Service to poor" },
  { key: "serviceDisabled", label: "Service to Disabled" },
  { key: "charityCamps",    label: "Charity camps etc." },
  { key: "other",           label: "Any other" },
];

// ── Course File Compliance Items (shared across all roles) ──────────────────
const COURSE_FILE_ITEMS = [
  { key: "syllabus",     label: "Copy of the course Syllabus, Course Objective, CO-PO Mapping" },
  { key: "lessonPlan",   label: "Lesson Plan" },
  { key: "lectureNotes", label: "Lecture notes / e-material" },
  { key: "attendance",   label: "Attendance Registers" },
  { key: "questionBank", label: "Question Bank, Assignments / Tutorials" },
  { key: "questionPapers", label: "Internal/External Question Papers" },
  { key: "resultAnalysis", label: "Result Analysis" },
  { key: "coPoMethod",   label: "Methodology adopted for attainment of COs & POs" },
  { key: "coAttainment", label: "Attainment of COs" },
  { key: "poAttainment", label: "Attainment of POs mapped with that course" },
];


// ═══════════════════════════════════════════════════════════════════════════
//  ASSISTANT PROFESSOR RULES — Total: 1000
// ═══════════════════════════════════════════════════════════════════════════
const ASSISTANT_PROFESSOR = {
  role: "ASSISTANT_PROFESSOR",
  label: "Assistant Professor",
  reviewerLabel: "HoD",          // Column header for departmental review scores
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
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 5,
          activities: COURSE_FILE_ITEMS,
          description: "10 compliance items, 5 points each. Tick for compliance, Nil for non-compliance. Max = 50.",
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
            { key: "pptAnimations", label: "NPTEL / Video Lectures / PPT / Animations", maxScore: 20, formula: FORMULA.DIRECT },
            { key: "rolePlayPBL", label: "Role Plays / Project Based Learning / Quiz", maxScore: 30, formula: FORMULA.DIRECT },
          ],
          description: "PPT/Animations/NPTEL/Video = 20, Role Play/PBL/Quiz = 30. Total max = 50.",
        },
        {
          key: "remedialActivities",
          label: "Remedial / Bridge Courses / Career Oriented Courses / Content Beyond Syllabus / Design of Experiments / Projects / Working Models",
          maxScore: 60,
          formula: FORMULA.COUNT,
          pointsPerItem: 15,
          inputFields: [
            { key: "qualifyingActivities", label: "Qualifying activities (any four)", type: "number", max: 4 },
          ],
          remedialItems: [
            "Remedial Classes", "Bridge Courses", "Career oriented Courses",
            "Content Beyond Syllabus", "Design of Experiments", "Projects / Working Models",
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
          description: "Each counseling session = 10 points. Record must be maintained. Max = 40.",
        },
        {
          key: "passPercentage",
          label: "Pass Percentage (Theory)",
          maxScore: 75,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_ASSISTANT,
          inputFields: [
            { key: "passPercentage", label: "Average pass percentage (%)", type: "number", min: 0, max: 100 },
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
            { key: "feedbackScore", label: "Average feedback score (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Same scale as pass percentage. Max = 75.",
        },
      ],
    },

    // ── SECTION II: Professional Development & Co-Curricular — 150 ──
    {
      key: "professional",
      label: "Professional Development & Co-Curricular Activities",
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
          label: "Short-term Courses / Conferences Participated / Organized",
          maxScore: 100,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "conferencesParticipated", label: "Intl/National conferences participated (10pts each, Max 40)", maxScore: 40, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "conferencesOrganized", label: "Intl/National conferences organized (10pts each, Max 20)", maxScore: 20, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "workshopsAttended", label: "Workshops/FDP/STTP/Seminars/Guest Lectures attended (Online=5, In-person=10, Max 20)", maxScore: 20, formula: FORMULA.DIRECT },
            { key: "workshopsOrganized", label: "Workshops/FDP/STTP/Seminars/Guest Lectures organized (Max 20)", maxScore: 20, formula: FORMULA.DIRECT },
          ],
          description: "Conferences participated (10pts, max 40) + organized (10pts, max 20) + Workshops attended (Online=5pts, max 20) + organized (max 20). Total max = 100.",
        },
        {
          key: "industrialActivity",
          label: "Industrial Visits / Tours",
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
          label: "Aagama / Working Model Exhibition / Co-curricular Activities",
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
          label: "NPTEL Performance",
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
          label: "Books with ISBN/ISDN",
          maxScore: 30,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "booksSoleAuthor", label: "Books (Sole Author) — 20 pts each", maxScore: 30, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "booksMultipleAuthor", label: "Books (Multiple Authors) — 10 pts each", maxScore: 30, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "chapterSoleAuthor", label: "Book Chapter (Sole Author) — 10 pts each", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "chapterMultipleAuthor", label: "Book Chapter (Multiple Authors) — 5 pts each", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "Sole author book=20, Multiple=10, Chapter sole=10, Chapter multiple=5. Max = 30.",
        },
        {
          key: "researchPublications",
          label: "Research Publications (Scopus & SCI Journals)",
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
          label: "Sponsored Research Projects / Schemes",
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
          label: "Consultancy Projects",
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

    // ── SECTION IV: Administrative & Extension Activities — 100 ──
    {
      key: "administrative",
      label: "Administrative and Extension Activities",
      maxScore: 100,
      semesterAveraged: false,
      parameters: [
        {
          key: "deptAdmin",
          label: "Department Administration",
          maxScore: 30,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 10,
          roles: [
            { value: "COORDINATOR", label: "Coordinator", multiplier: 1.0 },
            { value: "OTHER", label: "Others", multiplier: 0.5 },
          ],
          activities: DEPT_ADMIN_ACTIVITIES_ASSISTANT,
          description: "Each activity: Coordinator = 10 points, Others = 5 points. Max = 30.",
        },
        {
          key: "instAdmin",
          label: "Institutional Level Administration",
          maxScore: 30,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 10,
          roles: [
            { value: "COORDINATOR", label: "Coordinator", multiplier: 1.0 },
            { value: "OTHER", label: "Others", multiplier: 0.5 },
          ],
          activities: INST_ADMIN_ACTIVITIES,
          description: "Each activity: Coordinator = 10 points, Others = 5 points. Max = 30.",
        },
        {
          key: "nss",
          label: "NSS / Social Service Activities",
          maxScore: 20,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 5,
          activities: NSS_ACTIVITIES_ASSISTANT,
          description: "Each activity = 5 points (tick). Max = 20.",
        },
        {
          key: "trainingPlacement",
          label: "Training & Placement Activities",
          maxScore: 20,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "tpCoordinator", label: "Dept. Coordinator (20 pts)", maxScore: 20, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "tpOther", label: "Others (10 pts)", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "tpActivities", label: "Placement Training, Website Designing & any other (20 pts each)", maxScore: 20, pointsPerItem: 20, formula: FORMULA.COUNT },
          ],
          description: "Coordinator=20, Others=10, Other activities=20 each. Max = 20.",
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
  reviewerLabel: "DFAC",         // Column header for departmental review scores
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
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 2.5,
          activities: COURSE_FILE_ITEMS,
          description: "10 compliance items, 2.5 points each. Tick for compliance, Nil for non-compliance. Max = 20.",
        },
        {
          key: "examDuties",
          label: "Exam Duties / Internal Observer / Moderator",
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
          formula: FORMULA.COMPONENT,
          components: [
            { key: "pptAnimations", label: "(a)(i) PPTs / Visuals / Animations / NPTEL / Video Lectures", maxScore: 15, formula: FORMULA.DIRECT },
            { key: "rolePlayPBL", label: "(a)(ii) Role Plays / Project Based Learning / Quiz", maxScore: 15, formula: FORMULA.DIRECT },
            { key: "eContent", label: "(b) Interactive E-Content Developed / Uploaded (proof required)", maxScore: 15, formula: FORMULA.DIRECT },
          ],
          subGroupCap: { keys: ["pptAnimations", "rolePlayPBL"], maxScore: 20, label: "(a) ICT based Teaching Methodology" },
          description: "(a) ICT-based (max 20): (i) PPTs=15 + (ii) PBL=15, capped at 20. (b) E-Content=15. Total max = 35.",
        },
        {
          key: "remedialActivities",
          label: "Remedial / Bridge Courses / Career Oriented Courses / Content Beyond Syllabus / Design of Experiments",
          maxScore: 60,
          formula: FORMULA.COUNT,
          pointsPerItem: 15,
          inputFields: [
            { key: "qualifyingActivities", label: "Qualifying activities (any four)", type: "number", max: 4 },
          ],
          remedialItems: [
            "Remedial Classes", "Bridge Courses", "Career oriented Courses",
            "Content Beyond Syllabus", "Design of Experiments", "Projects / Working Models",
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
          description: "Each counseling session = 10 points. Record must be maintained. Max = 40.",
        },
        {
          key: "passPercentage",
          label: "Pass Percentage",
          maxScore: 70,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_ASSOCIATE,
          inputFields: [
            { key: "passPercentage", label: "Average pass percentage (%)", type: "number", min: 0, max: 100 },
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
            { key: "feedbackScore", label: "Average feedback score (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Same scale as pass percentage. Max = 70.",
        },
      ],
    },

    // ── SECTION II: Professional Development & Co-Curricular — 100 ──
    {
      key: "professional",
      label: "Professional Development & Co-Curricular Activities",
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
          label: "Short-term Courses / Conferences Participated / Organized",
          maxScore: 45,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "conferencesParticipated", label: "Intl/National conferences participated (7.5pts each, Max 15)", maxScore: 15, pointsPerItem: 7.5, formula: FORMULA.COUNT },
            { key: "conferencesOrganized", label: "Intl/National conferences organized (5pts each, Max 10)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "workshopsAttended", label: "Workshops/FDP/STTP/Seminars/Guest Lectures attended (5pts each, Max 10)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "workshopsOrganized", label: "Workshops/FDP/STTP/Seminars/Guest Lectures organized (5pts each, Max 10)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "Conferences participated (7.5pts, max 15) + organized (5pts, max 10) + Workshops attended (5pts, max 10) + organized (5pts, max 10). Total max = 45.",
        },
        {
          key: "industrialActivity",
          label: "Industrial Visits / Tours",
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
          label: "Aagama / Working Model Exhibition / Co-curricular Activities",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "coCurricularActivities", label: "Number of activities", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "studentInnovations",
          label: "Student Innovations & Guidance",
          maxScore: 5,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "innovations", label: "Innovations with working model/simulation", type: "number" },
          ],
          description: "Each innovation with working model/simulation = 5 points. Max = 5.",
        },
        {
          key: "nptel",
          label: "NPTEL Performance",
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
          label: "Books with ISBN/ISDN",
          maxScore: 30,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "booksSoleAuthor", label: "Books (Sole Author) — 20 pts each", maxScore: 30, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "booksMultipleAuthor", label: "Books (Multiple Authors) — 10 pts each", maxScore: 30, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "chapterSoleAuthor", label: "Book Chapter (Sole Author) — 10 pts each", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "chapterMultipleAuthor", label: "Book Chapter (Multiple Authors) — 5 pts each", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "Sole author=20, Multiple=10, Chapter sole=10, Chapter multiple=5. Max = 30.",
        },
        {
          key: "researchPublications",
          label: "Research Publications (Scopus & SCI Journals)",
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
          label: "Proposals Submitted & Sanction Awaited",
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
          label: "Guiding for Ph.D. in the Current Year",
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
          label: "Seminars / Conferences / Workshops / Symposia Papers in Proceedings",
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
          label: "Consultancy Projects",
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

    // ── SECTION IV: Administrative & Extension Activities — 150 ──
    {
      key: "administrative",
      label: "Administrative and Extension Activities",
      maxScore: 150,
      semesterAveraged: false,
      parameters: [
        {
          key: "deptAdmin",
          label: "Department Administration",
          maxScore: 60,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 20,
          roles: [
            { value: "COORDINATOR", label: "Coordinator (100%)", multiplier: 1.0 },
            { value: "OTHER", label: "Others (50%)", multiplier: 0.5 },
          ],
          activities: DEPT_ADMIN_ACTIVITIES_ASSOC_PROF,
          description: "Each activity = 20 points. Coordinator = 100%, Others = 50%. Max = 60.",
        },
        {
          key: "instAdmin",
          label: "Institutional Level Administration",
          maxScore: 70,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 20,
          roles: [
            { value: "COORDINATOR", label: "Coordinator", multiplier: 0.5 },
            { value: "OTHER", label: "Others", multiplier: 0.25 },
          ],
          activities: INST_ADMIN_ACTIVITIES,
          description: "Each activity = 20 points. Coordinator = 10 points, Others = 5 points. Max = 70.",
        },
        {
          key: "nss",
          label: "NSS Activities",
          maxScore: 10,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 5,
          activities: NSS_ACTIVITIES_ASSOC_PROF,
          description: "Each activity = 5 points (tick). Max = 10.",
        },
        {
          key: "trainingPlacement",
          label: "Training & Placement Activities",
          maxScore: 10,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "tpCoordinator", label: "Dept. Coordinator (10 pts)", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "tpOther", label: "Others (5 pts)", maxScore: 5, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "tpActivities", label: "Placement Training, Website Designing & any other (10 pts each)", maxScore: 10, pointsPerItem: 10, formula: FORMULA.COUNT },
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
  reviewerLabel: "HOD",          // Column header for departmental review scores
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
          description: "score = (weeklyLoad × 50) / 12. Lab load counted as 0.5× theory. Teaching load shall be minimum 8 periods per week as per UGC.",
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
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 2.5,
          activities: COURSE_FILE_ITEMS,
          description: "10 compliance items, 2.5 points each. Tick for compliance, Nil for non-compliance. Max = 20.",
        },
        {
          key: "examDuties",
          label: "Exam Duties / Internal Observer / Moderator",
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
            { key: "pptVisuals", label: "(a)(i) PPTs / Visuals / Animations / Any Other", maxScore: 10, formula: FORMULA.DIRECT },
            { key: "nptelVideo", label: "(a)(ii) NPTEL / Video Lectures", maxScore: 10, formula: FORMULA.DIRECT },
            { key: "eContent", label: "(b) Interactive E-Content Developed / Uploaded (proof required)", maxScore: 20, formula: FORMULA.DIRECT },
          ],
          subGroupCap: { keys: ["pptVisuals", "nptelVideo"], maxScore: 20, label: "(a) ICT based Teaching Methodology" },
          description: "(a) ICT-based (max 20): (i) PPTs=10 + (ii) NPTEL=10. (b) E-content=20. Total = 40.",
        },
        {
          key: "remedialActivities",
          label: "Remedial / Bridge Courses / Career Oriented Courses / Content Beyond Syllabus / Design of Experiments",
          maxScore: 40,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "qualifyingActivities", label: "Qualifying activities (any four)", type: "number", max: 4 },
          ],
          remedialItems: [
            "Remedial", "Bridge", "Career",
            "Content Beyond Syllabus", "Design of Experiments",
          ],
          description: "Any four = 10 points each. Max = 40.",
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
          description: "Each session = 5 points. Record must be maintained. Max = 10.",
        },
        {
          key: "passPercentage",
          label: "Pass Percentage",
          maxScore: 45,
          formula: FORMULA.THRESHOLD,
          thresholds: PASS_PERCENTAGE_SCALE_PROFESSOR,
          inputFields: [
            { key: "passPercentage", label: "Average pass percentage (%)", type: "number", min: 0, max: 100 },
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
            { key: "feedbackScore", label: "Average feedback score (%)", type: "number", min: 0, max: 100 },
          ],
          description: "Same scale as pass percentage. Max = 45.",
        },
        {
          key: "guidance",
          label: "Guidance (Mini Project / Major Project / Project Exhibitions / Mathematical Models / Working Models / Community Service / App Development / Start-up Initiatives)",
          maxScore: 50,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "guidanceActivities", label: "Number of guidance activities", type: "number" },
          ],
          description: "Each activity = 10 points. Max = 50.",
        },
      ],
    },

    // ── SECTION II: Professional Development & Co-Curricular — 100 ──
    {
      key: "professional",
      label: "Professional Development & Co-Curricular Activities",
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
          key: "shortTermCourses",
          label: "Short-term Courses / Conferences Participated / Organized",
          maxScore: 45,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "conferencesParticipated", label: "Intl/National conferences participated (7.5pts each, Max 15)", maxScore: 15, pointsPerItem: 7.5, formula: FORMULA.COUNT },
            { key: "conferencesOrganized", label: "Intl/National conferences organized (5pts each, Max 10)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "workshopsAttended", label: "Workshops/FDP/STTP/Seminars/Guest Lectures attended (5pts each, Max 10)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "workshopsOrganized", label: "Workshops/FDP/STTP/Seminars/Guest Lectures organized (5pts each, Max 10)", maxScore: 10, pointsPerItem: 5, formula: FORMULA.COUNT },
          ],
          description: "Conferences participated (7.5pts, max 15) + organized (5pts, max 10) + Workshops attended (5pts, max 10) + organized (5pts, max 10). Total max = 45.",
        },
        {
          key: "industrialActivity",
          label: "Industrial Visits / Tours",
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
          label: "Aagama / Working Model Exhibition / Co-curricular Activities",
          maxScore: 10,
          formula: FORMULA.COUNT,
          pointsPerItem: 5,
          inputFields: [
            { key: "coCurricularActivities", label: "Number of activities", type: "number" },
          ],
          description: "5 points each. Max = 10.",
        },
        {
          key: "studentInnovations",
          label: "Student Innovations & Guidance",
          maxScore: 5,
          formula: FORMULA.COUNT,
          pointsPerItem: 10,
          inputFields: [
            { key: "innovations", label: "Innovations with working model/simulation", type: "number" },
          ],
          description: "Each innovation with working model/simulation = 10 points. Max = 5.",
        },
        {
          key: "nptel",
          label: "NPTEL Performance",
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
          label: "Books with ISBN/ISDN",
          maxScore: 40,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "booksSoleAuthor", label: "Books (Sole Author) — 30 pts each", maxScore: 40, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "booksMultipleAuthor", label: "Books (Multiple Authors) — 15 pts each", maxScore: 40, pointsPerItem: 15, formula: FORMULA.COUNT },
            { key: "chapterSoleAuthor", label: "Book Chapter (Sole Author) — 20 pts each", maxScore: 20, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "chapterMultipleAuthor", label: "Book Chapter (Multiple Authors) — 10 pts each", maxScore: 20, pointsPerItem: 10, formula: FORMULA.COUNT },
          ],
          description: "Sole author=30, Multiple=15, Chapter sole=20, Chapter multiple=10. Max = 40.",
        },
        {
          key: "researchPublications",
          label: "Research Publications (Scopus & SCI Journals)",
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
          label: "Proposals Submitted & Sanction Awaited",
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
          label: "Guiding Ph.D. in the Current Year",
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
          label: "Seminars / Conferences / Workshops / Symposia Papers in Proceedings",
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
          label: "Consultancy Projects",
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

    // ── SECTION IV: Administrative & Extension Activities — 200 ──
    {
      key: "administrative",
      label: "Administrative and Extensive Activities",
      maxScore: 200,
      semesterAveraged: false,
      parameters: [
        {
          key: "deptAdmin",
          label: "Department Administration",
          maxScore: 70,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 20,
          roles: [
            { value: "COORDINATOR", label: "Coordinator (100%)", multiplier: 1.0 },
            { value: "OTHER", label: "Others (50%)", multiplier: 0.5 },
          ],
          activities: DEPT_ADMIN_ACTIVITIES_ASSOC_PROF,
          description: "Each activity = 20 points. Coordinator = 100%, Others = 50%. Max = 70.",
        },
        {
          key: "instAdmin",
          label: "Institutional Level Administration",
          maxScore: 70,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 20,
          roles: [
            { value: "COORDINATOR", label: "Coordinator (100%)", multiplier: 1.0 },
            { value: "OTHER", label: "Others (50%)", multiplier: 0.5 },
          ],
          activities: INST_ADMIN_ACTIVITIES,
          description: "Each activity = 20 points. Coordinator = 100%, Others = 50%. Max = 70.",
        },
        {
          key: "nss",
          label: "NSS Activities",
          maxScore: 15,
          formula: FORMULA.CHECKLIST,
          pointsPerActivity: 5,
          activities: NSS_ACTIVITIES_ASSOC_PROF,
          description: "Each activity = 5 points (tick). Max = 15.",
        },
        {
          key: "trainingPlacement",
          label: "Training & Placement Activities",
          maxScore: 15,
          formula: FORMULA.COMPONENT,
          components: [
            { key: "tpCoordinator", label: "Dept. Coordinator (10 pts)", maxScore: 15, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "tpOther", label: "Others (5 pts)", maxScore: 5, pointsPerItem: 5, formula: FORMULA.COUNT },
            { key: "tpActivities", label: "Placement Training, Website Designing & any other (10 pts each)", maxScore: 15, pointsPerItem: 10, formula: FORMULA.COUNT },
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
            { key: "awardInternational", label: "International level — 30 pts each", maxScore: 30, pointsPerItem: 30, formula: FORMULA.COUNT },
            { key: "awardNational", label: "National level — 20 pts each", maxScore: 30, pointsPerItem: 20, formula: FORMULA.COUNT },
            { key: "awardState", label: "State level — 15 pts each", maxScore: 30, pointsPerItem: 15, formula: FORMULA.COUNT },
            { key: "awardUniversity", label: "University level — 10 pts each", maxScore: 30, pointsPerItem: 10, formula: FORMULA.COUNT },
            { key: "awardCollege", label: "College level — 5 pts each", maxScore: 30, pointsPerItem: 5, formula: FORMULA.COUNT },
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
  COURSE_FILE_ITEMS,
  DEPT_ADMIN_ACTIVITIES_ASSISTANT,
  DEPT_ADMIN_ACTIVITIES_ASSOC_PROF,
  INST_ADMIN_ACTIVITIES,
  NSS_ACTIVITIES_ASSISTANT,
  NSS_ACTIVITIES_ASSOC_PROF,
  AWARD_TIERS_PROFESSOR,
};
