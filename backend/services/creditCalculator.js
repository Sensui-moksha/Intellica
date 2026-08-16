const Category = require("../models/Category");
const CreditRule = require("../models/CreditRule");

async function calculateCredits(upload) {
  try {
    const category = (upload.category || "").trim();
    const metadata = upload.metadata || {};

    // 1. Fetch Baseline / Default Category Credit Points from Category Registry / DB
    const categoryDoc = await Category.findOne({
      name: new RegExp('^' + category + '$', 'i')
    }).lean();

    const baselineCredits = (categoryDoc?.creditPoints !== undefined && categoryDoc?.creditPoints !== null)
      ? Number(categoryDoc.creditPoints)
      : 0;

    // 2. Check if a subcategory is configured on the Category and matches
    if (categoryDoc && Array.isArray(categoryDoc.subcategories) && categoryDoc.subcategories.length > 0) {
      const targetSub = (upload.subcategory || metadata?.subcategory || metadata?.subcategoryId || metadata?.ruleKey || metadata?.bookType || "").toString().trim().toLowerCase();
      if (targetSub) {
        const matchedSub = categoryDoc.subcategories.find(s =>
          s.name.toLowerCase() === targetSub ||
          (s.key && s.key.toLowerCase() === targetSub) ||
          (s._id && s._id.toString() === targetSub)
        );
        if (matchedSub && typeof matchedSub.creditPoints === 'number') {
          return matchedSub.creditPoints;
        }
      }
    }

    // 3. Check if a specific CreditRule key was provided
    if (metadata?.ruleKey) {
      const specificRule = await CreditRule.findOne({ ruleKey: metadata.ruleKey }).lean();
      if (specificRule && typeof specificRule.creditPoints === 'number') {
        return specificRule.creditPoints;
      }
    }

    // 4. Granular Category Calculations
    const lowerCat = category.toLowerCase();

    /* ================= BOOK ================= */
    if (lowerCat === "book") {
      const bType = (metadata?.bookType || metadata?.ruleKey || "").toLowerCase();
      const pub = (metadata?.publisher || "").toLowerCase();

      if (bType.includes("intl") || bType.includes("international") || pub.includes("ieee") || pub.includes("springer") || pub.includes("elsevier") || pub.includes("wiley") || pub.includes("mcgraw")) {
        return 30; // International Publisher Authored Book
      }
      if (bType.includes("natl") || bType.includes("national")) {
        return 20; // National Level ISBN Authored Book
      }
      if (bType.includes("chapter")) {
        return 10; // Book Chapter Contribution
      }
      if (bType.includes("edited") || bType.includes("volume")) {
        return 25; // Edited Book / Volume
      }
      // Default to Category baseline credits (e.g. 25)
      return baselineCredits > 0 ? baselineCredits : 25;
    }

    /* ================= PUBLICATION ================= */
    if (lowerCat === "publication") {
      const type = metadata?.paperType;
      const indexing = (metadata?.indexing || "").toLowerCase();
      const quartile = (metadata?.quartile || "").toUpperCase();

      if (indexing === "scopus" || indexing.includes("sci") || indexing.includes("wos")) {
        if (quartile === "Q1") return 40;
        if (quartile === "Q2") return 35;
        if (quartile === "Q3") return 30;
        if (quartile === "Q4") return 25;
        return 30;
      }
      if (indexing.includes("ugc") || indexing.includes("peer")) return 20;
      return baselineCredits > 0 ? baselineCredits : 30;
    }

    /* ================= CONFERENCE ================= */
    if (lowerCat === "conference") {
      const role = (metadata?.role || "").toLowerCase();
      const level = (metadata?.level || "").toLowerCase();
      if (role.includes("presentation") || role.includes("presenter")) {
        return level.includes("international") ? 20 : 15;
      }
      if (role.includes("organizer") || role.includes("chair")) return 25;
      return baselineCredits > 0 ? baselineCredits : 15;
    }

    /* ================= WORKSHOP ================= */
    if (lowerCat === "workshop") {
      const days = Number(metadata?.duration || 1);
      const level = (metadata?.level || "").toLowerCase();
      const base = level.includes("international") ? 15 : 10;
      return base + (days > 1 ? (days - 1) * 2 : 0);
    }

    /* ================= FDP ================= */
    if (lowerCat === "fdp") {
      const days = Number(metadata?.duration || 1);
      if (days >= 10) return 20; // 2-week FDP
      if (days >= 5) return 15;  // 1-week FDP
      return baselineCredits > 0 ? baselineCredits : 10;
    }

    /* ================= GUEST LECTURE ================= */
    if (lowerCat === "guestlecture") {
      const hours = Number(metadata?.duration || 1);
      return Math.min(30, 10 + (hours > 1 ? (hours - 1) * 5 : 0));
    }

    /* ================= SEMINAR ================= */
    if (lowerCat === "seminar") {
      const days = Number(metadata?.duration || 1);
      return 10 + (days > 1 ? (days - 1) * 2 : 0);
    }

    /* ================= WEBINAR ================= */
    if (lowerCat === "webinar") {
      return baselineCredits > 0 ? baselineCredits : 5;
    }

    /* ================= NPTEL ================= */
    if (lowerCat === "nptel") {
      const badge = (metadata?.badge || "").toLowerCase();
      if (badge.includes("gold") || badge.includes("top")) return 25;
      if (badge.includes("silver") || badge.includes("elite")) return 20;
      return baselineCredits > 0 ? baselineCredits : 15;
    }

    /* ================= HONORS / AWARDS ================= */
    if (lowerCat === "honorsawards" || lowerCat.includes("honor") || lowerCat.includes("award")) {
      return baselineCredits > 0 ? baselineCredits : 20;
    }

    /* ================= CERTIFICATION ================= */
    if (lowerCat === "certification") {
      return baselineCredits > 0 ? baselineCredits : 15;
    }

    /* ================= RESEARCH POLICY ================= */
    if (lowerCat === "researchpolicy") {
      return baselineCredits > 0 ? baselineCredits : 15;
    }

    /* ================= PROFESSIONAL MEMBERSHIP ================= */
    if (lowerCat === "professionalmembership") {
      return baselineCredits > 0 ? baselineCredits : 10;
    }

    /* ================= IPR / PATENTS ================= */
    if (lowerCat === "ipr" || lowerCat.includes("patent")) {
      const statusType = (metadata?.statusType || "").toLowerCase();
      if (statusType.includes("grant")) return 35;
      if (statusType.includes("publish")) return 25;
      return baselineCredits > 0 ? baselineCredits : 30;
    }

    /* ================= INCUBATION ================= */
    if (lowerCat === "incubation") {
      return baselineCredits > 0 ? baselineCredits : 20;
    }

    /* ================= CONSULTANCY ================= */
    if (lowerCat === "consultancy") {
      const amount = Number(metadata?.amount || 0);
      const lakhs = amount / 100000;
      return 25 + Math.round(lakhs * 5);
    }

    /* ================= MOU ================= */
    if (lowerCat === "mou") {
      return baselineCredits > 0 ? baselineCredits : 20;
    }

    /* ================= RESEARCH PROJECT ================= */
    if (lowerCat === "researchproject") {
      const amount = Number(metadata?.amount || 0);
      const lakhs = amount / 100000;
      return 35 + Math.round(lakhs * 2);
    }

    /* ================= DOCTORAL THESIS ================= */
    if (lowerCat === "doctoralthesis") {
      const guided = Number(metadata?.guidedCount || 1);
      return guided * 25;
    }

    /* ================= OTHERS ================= */
    if (lowerCat === "others") {
      return baselineCredits > 0 ? baselineCredits : 5;
    }

    // Default fallback to configured category baseline points or 10
    return baselineCredits > 0 ? baselineCredits : 10;

  } catch (error) {
    console.error("Credit calculation error:", error);
    return 10;
  }
}

module.exports = calculateCredits;