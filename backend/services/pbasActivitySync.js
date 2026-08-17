/**
 * pbasActivitySync.js — Maps Intellica Uploads to PBAS Parameters
 * ─────────────────────────────────────────────────────────────────────────────
 * Queries approved uploads for a faculty member and auto-populates
 * PBAS inputs across Teaching (I), Professional Development (II),
 * Research (III), and Administrative (IV) sections.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Upload = require("../models/Upload");

const APPROVED_STATUSES = [
  "APPROVED",
  "HOD_APPROVED",
  "ADMIN_APPROVED",
  "HOD_SUBMITTED",
  "FACULTY_SUBMITTED"
];

/**
 * Auto-populates PBAS input object from a faculty member's approved uploads and profile.
 * 
 * @param {string|ObjectId} facultyId 
 * @param {string} academicYear (e.g. '2025-26')
 * @param {object} existingInputs (existing semester inputs to merge with)
 * @param {string} role ('ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR')
 * @returns {Promise<object>} { semester1, syncedCounts, totalApprovedActivities }
 */
async function autoPopulateFromActivities(facultyId, academicYear = "2025-26", existingInputs = {}, role = "ASSISTANT_PROFESSOR") {
  // Query all approved/submitted uploads for this faculty
  const uploads = await Upload.find({
    faculty: facultyId,
    status: { $in: APPROVED_STATUSES }
  }).lean();

  const semester1 = {
    teaching: JSON.parse(JSON.stringify(existingInputs?.semester1?.teaching || existingInputs?.teaching || {})),
    professional: {},
    research: {},
    administrative: {},
  };

  const synced = {
    books: 0,
    publications: 0,
    conferences: 0,
    nptel: 0,
    fdp_workshops: 0,
    memberships: 0,
    patents: 0,
    projects: 0,
    consultancy: 0,
    awards: 0,
    phd: 0,
    teaching: 0,
    admin: 0,
  };

  for (const item of uploads) {
    const cat = (item.category || "").toLowerCase();
    const subcat = (item.subcategory || "").toLowerCase();
    const meta = item.metadata || {};

    // ── 1. Books & Book Chapters ──
    if (cat.includes("book") || subcat.includes("book")) {
      synced.books++;
      if (!semester1.research.books) semester1.research.books = {};
      const isChapter = subcat.includes("chapter") || cat.includes("chapter") || (meta.bookType || "").toLowerCase().includes("chapter");
      const isSole = (meta.authorship || meta.authorType || "").toLowerCase().includes("sole") || (meta.authorRole || "").toLowerCase().includes("single");

      if (isChapter) {
        if (isSole) {
          semester1.research.books.chapterSoleAuthor = (semester1.research.books.chapterSoleAuthor || 0) + 1;
        } else {
          semester1.research.books.chapterMultipleAuthor = (semester1.research.books.chapterMultipleAuthor || 0) + 1;
        }
      } else {
        if (isSole || !semester1.research.books.booksSoleAuthor) {
          semester1.research.books.booksSoleAuthor = (semester1.research.books.booksSoleAuthor || 0) + 1;
        } else {
          semester1.research.books.booksMultipleAuthor = (semester1.research.books.booksMultipleAuthor || 0) + 1;
        }
      }
    }

    // ── 2. Journal Research Publications ──
    else if (cat.includes("publication") || cat.includes("paper") || cat.includes("journal")) {
      synced.publications++;
      if (!semester1.research.researchPublications) semester1.research.researchPublications = {};
      const ifVal = parseFloat(meta.impactFactor || meta.if || 0);
      const isIntl = (meta.journalType || meta.level || "").toLowerCase().includes("international") || subcat.includes("sci") || subcat.includes("q1") || subcat.includes("q2");

      if (isIntl) {
        if (ifVal >= 1 || subcat.includes("q1") || subcat.includes("sci")) {
          semester1.research.researchPublications.intlJournalHighIF = (semester1.research.researchPublications.intlJournalHighIF || 0) + 1;
        } else {
          semester1.research.researchPublications.intlJournalLowIF = (semester1.research.researchPublications.intlJournalLowIF || 0) + 1;
        }
      } else {
        if (ifVal >= 1) {
          semester1.research.researchPublications.natlJournalHighIF = (semester1.research.researchPublications.natlJournalHighIF || 0) + 1;
        } else {
          semester1.research.researchPublications.natlJournalLowIF = (semester1.research.researchPublications.natlJournalLowIF || 0) + 1;
        }
      }
    }

    // ── 3. Conferences ──
    else if (cat.includes("conference") || cat.includes("symposium")) {
      synced.conferences++;
      if (!semester1.research.conferences) semester1.research.conferences = {};
      const isOutside = (meta.venue || meta.location || "").toLowerCase().includes("abroad") || (meta.level || "").toLowerCase().includes("outside");
      const isIntl = (meta.level || "").toLowerCase().includes("international") || subcat.includes("intl");

      if (isOutside) {
        semester1.research.conferences.intlOutsideCountry = (semester1.research.conferences.intlOutsideCountry || 0) + 1;
      } else if (isIntl) {
        semester1.research.conferences.intlWithinCountry = (semester1.research.conferences.intlWithinCountry || 0) + 1;
      } else {
        semester1.research.conferences.national = (semester1.research.conferences.national || 0) + 1;
      }
    }

    // ── 4. NPTEL / MOOCs ──
    else if (cat.includes("nptel") || cat.includes("mooc") || cat.includes("swayam")) {
      synced.nptel++;
      if (!semester1.professional.nptel) semester1.professional.nptel = {};
      semester1.professional.nptel.nptelCertifications = (semester1.professional.nptel.nptelCertifications || 0) + 1;
    }

    // ── 5. FDP / Workshops / STTP / Training / Seminars / Webinars ──
    else if (cat.includes("fdp") || cat.includes("workshop") || cat.includes("seminar") || cat.includes("webinar") || cat.includes("certification") || cat.includes("guestlecture")) {
      synced.fdp_workshops++;
      if (!semester1.professional.shortTermCourses) semester1.professional.shortTermCourses = {};
      const days = parseInt(meta.durationDays || meta.days || (cat.includes("fdp") ? 5 : 2), 10);
      if (days >= 10 || subcat.includes("2week")) {
        semester1.professional.shortTermCourses.twoWeeksFDP = (semester1.professional.shortTermCourses.twoWeeksFDP || 0) + 1;
      } else {
        semester1.professional.shortTermCourses.oneWeekFDP = (semester1.professional.shortTermCourses.oneWeekFDP || 0) + 1;
      }
    }

    // ── 6. Professional Society Memberships ──
    else if (cat.includes("membership") || cat.includes("professionalmemberships")) {
      synced.memberships++;
      if (!semester1.professional.professionalMembership) semester1.professional.professionalMembership = {};
      const isIntl = (meta.societyLevel || meta.level || "").toLowerCase().includes("international") || (meta.societyName || "").toLowerCase().includes("ieee") || (meta.societyName || "").toLowerCase().includes("acm");
      if (isIntl) {
        semester1.professional.professionalMembership.internationalMemberships = (semester1.professional.professionalMembership.internationalMemberships || 0) + 1;
      } else {
        semester1.professional.professionalMembership.nationalMemberships = (semester1.professional.professionalMembership.nationalMemberships || 0) + 1;
      }
    }

    // ── 7. Patents / IPR ──
    else if (cat.includes("ipr") || cat.includes("patent")) {
      synced.patents++;
      if (!semester1.research.patents) semester1.research.patents = {};
      const isAwarded = (meta.patentStatus || meta.status || "").toLowerCase().includes("grant") || (meta.patentStatus || "").toLowerCase().includes("award") || subcat.includes("grant");
      if (isAwarded) {
        semester1.research.patents.patentsAwarded = (semester1.research.patents.patentsAwarded || 0) + 1;
      } else {
        semester1.research.patents.patentsApplied = (semester1.research.patents.patentsApplied || 0) + 1;
      }
    }

    // ── 8. Sponsored Research Projects ──
    else if (cat.includes("project") || cat.includes("researchprojects")) {
      synced.projects++;
      if (!semester1.research.sponsoredResearch) semester1.research.sponsoredResearch = {};
      const amt = parseFloat(meta.fundAmount || meta.amount || meta.sanctionedAmount || 1000000);
      const roleInProj = (meta.projectRole || meta.role || "PI").toUpperCase().includes("CO") ? "CO_PI" : "PI";
      semester1.research.sponsoredResearch.projectAmount = Math.max(semester1.research.sponsoredResearch.projectAmount || 0, amt);
      semester1.research.sponsoredResearch.roleInProject = roleInProj;
    }

    // ── 9. Consultancy ──
    else if (cat.includes("consultancy")) {
      synced.consultancy++;
      if (!semester1.research.consultancy) semester1.research.consultancy = {};
      const amt = parseFloat(meta.consultancyAmount || meta.amount || 100000);
      semester1.research.consultancy.consultancyAmount = (semester1.research.consultancy.consultancyAmount || 0) + amt;
    }

    // ── 10. Doctoral Guidance (PhD) ──
    else if (cat.includes("doctoral") || cat.includes("thesis") || cat.includes("phd")) {
      synced.phd++;
      if (!semester1.research.phdGuidance) semester1.research.phdGuidance = {};
      const isAwarded = (meta.phdStatus || meta.status || "").toLowerCase().includes("awarded") || subcat.includes("awarded");
      if (isAwarded) {
        semester1.research.phdGuidance.phdDegreeAwarded = (semester1.research.phdGuidance.phdDegreeAwarded || 0) + 1;
      } else {
        semester1.research.phdGuidance.phdOngoing = (semester1.research.phdGuidance.phdOngoing || 0) + 1;
      }
    }

    // ── 11. Honors & Awards ──
    else if (cat.includes("award") || cat.includes("honor") || cat.includes("honorsawards")) {
      synced.awards++;
      if (!semester1.administrative.awards) semester1.administrative.awards = {};
      const level = (meta.awardLevel || meta.level || "").toLowerCase();
      if (level.includes("international")) {
        semester1.administrative.awards.awardInternational = (semester1.administrative.awards.awardInternational || 0) + 1;
      } else if (level.includes("national")) {
        semester1.administrative.awards.awardNational = (semester1.administrative.awards.awardNational || 0) + 1;
      } else if (level.includes("state")) {
        semester1.administrative.awards.awardState = (semester1.administrative.awards.awardState || 0) + 1;
      } else if (level.includes("university")) {
        semester1.administrative.awards.awardUniversity = (semester1.administrative.awards.awardUniversity || 0) + 1;
      } else {
        semester1.administrative.awards.awardCollege = (semester1.administrative.awards.awardCollege || 0) + 1;
      }
    }

    // ── 12. Innovative Teaching & Pedagogy ──
    else if (cat.includes("innovativeteaching") || cat.includes("teaching") || cat.includes("pedagogy")) {
      synced.teaching++;
      if (!semester1.teaching.innovativeTeaching) semester1.teaching.innovativeTeaching = {};
      semester1.teaching.innovativeTeaching.eContent = (semester1.teaching.innovativeTeaching.eContent || 0) + 10;
      semester1.teaching.innovativeTeaching.pptVisuals = (semester1.teaching.innovativeTeaching.pptVisuals || 0) + 10;
    }

    // ── 13. Departmental & Institutional Administration ──
    else if (cat.includes("admin") || cat.includes("deptadministration") || cat.includes("institutionaladmin") || cat.includes("nss") || cat.includes("trainingplacement") || cat.includes("other")) {
      synced.admin++;
      if (!semester1.administrative.deptAdmin) semester1.administrative.deptAdmin = {};
      semester1.administrative.deptAdmin.deptCoordinator = (semester1.administrative.deptAdmin.deptCoordinator || 0) + 1;
    }
  }

  return {
    semester1,
    syncedCounts: synced,
    totalApprovedActivities: uploads.length,
  };
}

module.exports = {
  autoPopulateFromActivities,
};
