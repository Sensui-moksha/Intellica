/**
 * =============================================================================
 * 🚀 INTELLICA DATABASE SEED SCRIPT (seedDatabase.js)
 * =============================================================================
 * This script seeds or restores all core institutional data into MongoDB:
 *   1. Institutional Administrator Account
 *   2. Department & HOD Accounts
 *   3. All 23 Academic Categories & Tiered Subcategories across 4 PBAS Sections
 *   4. Granular Credit Evaluation Rules (38 CreditRules)
 *   5. College-Wide Academic Years & Archival Cycles
 *
 * Usage:
 *   node seedDatabase.js          (Seeds/updates database safely)
 *   node seedDatabase.js --reset  (Drops old collections and cleanly reseeds)
 *   npm run seed                  (Shortcut configured in package.json)
 * =============================================================================
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// Models
const User = require("./models/User");
const HOD = require("./models/HOD");
const Faculty = require("./models/Faculty");
const Department = require("./models/Department");
const Category = require("./models/Category");
const CreditRule = require("./models/CreditRule");
const AcademicYear = require("./models/AcademicYear");

const isReset = process.argv.includes("--reset");

// ── 1. DEFAULT ADMINISTRATOR & HOD ACCOUNTS ──
const SEED_USERS = {
  admin: {
    regId: "admin",
    email: "mokshyagnay@gmail.com",
    password: "admin", // Will be hashed with bcrypt (rounds: 10)
    role: "ADMIN",
    isApproved: true,
    twoFactorEnabled: false,
    isFirstLogin: false,
    profileImage: ""
  },
  hod: {
    employeeId: "23H71A0575!",
    name: "moksha",
    email: "d.mokshyagnayadav@gmail.com",
    password: "admin", // Will be hashed with bcrypt
    department: "CSE",
    designation: "Professor & HOD",
    googleScholar: "",
    vidwanId: "",
    scopusId: "",
    role: "HOD",
    isApproved: true,
    status: "APPROVED",
    twoFactorEnabled: false,
    isFirstLogin: false,
    profileImage: "departments/CSE/hod/moksha(23H71A0575_)/profile_pic/profile_image.jpg"
  }
};

// ── 2. DEPARTMENTS ──
const SEED_DEPARTMENTS = [
  {
    name: "CSE",
    code: "CSE",
    hod: "moksha",
    description: "Computer Science & Engineering",
    totalCredits: 0
  }
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
    description: "Current Active College Academic Year (Open for Submissions)"
  },
  {
    year: "2024-25",
    label: "AY 2024-25",
    isCurrent: false,
    isArchived: true,
    description: "Archived Academic Cycle (Historical Records)"
  }
];

// ── 4. ALL 23 CATEGORIES & TIERED SUBCATEGORIES ACROSS 4 PBAS SECTIONS ──
const SEED_CATEGORIES = [
  // ── SECTION I: TEACHING & LEARNING ──
  {
    name: "InnovativeTeaching",
    section: "teaching",
    key: "innovativeTeaching",
    creditPoints: 15,
    description: "ICT tools, pedagogical innovations, modern e-learning development",
    isActive: true,
    subcategories: [
      { name: "Developed Full Online E-Content Course", key: "ict_course", creditPoints: 20, description: "Full digital courseware or module" },
      { name: "Simulations / Virtual Labs / LMS Tools", key: "ict_simulations", creditPoints: 15, description: "Interactive simulations or automated grading tools" },
      { name: "Multimedia Lectures / Interactive Visuals", key: "ict_multimedia", creditPoints: 10, description: "Recorded lectures and rich presentations" }
    ]
  },

  // ── SECTION II: PROFESSIONAL DEVELOPMENT ──
  {
    name: "Conference",
    section: "professional",
    key: "conferences",
    creditPoints: 15,
    description: "International and National conference presentations and chairing",
    isActive: true,
    subcategories: [
      { name: "International Conference Presentation (Full Paper)", key: "conf_intl_present", creditPoints: 20, description: "International forum paper presentation" },
      { name: "National Conference Presentation", key: "conf_natl_present", creditPoints: 15, description: "National level conference presentation" },
      { name: "Session Chair / Keynote / Track Chair", key: "conf_chair", creditPoints: 25, description: "Session chairing or keynote speaker invitation" },
      { name: "Conference Organizing Secretary / Lead Organizer", key: "conf_organizer", creditPoints: 20, description: "Lead role in organizing national/international conference" }
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
      { name: "5+ Days Advanced Technical Workshop (Hands-on)", key: "workshop_5days", creditPoints: 15, description: "Extended technical workshop (attended / organized)" },
      { name: "2-4 Days Technical Skill Workshop", key: "workshop_2to4days", creditPoints: 10, description: "Multi-day technical workshop" },
      { name: "1-Day Specialized Workshop", key: "workshop_1day", creditPoints: 5, description: "One-day workshop participation" },
      { name: "Workshop Lead Organizer / Coordinator", key: "workshop_organizer", creditPoints: 20, description: "Convenor / Coordinator of technical workshop" }
    ]
  },
  {
    name: "Book",
    section: "professional",
    key: "books",
    creditPoints: 25,
    description: "Authored books, edited volumes, and chapter contributions",
    isActive: true,
    subcategories: [
      { name: "Authored Book (International Publisher - IEEE / Springer / Wiley)", key: "book_authored_intl", creditPoints: 30, description: "Complete authored book published with international reputed publisher" },
      { name: "Authored Book (National Publisher with ISBN)", key: "book_authored_natl", creditPoints: 20, description: "Authored book published with national publisher" },
      { name: "Edited Volume / Book as Chief Editor", key: "edited_volume", creditPoints: 25, description: "Edited volume or conference proceedings book" },
      { name: "Book Chapter (Scopus / IEEE / Springer Indexed)", key: "book_chapter_scopus", creditPoints: 15, description: "Contributed chapter in indexed book volume" },
      { name: "Book Chapter (National Publisher / ISBN)", key: "book_chapter_natl", creditPoints: 10, description: "Contributed chapter in ISBN book" }
    ]
  },
  {
    name: "NPTEL",
    section: "professional",
    key: "nptel",
    creditPoints: 15,
    description: "NPTEL, SWAYAM, and MOOC certifications (Elite, Gold, Silver)",
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
    description: "National, State, and Institutional awards and recognitions",
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
    description: "Keynote addresses, expert talks, and resource person deliveries",
    isActive: true,
    subcategories: [
      { name: "International Keynote / Expert Session", key: "lecture_intl", creditPoints: 20, description: "Keynote speech at international conference/university" },
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
    description: "Global industry professional certifications (AWS, Cisco, etc.)",
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
    description: "Other recognized academic and research contributions",
    isActive: true,
    subcategories: [
      { name: "Institutional Committee Leadership / Head", key: "other_lead", creditPoints: 15, description: "Chairperson / Convener of major institute committees" },
      { name: "General Academic / Extension Activity", key: "other_general", creditPoints: 5, description: "Other academic activities" }
    ]
  },

  // ── SECTION III: RESEARCH & DEVELOPMENT (R&D) ──
  {
    name: "Publication",
    section: "rnd",
    key: "paperPublications",
    creditPoints: 30,
    description: "Journal and Conference research publications (Scopus, SCI, UGC)",
    isActive: true,
    subcategories: [
      { name: "Journal Article (SCI / Scopus Q1)", key: "journal_q1", creditPoints: 40, description: "Top quartile SCI / Scopus indexed peer-reviewed journal" },
      { name: "Journal Article (Scopus Q2)", key: "journal_q2", creditPoints: 35, description: "Second quartile Scopus indexed journal" },
      { name: "Journal Article (Scopus Q3)", key: "journal_q3", creditPoints: 30, description: "Third quartile Scopus indexed journal" },
      { name: "Journal Article (Scopus Q4)", key: "journal_q4", creditPoints: 25, description: "Fourth quartile Scopus indexed journal" },
      { name: "Journal Article (UGC-CARE / Peer-Reviewed)", key: "journal_ugc", creditPoints: 20, description: "UGC-CARE approved or recognized peer-reviewed journal" }
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
    description: "External sponsored major and minor research grants",
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
    description: "Corporate and industrial consultancy assignments",
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
    description: "Institutional research policy framing and contributions",
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
    description: "Senior and life memberships in IEEE, ACM, CSI, IETE",
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
    description: "Startup incubation, mentorship, and commercialization",
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
    description: "Institutional and corporate Memorandum of Understanding",
    isActive: true,
    subcategories: [
      { name: "International University / Industry Active MoU", key: "mou_intl", creditPoints: 30, description: "Active collaborative research/exchange MoU" },
      { name: "National Corporate / Institutional MoU", key: "mou_natl", creditPoints: 20, description: "Functional academic-industry MoU" }
    ]
  },

  // ── SECTION IV: ADMINISTRATIVE & GOVERNANCE ──
  {
    name: "DeptAdministration",
    section: "administrative",
    key: "deptAdministration",
    creditPoints: 15,
    description: "Departmental coordinatorships (NBA, NAAC, Time-table, Exams)",
    isActive: true,
    subcategories: [
      { name: "Department NBA / NAAC Criteria Lead Coordinator", key: "admin_nba_lead", creditPoints: 20, description: "Accreditation criteria lead" },
      { name: "Department Academic / Exam / Time-table Coordinator", key: "admin_dept_coord", creditPoints: 15, description: "Core departmental role" },
      { name: "Laboratory In-charge / Class Teacher", key: "admin_lab_incharge", creditPoints: 10, description: "Lab or class mentorship" }
    ]
  },
  {
    name: "InstitutionalAdmin",
    section: "administrative",
    key: "institutionalAdmin",
    creditPoints: 20,
    description: "College-wide institutional leadership (Dean, IQAC, Placement, NSS)",
    isActive: true,
    subcategories: [
      { name: "Dean / Associate Dean / IQAC Director", key: "admin_dean_iqac", creditPoints: 30, description: "Apex institutional leadership" },
      { name: "Head of Training & Placement / Chief Warden", key: "admin_placement_head", creditPoints: 20, description: "College-wide portfolio head" },
      { name: "NSS / NCC / Sports / Cultural Convener", key: "admin_extension_convener", creditPoints: 15, description: "Co-curricular extension coordinator" }
    ]
  }
];

// ── 5. ALL 38 GRANULAR CREDIT RULES ──
const SEED_CREDIT_RULES = [
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q1", displayName: "Journal - Scopus (Q1)", creditPoints: 40, description: "Highest quartile peer-reviewed Scopus journal" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q2", displayName: "Journal - Scopus (Q2)", creditPoints: 35, description: "Q2 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q3", displayName: "Journal - Scopus (Q3)", creditPoints: 30, description: "Q3 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q4", displayName: "Journal - Scopus (Q4)", creditPoints: 25, description: "Q4 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_ugc_care", displayName: "Journal - UGC-CARE Listed", creditPoints: 20, description: "UGC recognized journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_sci_top", displayName: "SCI / SCIE Indexed Top Tier", creditPoints: 40, description: "Science Citation Index Expanded" },
  { category: "Publication", section: "rnd", ruleKey: "journal_peer_reviewed", displayName: "Peer Reviewed / Non-indexed", creditPoints: 15, description: "Standard academic journal publication" },

  { category: "Conference", section: "professional", ruleKey: "conf_intl_present", displayName: "International Conference Presentation", creditPoints: 20, description: "Author / Presenter at international forum" },
  { category: "Conference", section: "professional", ruleKey: "conf_natl_present", displayName: "National Conference Presentation", creditPoints: 15, description: "Author / Presenter at national conference" },
  { category: "Conference", section: "professional", ruleKey: "conf_chair_session", displayName: "Conference Session Chair / Keynote", creditPoints: 25, description: "Invited session chair / track chair" },
  { category: "Conference", section: "professional", ruleKey: "conf_organizer", displayName: "Conference Lead Organizer / Secretary", creditPoints: 20, description: "Organizing committee leadership" },

  { category: "Book", section: "professional", ruleKey: "book_authored_intl", displayName: "Authored Book (International Publisher)", creditPoints: 30, description: "Springer, Elsevier, Wiley, IEEE, etc." },
  { category: "Book", section: "professional", ruleKey: "book_authored_natl", displayName: "Authored Book (National / Reputed Publisher)", creditPoints: 20, description: "National level ISBN publication" },
  { category: "Book", section: "professional", ruleKey: "edited_volume", displayName: "Edited Volume / Conference Proceedings", creditPoints: 25, description: "Chief / volume editor" },
  { category: "Book", section: "professional", ruleKey: "book_chapter_scopus", displayName: "Book Chapter (Scopus / IEEE Indexed)", creditPoints: 15, description: "Indexed book chapter contribution" },
  { category: "Book", section: "professional", ruleKey: "book_chapter", displayName: "Book Chapter (National ISBN)", creditPoints: 10, description: "Standard book chapter contribution" },

  { category: "IPR", section: "rnd", ruleKey: "patent_intl_granted", displayName: "Patent Granted (International)", creditPoints: 40, description: "USPTO, EPO, WIPO granted patent" },
  { category: "IPR", section: "rnd", ruleKey: "patent_natl_granted", displayName: "Patent Granted (National)", creditPoints: 30, description: "Indian Patent Office granted patent" },
  { category: "IPR", section: "rnd", ruleKey: "patent_published", displayName: "Patent Published in Gazette", creditPoints: 20, description: "Official patent publication" },
  { category: "IPR", section: "rnd", ruleKey: "copyright_registered", displayName: "Copyright / Design Registered", creditPoints: 15, description: "Registered IP copyright or design" },

  { category: "ResearchProject", section: "rnd", ruleKey: "research_project_major_pi", displayName: "Major Research Project - PI (> ₹10 Lakhs)", creditPoints: 40, description: "DST, SERB, AICTE, DRDO sponsored" },
  { category: "ResearchProject", section: "rnd", ruleKey: "research_project_minor_pi", displayName: "Minor Research Project - PI (≤ ₹10 Lakhs)", creditPoints: 25, description: "Sponsored minor research grant" },
  { category: "ResearchProject", section: "rnd", ruleKey: "research_project_copi", displayName: "Co-Principal Investigator (Co-PI)", creditPoints: 15, description: "Joint sponsored research grant" },

  { category: "Consultancy", section: "rnd", ruleKey: "consultancy_industrial", displayName: "Industrial Consultancy Project", creditPoints: 25, description: "Revenue generating corporate consultancy" },

  { category: "Workshop", section: "professional", ruleKey: "workshop_5days", displayName: "Workshop (5+ Days / Hands-on)", creditPoints: 15, description: "Comprehensive technical training" },
  { category: "Workshop", section: "professional", ruleKey: "workshop_1to3days", displayName: "Workshop (1 - 3 Days)", creditPoints: 10, description: "Skill development workshop" },

  { category: "FDP", section: "rnd", ruleKey: "fdp_2weeks", displayName: "Faculty Development Programme (2 Weeks)", creditPoints: 20, description: "AICTE / ATAL approved 2-week FDP" },
  { category: "FDP", section: "rnd", ruleKey: "fdp_1week", displayName: "Faculty Development Programme (1 Week)", creditPoints: 15, description: "5-day specialized FDP" },

  { category: "NPTEL", section: "professional", ruleKey: "nptel_gold_elite", displayName: "NPTEL / SWAYAM - Elite + Gold (≥90%)", creditPoints: 25, description: "Top 1-2% topper certification" },
  { category: "NPTEL", section: "professional", ruleKey: "nptel_silver", displayName: "NPTEL / SWAYAM - Elite + Silver (75-89%)", creditPoints: 20, description: "8-12 week advanced certification" },
  { category: "NPTEL", section: "professional", ruleKey: "nptel_elite", displayName: "NPTEL / SWAYAM - Elite (60-74%)", creditPoints: 15, description: "Elite MOOC certification" },
  { category: "NPTEL", section: "professional", ruleKey: "nptel_pass", displayName: "NPTEL / SWAYAM - Successful Completion", creditPoints: 10, description: "Passed proctored MOOC examination" },

  { category: "DoctoralThesis", section: "rnd", ruleKey: "phd_awarded", displayName: "Ph.D. Scholar Guided & Awarded", creditPoints: 35, description: "Doctoral degree conferred under faculty guide" },
  { category: "DoctoralThesis", section: "rnd", ruleKey: "phd_ongoing", displayName: "Ph.D. Scholar Currently Guiding", creditPoints: 15, description: "Active registered doctoral candidate" },

  { category: "HonorsAwards", section: "professional", ruleKey: "award_national", displayName: "National / State Level Academic Award", creditPoints: 20, description: "Excellence in research or teaching" },
  { category: "MoU", section: "rnd", ruleKey: "mou_active_industry", displayName: "Active Industry MoU Initiator", creditPoints: 20, description: "Formal partnership agreement signed" },
  { category: "GuestLecture", section: "professional", ruleKey: "guest_lecture_keynote", displayName: "Keynote Address / Invited Expert Talk", creditPoints: 15, description: "Resource person at recognized forum" },
  { category: "Certification", section: "professional", ruleKey: "global_certification", displayName: "Global Industry Certification (AWS/Google/CISCO)", creditPoints: 20, description: "Professional proctored certification" },
  { category: "ResearchPolicy", section: "rnd", ruleKey: "institutional_policy", displayName: "Institutional Research Policy Contribution", creditPoints: 15, description: "Committee framing academic research guidelines" },

  { category: "InnovativeTeaching", section: "teaching", ruleKey: "teaching_econtent_dev", displayName: "Digital Pedagogy / E-Content Module", creditPoints: 15, description: "ICT based digital course module development" },
  { category: "DeptAdministration", section: "administrative", ruleKey: "admin_nba_naac_lead", displayName: "NBA / NAAC Criteria Coordinator", creditPoints: 20, description: "Department level accreditation criteria lead" },
  { category: "InstitutionalAdmin", section: "administrative", ruleKey: "admin_iqac_director", displayName: "IQAC Director / Dean / Chief Warden", creditPoints: 25, description: "Apex institutional governance portfolio" }
];

async function seedDatabase(options = {}) {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ Error: MONGO_URI is missing in backend/.env");
    if (options.disconnect !== false) process.exit(1);
    return;
  }

  const shouldReset = options.reset !== undefined ? options.reset : isReset;
  const shouldDisconnect = options.disconnect !== undefined ? options.disconnect : true;

  console.log("==========================================================");
  console.log("🚀 INTELLICA DATABASE SEEDER");
  console.log("==========================================================");

  try {
    if (mongoose.connection.readyState === 0) {
      console.log(`📡 Connecting to MongoDB...`);
      await mongoose.connect(mongoUri);
      console.log("✅ Connected to MongoDB successfully\n");
    }

    // ── STEP 1: DROP OLD COLLECTIONS IF --reset FLAG IS PROVIDED ──
    if (shouldReset) {
      console.log("🧹 Reset Mode: Clearing existing users, categories, rules, academic years, and departments...");
      await Promise.all([
        User.deleteMany({}),
        HOD.deleteMany({}),
        Department.deleteMany({}),
        Category.deleteMany({}),
        CreditRule.deleteMany({}),
        AcademicYear.deleteMany({})
      ]);
      console.log("✅ Collections cleared\n");
    }

    // ── STEP 2: SEED ADMIN USER ──
    console.log("👤 Seeding Administrator User...");
    const adminData = SEED_USERS.admin;
    const adminHashedPassword = await bcrypt.hash(adminData.password, 10);

    const admin = await User.findOneAndUpdate(
      { $or: [{ regId: adminData.regId }, { email: adminData.email }] },
      {
        regId: adminData.regId,
        email: adminData.email,
        password: adminHashedPassword,
        role: adminData.role,
        isApproved: adminData.isApproved,
        twoFactorEnabled: adminData.twoFactorEnabled,
        isFirstLogin: adminData.isFirstLogin,
        profileImage: adminData.profileImage
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✅ Admin created/updated: ${admin.regId} (${admin.email})`);

    // ── STEP 3: SEED HOD USER ──
    console.log("\n🎓 Seeding HOD User...");
    const hodData = SEED_USERS.hod;
    const hodHashedPassword = await bcrypt.hash(hodData.password, 10);

    const hod = await HOD.findOneAndUpdate(
      { $or: [{ employeeId: hodData.employeeId }, { email: hodData.email }] },
      {
        employeeId: hodData.employeeId,
        name: hodData.name,
        email: hodData.email,
        password: hodHashedPassword,
        department: hodData.department,
        designation: hodData.designation,
        role: hodData.role,
        isApproved: hodData.isApproved,
        status: hodData.status,
        profileImage: hodData.profileImage
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✅ HOD created/updated: ${hod.name} (${hod.department} - ${hod.email})`);

    // ── STEP 4: SEED DEPARTMENTS ──
    console.log("\n🏢 Seeding Departments...");
    for (const d of SEED_DEPARTMENTS) {
      const dept = await Department.findOneAndUpdate(
        { $or: [{ code: d.code }, { name: d.name }] },
        { ...d },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`   ✅ Department: ${dept.code} - ${dept.name} (HOD: ${dept.hod})`);
    }

    // ── STEP 5: SEED ACADEMIC YEARS ──
    console.log("\n📅 Seeding Academic Years & Archival Cycles...");
    for (const ay of SEED_ACADEMIC_YEARS) {
      const academicYear = await AcademicYear.findOneAndUpdate(
        { year: ay.year },
        { ...ay },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`   ✅ Academic Year: ${academicYear.year} (${academicYear.label}) - ${academicYear.isCurrent ? '★ ACTIVE' : (academicYear.isArchived ? 'CLOCK ARCHIVED' : 'UPCOMING')}`);
    }

    // ── STEP 6: SEED CATEGORIES & TIERED SUBCATEGORIES ──
    console.log("\n📑 Seeding Categories & Tiered Subcategories (Credit Config)...");
    let totalSubCount = 0;
    for (const cat of SEED_CATEGORIES) {
      const category = await Category.findOneAndUpdate(
        { $or: [{ key: cat.key }, { name: cat.name }] },
        {
          name: cat.name,
          section: cat.section,
          key: cat.key,
          creditPoints: cat.creditPoints,
          description: cat.description,
          subcategories: cat.subcategories,
          isActive: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const subLength = category.subcategories?.length || 0;
      totalSubCount += subLength;
      console.log(`   ✅ [${category.section.toUpperCase()}] ${category.name} (${category.creditPoints} pts) — ${subLength} subcategories`);
    }
    console.log(`   🎯 Total Categories: ${SEED_CATEGORIES.length}, Total Subcategories: ${totalSubCount}`);

    // ── STEP 7: SEED CREDIT RULES ──
    console.log("\n⚖️  Seeding Granular Credit Rules...");
    for (const rule of SEED_CREDIT_RULES) {
      await CreditRule.findOneAndUpdate(
        { ruleKey: rule.ruleKey },
        { ...rule },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`   ✅ Seeded ${SEED_CREDIT_RULES.length} Credit Rules`);

    console.log("\n==========================================================");
    console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==========================================================");
    console.log("Default Login Credentials:");
    console.log(`🔑 Admin Login: ID / Email: 'admin' or 'mokshyagnay@gmail.com' | Password: 'admin'`);
    console.log(`🔑 HOD Login:   ID / Email: '23H71A0575!' or 'd.mokshyagnayadav@gmail.com' | Password: 'admin'`);
    console.log("==========================================================\n");

  } catch (err) {
    console.error("❌ Seeding Error:", err);
    if (shouldDisconnect) process.exit(1);
    throw err;
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect();
      console.log("👋 Disconnected from MongoDB");
    }
  }
}

if (require.main === module) {
  seedDatabase({ reset: isReset, disconnect: true });
}

module.exports = {
  seedDatabase,
  SEED_USERS,
  SEED_DEPARTMENTS,
  SEED_ACADEMIC_YEARS,
  SEED_CATEGORIES,
  SEED_CREDIT_RULES
};
