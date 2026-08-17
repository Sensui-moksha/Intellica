/**
 * seedDatabase.js — Comprehensive Master Database Seeder for Intellica
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds:
 *   1. Institutional Administrator (admin / mokshyagnay@gmail.com)
 *   2. Department HOD (moksha / d.mokshyagnayadav@gmail.com / 23H71A0575!)
 *   3. Core Academic Departments (CSE, ECE, MECH, CIVIL, IT, EEE, CHEMICAL)
 *   4. Academic Years & Archival Cycles (2026-27, 2025-26 Active, 2024-25 Archived)
 *   5. Full 34 Activity Categories & Tiered Subcategories (4 PBAS Sections)
 *   6. Granular UGC/AICTE Credit Evaluation Rules (CreditRule collection)
 *
 * Usage:
 *   node backend/seedDatabase.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Models
const User = require("./models/User");
const HOD = require("./models/HOD");
const Department = require("./models/Department");
const AcademicYear = require("./models/AcademicYear");
const Category = require("./models/Category");
const CreditRule = require("./models/CreditRule");

// ── 1. DEFAULT ADMINISTRATOR & HOD ACCOUNTS ──
const SEED_ADMIN = {
  name: "Administrator",
  email: "mokshyagnay@gmail.com",
  adminId: "admin",
  regId: "admin",
  department: "ADMINISTRATION",
  designation: "Institutional Administrator",
  role: "ADMIN",
  isApproved: true,
  status: "APPROVED"
};

const SEED_HOD = {
  name: "moksha",
  email: "d.mokshyagnayadav@gmail.com",
  hodId: "23H71A0575!",
  regId: "23H71A0575!",
  department: "CSE",
  designation: "Professor & HOD",
  role: "HOD",
  isApproved: true,
  status: "APPROVED"
};

// ── 2. DEPARTMENTS ──
const SEED_DEPARTMENTS = [
  { name: "CSE", code: "CSE", hodName: "moksha" },
  { name: "ECE", code: "ECE" },
  { name: "MECH", code: "MECH" },
  { name: "CIVIL", code: "CIVIL" },
  { name: "IT", code: "IT" },
  { name: "EEE", code: "EEE" },
  { name: "CHEMICAL", code: "CHEM" }
];

// ── 3. ACADEMIC YEARS & ARCHIVAL CYCLES ──
const SEED_ACADEMIC_YEARS = [
  {
    year: "2026-27",
    label: "AY 2026-27",
    isCurrent: false,
    isArchived: false,
    description: "Upcoming Academic Cycle • Ready for Activation"
  },
  {
    year: "2025-26",
    label: "AY 2025-26",
    isCurrent: true,
    isArchived: false,
    description: "Current Active College Cycle • Open for Submissions"
  },
  {
    year: "2024-25",
    label: "AY 2024-25",
    isCurrent: false,
    isArchived: true,
    description: "Archived Historical Records • View-Only for All Users"
  }
];

// ── 4. ALL 34 CATEGORIES & TIERED SUBCATEGORIES ACROSS 4 PBAS SECTIONS ──
const SEED_CATEGORIES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION I: TEACHING, LEARNING & EVALUATION (9 Categories)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "InnovativeTeaching",
    section: "teaching",
    key: "innovativeTeaching",
    creditPoints: 15,
    description: "ICT tools, pedagogical innovations, modern e-learning development, virtual labs",
    isActive: true,
    subcategories: [
      { name: "Developed Full Online E-Content Course", key: "ict_course", creditPoints: 20, description: "Full digital courseware or module" },
      { name: "Simulations / Virtual Labs / LMS Tools", key: "ict_simulations", creditPoints: 15, description: "Interactive simulations or automated grading tools" },
      { name: "Multimedia Lectures / Interactive Visuals", key: "ict_multimedia", creditPoints: 10, description: "Recorded lectures and rich presentations" },
      { name: "Role Play / Project-Based Learning / Gamified Quizzes", key: "ict_roleplay", creditPoints: 15, description: "Active learning pedagogy and project-based assignments" }
    ]
  },
  {
    name: "WeeklyTeachingLoad",
    section: "teaching",
    key: "weeklyTeachingLoad",
    creditPoints: 20,
    description: "Direct classroom teaching hours, theory periods, practical lab sessions, tutorials",
    isActive: true,
    subcategories: [
      { name: "Theory Teaching Load (16+ Periods/Week)", key: "teach_theory_full", creditPoints: 25, description: "Full standard theory course teaching load" },
      { name: "Theory Teaching Load (12-15 Periods/Week)", key: "teach_theory_mid", creditPoints: 20, description: "Moderate theory course teaching load" },
      { name: "Laboratory / Practical Sessions (6+ Lab Hours/Week)", key: "teach_lab_full", creditPoints: 15, description: "Hands-on lab conduction and viva evaluation" },
      { name: "Tutorial & Problem-Solving Classes", key: "teach_tutorial", creditPoints: 10, description: "Small-group remedial tutorials" }
    ]
  },
  {
    name: "LecturesHandled",
    section: "teaching",
    key: "lecturesTaken",
    creditPoints: 15,
    description: "Syllabus completion efficiency, planned vs actual lecture delivery ratio",
    isActive: true,
    subcategories: [
      { name: "100% Syllabus Coverage & Lecture Engagement", key: "lectures_100pct", creditPoints: 20, description: "Complete delivery matching course handout" },
      { name: "90-99% Lecture Target Delivery", key: "lectures_90pct", creditPoints: 15, description: "High compliance lecture delivery" },
      { name: "Additional Special Modules / Beyond-Syllabus Lectures", key: "lectures_extra", creditPoints: 10, description: "Industry-aligned special topics" }
    ]
  },
  {
    name: "CourseFile",
    section: "teaching",
    key: "courseFile",
    creditPoints: 15,
    description: "Course file compliance, lesson plans, question banks, mapping to CO-PO outcomes",
    isActive: true,
    subcategories: [
      { name: "Exemplary Course File (100% Compliance + Outcome Mapping)", key: "coursefile_full", creditPoints: 20, description: "Full compliance with NBA/NAAC audit criteria" },
      { name: "Standard Course File (Course Handout + Question Bank)", key: "coursefile_std", creditPoints: 15, description: "Standard verified course dossier" },
      { name: "Lab Manual & Continuous Evaluation Rubrics", key: "coursefile_lab", creditPoints: 10, description: "Comprehensive lab manual with experiment rubrics" }
    ]
  },
  {
    name: "ExamDuties",
    section: "teaching",
    key: "examDuties",
    creditPoints: 15,
    description: "Internal & university examination duties, invigilation, paper setting, valuation",
    isActive: true,
    subcategories: [
      { name: "University / End-Semester Paper Setter & Chief Examiner", key: "exam_paper_setter", creditPoints: 20, description: "Official question paper setter or chief examiner" },
      { name: "Central Valuation & Answer Script Moderation", key: "exam_valuation", creditPoints: 15, description: "Evaluated 100+ answer scripts" },
      { name: "Internal Observer / Squad / Chief Superintendent", key: "exam_observer", creditPoints: 15, description: "Exam hall supervision leadership" },
      { name: "Invigilation Duties (Full Allotment Completed)", key: "exam_invigilation", creditPoints: 10, description: "Regular exam invigilation duties" }
    ]
  },
  {
    name: "RemedialActivities",
    section: "teaching",
    key: "remedialActivities",
    creditPoints: 15,
    description: "Remedial classes for slow learners, bridge courses, GATE coaching, design of experiments",
    isActive: true,
    subcategories: [
      { name: "Remedial Classes for Academically Slow Learners (10+ hrs)", key: "remedial_slow_learners", creditPoints: 15, description: "Dedicated remedial coaching sessions" },
      { name: "Bridge Course for First-Year / Lateral Entry Students", key: "remedial_bridge", creditPoints: 15, description: "Transition bridge course conduction" },
      { name: "GATE / Competitive Exam Coaching Sessions", key: "remedial_gate", creditPoints: 20, description: "Specialized competitive training modules" },
      { name: "Student Project Design & Prototype Mentorship", key: "remedial_projects", creditPoints: 15, description: "Guiding hardware/software mini projects" }
    ]
  },
  {
    name: "StudentMentoring",
    section: "teaching",
    key: "counseling",
    creditPoints: 15,
    description: "Proctoring, academic counseling, psychological mentoring, placement advisory",
    isActive: true,
    subcategories: [
      { name: "Proctor / Faculty Advisor (20+ Assigned Wards)", key: "mentor_proctor", creditPoints: 20, description: "Comprehensive student progress tracking" },
      { name: "Special Academic & Career Counseling Sessions", key: "mentor_counseling", creditPoints: 15, description: "Documented student counseling logs" },
      { name: "Parent-Teacher Interactive Meeting Lead", key: "mentor_parents", creditPoints: 10, description: "Facilitated ward performance updates to parents" }
    ]
  },
  {
    name: "PassPercentage",
    section: "teaching",
    key: "passPercentage",
    creditPoints: 25,
    description: "End-semester academic result pass percentage for assigned theory and lab courses",
    isActive: true,
    subcategories: [
      { name: "Theory Course Pass Percentage ≥ 95%", key: "pass_95pct", creditPoints: 30, description: "Outstanding academic results" },
      { name: "Theory Course Pass Percentage 85% - 94%", key: "pass_85pct", creditPoints: 25, description: "High academic pass percentage" },
      { name: "Theory Course Pass Percentage 70% - 84%", key: "pass_70pct", creditPoints: 15, description: "Satisfactory pass percentage" },
      { name: "Laboratory Course Pass Percentage 100%", key: "pass_lab_100", creditPoints: 20, description: "100% pass in practical exams" }
    ]
  },
  {
    name: "StudentFeedback",
    section: "teaching",
    key: "studentFeedback",
    creditPoints: 20,
    description: "Institutional end-semester student appraisal and teaching feedback rating",
    isActive: true,
    subcategories: [
      { name: "Student Feedback Score ≥ 90%", key: "feedback_90pct", creditPoints: 25, description: "Exemplary student feedback evaluation" },
      { name: "Student Feedback Score 80% - 89%", key: "feedback_80pct", creditPoints: 20, description: "High student feedback rating" },
      { name: "Student Feedback Score 70% - 79%", key: "feedback_70pct", creditPoints: 15, description: "Good student feedback rating" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION II: PROFESSIONAL DEVELOPMENT & CO-CURRICULAR (10 Categories)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Conference",
    section: "professional",
    key: "conferences",
    creditPoints: 15,
    description: "International and National conference presentations, session chairing, track hosting",
    isActive: true,
    subcategories: [
      { name: "International Conference Presentation (Full Paper)", key: "conf_intl_present", creditPoints: 20, description: "International forum paper presentation" },
      { name: "National Conference Presentation", key: "conf_natl_present", creditPoints: 15, description: "National level conference presentation" },
      { name: "Session Chair / Keynote / Track Chair", key: "conf_chair", creditPoints: 25, description: "Session chairing or keynote speaker invitation" },
      { name: "Conference Organizing Secretary / Lead Organizer", key: "conf_organizer", creditPoints: 20, description: "Lead role in organizing conference" }
    ]
  },
  {
    name: "Workshop",
    section: "professional",
    key: "workshops",
    creditPoints: 10,
    description: "Technical skill enhancement workshops (Attended / Organized)",
    isActive: true,
    subcategories: [
      { name: "5+ Days Advanced Technical Workshop (Hands-on)", key: "workshop_5days", creditPoints: 15, description: "Extended technical workshop" },
      { name: "2-4 Days Technical Skill Workshop", key: "workshop_2to4days", creditPoints: 10, description: "Multi-day technical workshop" },
      { name: "1-Day Specialized Workshop", key: "workshop_1day", creditPoints: 5, description: "One-day workshop participation" },
      { name: "Workshop Lead Organizer / Coordinator", key: "workshop_organizer", creditPoints: 20, description: "Convenor / Coordinator of workshop" }
    ]
  },
  {
    name: "Book",
    section: "professional",
    key: "books",
    creditPoints: 25,
    description: "Authored books, edited volumes, and chapter contributions with ISBN",
    isActive: true,
    subcategories: [
      { name: "Authored Book (International Publisher - IEEE / Springer / Wiley)", key: "book_authored_intl", creditPoints: 30, description: "Complete authored book published internationally" },
      { name: "Authored Book (National Publisher with ISBN)", key: "book_authored_natl", creditPoints: 20, description: "Authored book published nationally" },
      { name: "Edited Volume / Book as Chief Editor", key: "edited_volume", creditPoints: 25, description: "Edited volume or conference proceedings" },
      { name: "Book Chapter (Scopus / IEEE / Springer Indexed)", key: "book_chapter_scopus", creditPoints: 15, description: "Contributed chapter in indexed book volume" },
      { name: "Book Chapter (National Publisher / ISBN)", key: "book_chapter_natl", creditPoints: 10, description: "Contributed chapter in ISBN book" }
    ]
  },
  {
    name: "NPTEL",
    section: "professional",
    key: "nptel",
    creditPoints: 15,
    description: "NPTEL, SWAYAM, and MOOC certifications (Elite Gold, Silver, Elite)",
    isActive: true,
    subcategories: [
      { name: "NPTEL / SWAYAM Elite + Gold (Top 1-2%)", key: "nptel_gold", creditPoints: 25, description: "Score ≥ 90% in NPTEL / SWAYAM certification" },
      { name: "NPTEL / SWAYAM Elite + Silver (Top 5%)", key: "nptel_silver", creditPoints: 20, description: "Score 75-89% in NPTEL / SWAYAM certification" },
      { name: "NPTEL / SWAYAM Elite (60-74%)", key: "nptel_elite", creditPoints: 15, description: "Elite certification score" },
      { name: "NPTEL / Coursera / edX Successfully Completed", key: "nptel_completed", creditPoints: 10, description: "Successful course completion" }
    ]
  },
  {
    name: "HonorsAwards",
    section: "professional",
    key: "honorsAwards",
    creditPoints: 20,
    description: "National, State, and Institutional awards and research fellowships",
    isActive: true,
    subcategories: [
      { name: "International / Global Prestigious Award", key: "award_intl", creditPoints: 30, description: "Recognized international academic award" },
      { name: "National / State Level Academic Award", key: "award_natl", creditPoints: 20, description: "Government or national society award" },
      { name: "Institutional / Best Teacher / Researcher Award", key: "award_inst", creditPoints: 15, description: "University or college excellence award" }
    ]
  },
  {
    name: "GuestLecture",
    section: "professional",
    key: "guestLectures",
    creditPoints: 10,
    description: "Keynote addresses, invited expert talks, and resource person deliveries",
    isActive: true,
    subcategories: [
      { name: "International Keynote / Expert Session", key: "lecture_intl", creditPoints: 20, description: "Keynote speech at international conference" },
      { name: "National Level Invited Expert Talk (3+ hrs)", key: "lecture_natl", creditPoints: 15, description: "Resource person at national workshop/FDP" },
      { name: "Expert Talk / Webinar Resource Person (1-2 hrs)", key: "lecture_standard", creditPoints: 10, description: "Technical guest lecture delivery" }
    ]
  },
  {
    name: "Seminar",
    section: "professional",
    key: "seminars",
    creditPoints: 10,
    description: "Academic seminars organized or presented",
    isActive: true,
    subcategories: [
      { name: "National / International Seminar Lead Organizer", key: "seminar_organizer", creditPoints: 20, description: "Convenor / Organizer of academic seminar" },
      { name: "Technical Seminar Presentation", key: "seminar_presenter", creditPoints: 10, description: "Presenter at symposium / seminar" }
    ]
  },
  {
    name: "Webinar",
    section: "professional",
    key: "webinars",
    creditPoints: 5,
    description: "Online webinars and specialized academic sessions",
    isActive: true,
    subcategories: [
      { name: "Webinar Lead Resource Person / Key Speaker", key: "webinar_speaker", creditPoints: 15, description: "Subject expert speaker" },
      { name: "Webinar Organizer / Technical Host", key: "webinar_host", creditPoints: 10, description: "Organized departmental webinar" },
      { name: "Webinar Participant (with Assessment)", key: "webinar_participant", creditPoints: 5, description: "Certified webinar attendee" }
    ]
  },
  {
    name: "Certification",
    section: "professional",
    key: "certifications",
    creditPoints: 15,
    description: "Global industry professional certifications (AWS, Cisco, RedHat, GCP)",
    isActive: true,
    subcategories: [
      { name: "Professional / Expert Level Certification (AWS Pro, CCIE, GCP Lead)", key: "cert_expert", creditPoints: 25, description: "Advanced industry credential" },
      { name: "Associate / Practitioner Global Certification", key: "cert_associate", creditPoints: 15, description: "Standard professional certification" },
      { name: "Foundational Industry Certification", key: "cert_foundational", creditPoints: 10, description: "Entry / foundational certification" }
    ]
  },
  {
    name: "Others",
    section: "professional",
    key: "others",
    creditPoints: 5,
    description: "Other recognized academic, research, and extension contributions",
    isActive: true,
    subcategories: [
      { name: "Institutional Committee Leadership / Head", key: "other_lead", creditPoints: 15, description: "Chairperson / Convener of major institute committees" },
      { name: "General Academic / Extension Activity", key: "other_general", creditPoints: 5, description: "Other academic activities" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION III: RESEARCH & DEVELOPMENT (R&D) (10 Categories)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Publication",
    section: "rnd",
    key: "paperPublications",
    creditPoints: 30,
    description: "Journal and Conference research publications (Scopus Q1-Q4, SCI, UGC-CARE)",
    isActive: true,
    subcategories: [
      { name: "Journal Article (SCI / Scopus Q1)", key: "journal_q1", creditPoints: 40, description: "Top quartile SCI / Scopus indexed peer-reviewed journal" },
      { name: "Journal Article (Scopus Q2)", key: "journal_q2", creditPoints: 35, description: "Second quartile Scopus indexed journal" },
      { name: "Journal Article (Scopus Q3)", key: "journal_q3", creditPoints: 30, description: "Third quartile Scopus indexed journal" },
      { name: "Journal Article (Scopus Q4)", key: "journal_q4", creditPoints: 25, description: "Fourth quartile Scopus indexed journal" },
      { name: "Journal Article (UGC-CARE / Peer-Reviewed)", key: "journal_ugc", creditPoints: 20, description: "UGC-CARE approved or recognized journal" }
    ]
  },
  {
    name: "FDP",
    section: "rnd",
    key: "fdp",
    creditPoints: 15,
    description: "Faculty Development Programmes and advanced pedagogy courses",
    isActive: true,
    subcategories: [
      { name: "2-Week FDP (≥10 Days / ATAL / NPTEL / AICTE)", key: "fdp_2week", creditPoints: 20, description: "Two-week intensive pedagogy / advanced technical FDP" },
      { name: "1-Week FDP (5-9 Days)", key: "fdp_1week", creditPoints: 15, description: "One-week approved FDP" },
      { name: "Short Term Pedagogy / FDP (2-4 Days)", key: "fdp_short", creditPoints: 10, description: "Short-term faculty development programme" }
    ]
  },
  {
    name: "IPR",
    section: "rnd",
    key: "iprs",
    creditPoints: 30,
    description: "Patents (Granted/Published), Copyrights, and Industrial Designs",
    isActive: true,
    subcategories: [
      { name: "Patent Granted (International - USPTO/EPO)", key: "patent_intl_granted", creditPoints: 40, description: "International patent granted" },
      { name: "Patent Granted (National - Indian Patent Office)", key: "patent_natl_granted", creditPoints: 30, description: "National patent granted" },
      { name: "Patent Published / Commercialized", key: "patent_published", creditPoints: 20, description: "Official patent published in gazette" },
      { name: "Copyright / Industrial Design / Trademark Registered", key: "copyright_granted", creditPoints: 15, description: "Registered copyright or design" }
    ]
  },
  {
    name: "ResearchProject",
    section: "rnd",
    key: "researchProjects",
    creditPoints: 35,
    description: "External sponsored major and minor research grants (DST, SERB, AICTE, ISRO)",
    isActive: true,
    subcategories: [
      { name: "Major Extramural Sponsored Project (> ₹10 Lakhs)", key: "project_major", creditPoints: 40, description: "DST, SERB, AICTE, ISRO sponsored major grant" },
      { name: "Minor Sponsored Research Project (≤ ₹10 Lakhs)", key: "project_minor", creditPoints: 25, description: "Government or industry sponsored minor research grant" },
      { name: "Internal / Institutional Seed Money Project", key: "project_seed", creditPoints: 15, description: "University seed funding for early research" }
    ]
  },
  {
    name: "Consultancy",
    section: "rnd",
    key: "consultancy",
    creditPoints: 25,
    description: "Corporate and industrial consultancy assignments and commercial testing",
    isActive: true,
    subcategories: [
      { name: "High Value Industrial Consultancy (> ₹5 Lakhs)", key: "consultancy_high", creditPoints: 35, description: "Major industrial consultancy executed" },
      { name: "Corporate Technical Consultancy (₹1-5 Lakhs)", key: "consultancy_mid", creditPoints: 25, description: "Industry testing and technical advisory" },
      { name: "Advisory / Technical Service Consultancy (< ₹1 Lakh)", key: "consultancy_basic", creditPoints: 15, description: "Consultancy and professional advisory" }
    ]
  },
  {
    name: "DoctoralThesis",
    section: "rnd",
    key: "doctoralThesis",
    creditPoints: 25,
    description: "Doctoral scholar supervision and PhD degree guidance",
    isActive: true,
    subcategories: [
      { name: "PhD Degree Awarded as Principal Supervisor", key: "phd_awarded_main", creditPoints: 35, description: "Sole or primary PhD supervisor" },
      { name: "PhD Degree Awarded as Co-Supervisor", key: "phd_awarded_co", creditPoints: 25, description: "Joint / Co-supervision of doctoral candidate" },
      { name: "Ongoing Doctoral Scholar Supervision (Active)", key: "phd_ongoing", creditPoints: 15, description: "Registered scholar guidance" }
    ]
  },
  {
    name: "ResearchPolicy",
    section: "rnd",
    key: "researchPolicy",
    creditPoints: 15,
    description: "Institutional research policy framing, guidelines, and whitepapers",
    isActive: true,
    subcategories: [
      { name: "National / State Policy Advisory Committee", key: "policy_national", creditPoints: 25, description: "Government research policy body" },
      { name: "Institutional Policy Document Author / Lead", key: "policy_institutional", creditPoints: 15, description: "Framing research/innovation policies" }
    ]
  },
  {
    name: "ProfessionalMembership",
    section: "rnd",
    key: "professionalMemberships",
    creditPoints: 10,
    description: "Senior and life memberships in IEEE, ACM, CSI, IETE, ISTE",
    isActive: true,
    subcategories: [
      { name: "Fellow / Senior Member (IEEE, ACM, IETE)", key: "member_senior", creditPoints: 20, description: "Elevated senior membership status" },
      { name: "Life / Professional Member (IEEE, ACM, CSI)", key: "member_life", creditPoints: 10, description: "Active professional society membership" }
    ]
  },
  {
    name: "Incubation",
    section: "rnd",
    key: "incubation",
    creditPoints: 20,
    description: "Startup incubation, mentorship, prototype development, commercialization",
    isActive: true,
    subcategories: [
      { name: "Startup Founder / Co-Founder (Registered Company)", key: "startup_founder", creditPoints: 35, description: "Incubated startup enterprise" },
      { name: "Incubation Mentor / Technology Advisor", key: "startup_mentor", creditPoints: 20, description: "Mentoring student/faculty ventures" }
    ]
  },
  {
    name: "MoU",
    section: "rnd",
    key: "mous",
    creditPoints: 20,
    description: "Institutional and corporate Memorandum of Understanding (Industry/Academic)",
    isActive: true,
    subcategories: [
      { name: "International University / Industry Active MoU", key: "mou_intl", creditPoints: 30, description: "Active collaborative research/exchange MoU" },
      { name: "National Corporate / Institutional MoU", key: "mou_natl", creditPoints: 20, description: "Functional academic-industry MoU" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION IV: INSTITUTIONAL & DEPARTMENT GOVERNANCE / ADMINISTRATION (5 Categories)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "DeptAdministration",
    section: "administrative",
    key: "deptAdministration",
    creditPoints: 15,
    description: "Departmental coordinatorships (NBA, NAAC, Time-table, Exam Cell, Lab In-charge, BOS)",
    isActive: true,
    subcategories: [
      { name: "Department NBA / NAAC Criteria Lead Coordinator", key: "admin_nba_lead", creditPoints: 20, description: "Accreditation criteria lead" },
      { name: "Department Academic / Exam / Time-table Coordinator", key: "admin_dept_coord", creditPoints: 15, description: "Core departmental role" },
      { name: "Laboratory In-charge / Class Teacher / Module Coordinator", key: "admin_lab_incharge", creditPoints: 10, description: "Lab or class mentorship" },
      { name: "Board of Studies (BOS) / Curriculum Revision Member", key: "admin_bos_member", creditPoints: 15, description: "Curriculum and syllabus design member" }
    ]
  },
  {
    name: "InstitutionalAdmin",
    section: "administrative",
    key: "institutionalAdmin",
    creditPoints: 20,
    description: "College-wide institutional leadership (Dean, IQAC Director, Training & Placement Head)",
    isActive: true,
    subcategories: [
      { name: "Dean / Associate Dean / IQAC Director / Principal", key: "admin_dean_iqac", creditPoints: 30, description: "Apex institutional executive leadership" },
      { name: "Head of Training & Placement / Chief Warden", key: "admin_placement_head", creditPoints: 25, description: "College-wide portfolio head" },
      { name: "Controller of Examinations (COE) / Registrar Support", key: "admin_coe_head", creditPoints: 20, description: "Institutional exam governance" }
    ]
  },
  {
    name: "StudentActivities",
    section: "administrative",
    key: "studentActivities",
    creditPoints: 15,
    description: "Co-curricular student governance, technical clubs, NSS, NCC, sports, cultural events",
    isActive: true,
    subcategories: [
      { name: "Faculty Advisor / Head for Technical Clubs & Chapters (CSI, ACM, IEEE)", key: "student_club_advisor", creditPoints: 20, description: "Mentoring student technical body" },
      { name: "NSS / NCC / Sports Officer / Extension Services Convener", key: "student_nss_sports", creditPoints: 15, description: "Community & sports leadership" },
      { name: "Annual Fest / Hackathon / National Symposium Coordinator", key: "student_fest_lead", creditPoints: 15, description: "Lead organizer for college-wide student flagship events" }
    ]
  },
  {
    name: "AccreditationSupport",
    section: "administrative",
    key: "accreditationSupport",
    creditPoints: 20,
    description: "Institutional accreditation dossiers, NAAC, NBA, NIRF, QS rankings, ISO audits",
    isActive: true,
    subcategories: [
      { name: "Institutional NAAC / NBA Chief Steering Committee Member", key: "accred_steering_lead", creditPoints: 25, description: "Apex accreditation preparation team" },
      { name: "NIRF / QS Ranking Institutional Data Lead", key: "accred_nirf_data", creditPoints: 20, description: "National ranking submission coordinator" },
      { name: "Internal Quality Audit / ISO Lead Auditor", key: "accred_iso_auditor", creditPoints: 15, description: "Academic and administrative quality auditor" }
    ]
  },
  {
    name: "InstitutionalCommittees",
    section: "administrative",
    key: "institutionalCommittees",
    creditPoints: 10,
    description: "Statutory & institutional standing committees (Anti-Ragging, Grievance, Discipline, Library)",
    isActive: true,
    subcategories: [
      { name: "Anti-Ragging Squad / Women Protection Cell Convener", key: "comm_statutory_lead", creditPoints: 15, description: "Statutory mandatory committee head" },
      { name: "Student Grievance & Disciplinary Committee Member", key: "comm_grievance_member", creditPoints: 10, description: "Disciplinary and conflict resolution" },
      { name: "Central Library / Purchasing / Hostel Committee Member", key: "comm_library_purchase", creditPoints: 10, description: "Central resource committee member" }
    ]
  }
];

// ── 5. ALL 55+ GRANULAR CREDIT EVALUATION RULES ──
const SEED_CREDIT_RULES = [
  // SECTION I: TEACHING
  { category: "WeeklyTeachingLoad", section: "teaching", ruleKey: "teach_theory_full", displayName: "Theory Teaching Load (16+ Periods/Week)", creditPoints: 25, description: "Standard theory lecture load" },
  { category: "WeeklyTeachingLoad", section: "teaching", ruleKey: "teach_lab_full", displayName: "Laboratory Practical Load (6+ Hours/Week)", creditPoints: 15, description: "Hands-on lab conduction" },
  { category: "LecturesHandled", section: "teaching", ruleKey: "lectures_100pct", displayName: "100% Syllabus Target Delivery", creditPoints: 20, description: "Full delivery of planned classes" },
  { category: "CourseFile", section: "teaching", ruleKey: "coursefile_full", displayName: "Exemplary Course File (NBA/NAAC Mapped)", creditPoints: 20, description: "Complete verified syllabus dossier" },
  { category: "ExamDuties", section: "teaching", ruleKey: "exam_paper_setter", displayName: "University Paper Setter / Chief Examiner", creditPoints: 20, description: "Question paper setting duty" },
  { category: "ExamDuties", section: "teaching", ruleKey: "exam_valuation", displayName: "Central Evaluation / Answer Script Valuation", creditPoints: 15, description: "Evaluated 100+ answer scripts" },
  { category: "InnovativeTeaching", section: "teaching", ruleKey: "ict_course", displayName: "Developed Full Online E-Content Course", creditPoints: 20, description: "Digital courseware" },
  { category: "RemedialActivities", section: "teaching", ruleKey: "remedial_slow_learners", displayName: "Remedial Classes for Slow Learners", creditPoints: 15, description: "Remedial coaching sessions" },
  { category: "StudentMentoring", section: "teaching", ruleKey: "mentor_proctor", displayName: "Proctor / Faculty Ward Mentorship", creditPoints: 20, description: "20+ assigned student wards" },
  { category: "PassPercentage", section: "teaching", ruleKey: "pass_95pct", displayName: "Theory Course Pass Percentage ≥ 95%", creditPoints: 30, description: "Outstanding academic results" },
  { category: "StudentFeedback", section: "teaching", ruleKey: "feedback_90pct", displayName: "Student Feedback Score ≥ 90%", creditPoints: 25, description: "Top student feedback rating" },

  // SECTION II: PROFESSIONAL
  { category: "Conference", section: "professional", ruleKey: "conf_intl_present", displayName: "International Conference Presentation", creditPoints: 20, description: "Author / Presenter at international forum" },
  { category: "Conference", section: "professional", ruleKey: "conf_natl_present", displayName: "National Conference Presentation", creditPoints: 15, description: "Author / Presenter at national conference" },
  { category: "Conference", section: "professional", ruleKey: "conf_chair_session", displayName: "Conference Session Chair / Keynote", creditPoints: 25, description: "Invited session chair / track chair" },
  { category: "Conference", section: "professional", ruleKey: "conf_organizer", displayName: "Conference Lead Organizer / Secretary", creditPoints: 20, description: "Organizing committee leadership" },
  { category: "Book", section: "professional", ruleKey: "book_authored_intl", displayName: "Authored Book (International Publisher)", creditPoints: 30, description: "Springer, Elsevier, Wiley, IEEE, etc." },
  { category: "Book", section: "professional", ruleKey: "book_authored_natl", displayName: "Authored Book (National Publisher)", creditPoints: 20, description: "National level ISBN publication" },
  { category: "Book", section: "professional", ruleKey: "edited_volume", displayName: "Edited Volume / Conference Proceedings", creditPoints: 25, description: "Chief / volume editor" },
  { category: "Book", section: "professional", ruleKey: "book_chapter_scopus", displayName: "Book Chapter (Scopus / IEEE Indexed)", creditPoints: 15, description: "Indexed book chapter contribution" },
  { category: "Book", section: "professional", ruleKey: "book_chapter", displayName: "Book Chapter (National ISBN)", creditPoints: 10, description: "Standard book chapter contribution" },
  { category: "NPTEL", section: "professional", ruleKey: "nptel_gold", displayName: "NPTEL / SWAYAM Elite + Gold", creditPoints: 25, description: "Score ≥ 90%" },
  { category: "NPTEL", section: "professional", ruleKey: "nptel_silver", displayName: "NPTEL / SWAYAM Elite + Silver", creditPoints: 20, description: "Score 75-89%" },
  { category: "NPTEL", section: "professional", ruleKey: "nptel_elite", displayName: "NPTEL / SWAYAM Elite", creditPoints: 15, description: "Score 60-74%" },
  { category: "Workshop", section: "professional", ruleKey: "workshop_5days", displayName: "Workshop (5+ Days / Hands-on)", creditPoints: 15, description: "Comprehensive technical training" },
  { category: "Workshop", section: "professional", ruleKey: "workshop_1to3days", displayName: "Workshop (1 - 3 Days)", creditPoints: 10, description: "Skill development workshop" },
  { category: "HonorsAwards", section: "professional", ruleKey: "award_intl", displayName: "International / Global Award", creditPoints: 30, description: "Global academic distinction" },
  { category: "HonorsAwards", section: "professional", ruleKey: "award_natl", displayName: "National / State Award", creditPoints: 20, description: "Government or society award" },
  { category: "GuestLecture", section: "professional", ruleKey: "lecture_intl", displayName: "International Keynote / Expert Talk", creditPoints: 20, description: "Keynote at international university" },
  { category: "GuestLecture", section: "professional", ruleKey: "lecture_natl", displayName: "National Invited Expert Session", creditPoints: 15, description: "Resource person at national FDP" },
  { category: "Certification", section: "professional", ruleKey: "cert_expert", displayName: "Professional Global Certification (AWS/Cisco/GCP)", creditPoints: 25, description: "Expert level credential" },

  // SECTION III: RESEARCH & R&D
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q1", displayName: "Journal - Scopus (Q1)", creditPoints: 40, description: "Highest quartile peer-reviewed Scopus journal" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q2", displayName: "Journal - Scopus (Q2)", creditPoints: 35, description: "Q2 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q3", displayName: "Journal - Scopus (Q3)", creditPoints: 30, description: "Q3 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q4", displayName: "Journal - Scopus (Q4)", creditPoints: 25, description: "Q4 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_ugc_care", displayName: "Journal - UGC-CARE Listed", creditPoints: 20, description: "UGC recognized journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_sci_top", displayName: "SCI / SCIE Indexed Top Tier", creditPoints: 40, description: "Science Citation Index Expanded" },
  { category: "IPR", section: "rnd", ruleKey: "patent_intl_granted", displayName: "Patent Granted (International)", creditPoints: 40, description: "USPTO, EPO, WIPO granted patent" },
  { category: "IPR", section: "rnd", ruleKey: "patent_natl_granted", displayName: "Patent Granted (National)", creditPoints: 30, description: "Indian Patent Office granted patent" },
  { category: "IPR", section: "rnd", ruleKey: "patent_published", displayName: "Patent Published in Gazette", creditPoints: 20, description: "Official patent publication" },
  { category: "IPR", section: "rnd", ruleKey: "copyright_registered", displayName: "Copyright / Design Registered", creditPoints: 15, description: "Registered IP copyright or design" },
  { category: "ResearchProject", section: "rnd", ruleKey: "research_project_major_pi", displayName: "Major Research Project - PI (> ₹10 Lakhs)", creditPoints: 40, description: "DST, SERB, AICTE, DRDO sponsored" },
  { category: "ResearchProject", section: "rnd", ruleKey: "research_project_minor_pi", displayName: "Minor Research Project - PI (≤ ₹10 Lakhs)", creditPoints: 25, description: "Sponsored minor research grant" },
  { category: "Consultancy", section: "rnd", ruleKey: "consultancy_industrial", displayName: "Industrial Consultancy Project", creditPoints: 25, description: "Revenue generating corporate consultancy" },
  { category: "FDP", section: "rnd", ruleKey: "fdp_2weeks", displayName: "Faculty Development Programme (2 Weeks)", creditPoints: 20, description: "AICTE / ATAL approved 2-week FDP" },
  { category: "FDP", section: "rnd", ruleKey: "fdp_1week", displayName: "Faculty Development Programme (1 Week)", creditPoints: 15, description: "5-day specialized FDP" },
  { category: "DoctoralThesis", section: "rnd", ruleKey: "phd_awarded_main", displayName: "PhD Degree Awarded (Principal Supervisor)", creditPoints: 35, description: "Guided doctoral research" },
  { category: "ProfessionalMembership", section: "rnd", ruleKey: "member_senior", displayName: "Senior Member / Fellow (IEEE / ACM)", creditPoints: 20, description: "Senior professional membership" },
  { category: "Incubation", section: "rnd", ruleKey: "startup_founder", displayName: "Startup Founder / Co-Founder", creditPoints: 35, description: "Commercialized incubated startup" },
  { category: "MoU", section: "rnd", ruleKey: "mou_intl", displayName: "Active International MoU", creditPoints: 30, description: "Institutional collaboration agreement" },

  // SECTION IV: ADMINISTRATIVE
  { category: "DeptAdministration", section: "administrative", ruleKey: "admin_nba_lead", displayName: "Department NBA / NAAC Criteria Lead", creditPoints: 20, description: "Department accreditation lead" },
  { category: "DeptAdministration", section: "administrative", ruleKey: "admin_dept_coord", displayName: "Department Time-table / Exam Coordinator", creditPoints: 15, description: "Key departmental administrator" },
  { category: "InstitutionalAdmin", section: "administrative", ruleKey: "admin_dean_iqac", displayName: "Dean / Associate Dean / IQAC Director", creditPoints: 30, description: "Apex institutional leadership" },
  { category: "InstitutionalAdmin", section: "administrative", ruleKey: "admin_placement_head", displayName: "Head Training & Placement / Chief Warden", creditPoints: 25, description: "Central institutional portfolio" },
  { category: "StudentActivities", section: "administrative", ruleKey: "student_club_advisor", displayName: "Student Technical Club Faculty Advisor", creditPoints: 20, description: "Advisor for IEEE, CSI, ACM clubs" },
  { category: "AccreditationSupport", section: "administrative", ruleKey: "accred_steering_lead", displayName: "Institutional NAAC / NBA Steering Lead", creditPoints: 25, description: "Accreditation steering committee lead" },
  { category: "InstitutionalCommittees", section: "administrative", ruleKey: "comm_statutory_lead", displayName: "Statutory Committee Convener (Anti-Ragging / Grievance)", creditPoints: 15, description: "Mandatory statutory body convener" }
];

async function seedDatabase() {
  console.log("==========================================================");
  console.log("🚀 INTELLICA DATABASE SEEDER");
  console.log("==========================================================");

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ ERROR: MONGO_URI is missing from environment variables!");
    process.exit(1);
  }

  console.log("📡 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB successfully\n");

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin", salt);

    // ── 1. Seed Admin User ──
    console.log("👤 Seeding Administrator User...");
    let adminUser = await User.findOne({
      $or: [{ email: SEED_ADMIN.email }, { adminId: SEED_ADMIN.adminId }, { regId: SEED_ADMIN.regId }]
    });

    if (!adminUser) {
      adminUser = await User.create({
        ...SEED_ADMIN,
        password: hashedPassword
      });
      console.log(`   ✅ Admin created: ${adminUser.adminId} (${adminUser.email})`);
    } else {
      adminUser.name = SEED_ADMIN.name;
      adminUser.role = "ADMIN";
      adminUser.department = SEED_ADMIN.department;
      adminUser.designation = SEED_ADMIN.designation;
      adminUser.isApproved = true;
      adminUser.status = "APPROVED";
      adminUser.password = hashedPassword;
      await adminUser.save();
      console.log(`   ✅ Admin updated: ${adminUser.adminId || adminUser.regId} (${adminUser.email})`);
    }

    // ── 2. Seed HOD User ──
    console.log("\n🎓 Seeding HOD User...");
    let hodUser = await HOD.findOne({
      $or: [{ email: SEED_HOD.email }, { hodId: SEED_HOD.hodId }, { regId: SEED_HOD.regId }]
    });

    if (!hodUser) {
      hodUser = await HOD.create({
        ...SEED_HOD,
        password: hashedPassword
      });
      console.log(`   ✅ HOD created: ${hodUser.name} (${hodUser.department} - ${hodUser.email})`);
    } else {
      hodUser.name = SEED_HOD.name;
      hodUser.role = "HOD";
      hodUser.department = SEED_HOD.department;
      hodUser.designation = SEED_HOD.designation;
      hodUser.isApproved = true;
      hodUser.status = "APPROVED";
      hodUser.password = hashedPassword;
      await hodUser.save();
      console.log(`   ✅ HOD updated: ${hodUser.name} (${hodUser.department} - ${hodUser.email})`);
    }

    // ── 3. Seed Departments ──
    console.log("\n🏢 Seeding Departments...");
    for (const d of SEED_DEPARTMENTS) {
      await Department.findOneAndUpdate(
        { name: d.name },
        { ...d, isActive: true },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Department: ${d.name} (${d.code})`);
    }

    // ── 4. Seed Academic Years ──
    console.log("\n📅 Seeding Academic Years & Archival Cycles...");
    for (const ay of SEED_ACADEMIC_YEARS) {
      await AcademicYear.findOneAndUpdate(
        { year: ay.year },
        ay,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Academic Year: ${ay.year} (${ay.label}) - ${ay.isCurrent ? "★ ACTIVE" : ay.isArchived ? "CLOCK ARCHIVED" : "UPCOMING"}`);
    }

    // ── 5. Seed All 34 Categories & Subcategories ──
    console.log("\n📑 Seeding Categories & Tiered Subcategories (Credit Config)...");
    let totalSubcategoriesCount = 0;
    for (const cat of SEED_CATEGORIES) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        cat,
        { upsert: true, new: true }
      );
      totalSubcategoriesCount += (cat.subcategories || []).length;
      console.log(`   ✅ [${cat.section.toUpperCase()}] ${cat.name} (${cat.creditPoints} pts) — ${(cat.subcategories || []).length} subcategories`);
    }
    console.log(`   🎯 Total Categories: ${SEED_CATEGORIES.length}, Total Subcategories: ${totalSubcategoriesCount}`);

    // ── 6. Seed Granular Credit Rules ──
    console.log("\n⚖️  Seeding Granular Credit Rules...");
    for (const rule of SEED_CREDIT_RULES) {
      await CreditRule.findOneAndUpdate(
        { ruleKey: rule.ruleKey },
        { ...rule, isActive: true },
        { upsert: true, new: true }
      );
    }
    console.log(`   ✅ Seeded ${SEED_CREDIT_RULES.length} Credit Rules`);

    console.log("\n==========================================================");
    console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==========================================================");
    console.log("Default Login Credentials:");
    console.log("🔑 Admin Login: ID / Email: 'admin' or 'mokshyagnay@gmail.com' | Password: 'admin'");
    console.log("🔑 HOD Login:   ID / Email: '23H71A0575!' or 'd.mokshyagnayadav@gmail.com' | Password: 'admin'");
    console.log("==========================================================\n");

  } catch (err) {
    console.error("❌ SEEDING ERROR:", err);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB\n");
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
