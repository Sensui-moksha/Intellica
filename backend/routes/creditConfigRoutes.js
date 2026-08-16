const express = require("express");
const router = express.Router();
const CreditConfig = require("../models/CreditConfig");
const CreditRule = require("../models/CreditRule");
const Upload = require("../models/Upload");
const calculateCredits = require("../services/creditCalculator");
const authMiddleware = require("../middleware/authMiddleware");

const DEFAULT_RULES = [
  // Publications
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q1", displayName: "Journal - Scopus (Q1)", creditPoints: 30, description: "Highest quartile peer-reviewed Scopus journal" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q2", displayName: "Journal - Scopus (Q2)", creditPoints: 25, description: "Q2 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q3", displayName: "Journal - Scopus (Q3)", creditPoints: 20, description: "Q3 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_scopus_q4", displayName: "Journal - Scopus (Q4)", creditPoints: 15, description: "Q4 indexed Scopus journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "journal_sci_scie", displayName: "Journal - SCI / SCIE", creditPoints: 30, description: "Science Citation Index Expanded" },
  { category: "Publication", section: "rnd", ruleKey: "journal_ugc_care", displayName: "Journal - UGC CARE Listed", creditPoints: 10, description: "UGC approved journal publication" },
  { category: "Publication", section: "rnd", ruleKey: "conference_proceedings_scopus", displayName: "Conference Proceedings - Scopus / IEEE", creditPoints: 15, description: "Flagship conference publication" },

  // Conferences
  { category: "Conference", section: "professional", ruleKey: "conference_presentation_intl", displayName: "International Conference Presentation", creditPoints: 15, description: "Paper presented abroad or international forum" },
  { category: "Conference", section: "professional", ruleKey: "conference_presentation_natl", displayName: "National Conference Presentation", creditPoints: 10, description: "Paper presented at national level" },
  { category: "Conference", section: "professional", ruleKey: "conference_organizing_chair", displayName: "Conference General Chair / Organizer", creditPoints: 15, description: "Lead organizer for academic conference" },

  // Patents / IPR
  { category: "IPR", section: "rnd", ruleKey: "patent_granted_international", displayName: "Patent Granted (International / US / PCT)", creditPoints: 40, description: "Awarded international patent" },
  { category: "IPR", section: "rnd", ruleKey: "patent_granted_indian", displayName: "Patent Granted (Indian Patent Office)", creditPoints: 30, description: "Awarded national patent" },
  { category: "IPR", section: "rnd", ruleKey: "patent_published", displayName: "Patent Published / Filed", creditPoints: 15, description: "Official journal publication of patent" },
  { category: "IPR", section: "rnd", ruleKey: "copyright_design", displayName: "Copyright / Industrial Design Registered", creditPoints: 10, description: "Government certified copyright / design" },

  // Books
  { category: "Book", section: "professional", ruleKey: "book_authored_intl", displayName: "Authored Book (International Publisher)", creditPoints: 30, description: "Springer, Elsevier, Wiley, IEEE, etc." },
  { category: "Book", section: "professional", ruleKey: "book_authored_natl", displayName: "Authored Book (National / Reputed Publisher)", creditPoints: 20, description: "National level ISBN publication" },
  { category: "Book", section: "professional", ruleKey: "book_chapter", displayName: "Book Chapter Contribution", creditPoints: 10, description: "Single / multi-author chapter in indexed book" },

  // Research Projects
  { category: "ResearchProject", section: "rnd", ruleKey: "research_project_major_pi", displayName: "Major Research Project - PI (> ₹10 Lakhs)", creditPoints: 40, description: "Funded by DST, SERB, AICTE, DRDO, etc." },
  { category: "ResearchProject", section: "rnd", ruleKey: "research_project_minor_pi", displayName: "Minor Research Project - PI (< ₹10 Lakhs)", creditPoints: 20, description: "External sponsored minor research grant" },
  { category: "ResearchProject", section: "rnd", ruleKey: "research_project_copi", displayName: "Co-Principal Investigator (Co-PI)", creditPoints: 15, description: "Joint sponsored research grant" },

  // Consultancy
  { category: "Consultancy", section: "rnd", ruleKey: "consultancy_industrial", displayName: "Industrial Consultancy Project", creditPoints: 25, description: "Revenue generating corporate consultancy" },

  // Workshops & FDPs
  { category: "Workshop", section: "professional", ruleKey: "workshop_5days", displayName: "Workshop (5 Days / Hands-on)", creditPoints: 15, description: "Comprehensive technical training" },
  { category: "Workshop", section: "professional", ruleKey: "workshop_1to3days", displayName: "Workshop (1 - 3 Days)", creditPoints: 10, description: "Skill development workshop" },
  { category: "FDP", section: "rnd", ruleKey: "fdp_2weeks", displayName: "Faculty Development Programme (2 Weeks)", creditPoints: 20, description: "AICTE / ATAL approved 2-week FDP" },
  { category: "FDP", section: "rnd", ruleKey: "fdp_1week", displayName: "Faculty Development Programme (1 Week)", creditPoints: 10, description: "5-day specialized FDP" },

  // NPTEL / MOOC
  { category: "NPTEL", section: "professional", ruleKey: "nptel_gold_elite", displayName: "NPTEL / SWAYAM - Elite + Gold (>=90%)", creditPoints: 20, description: "12-week top 1-2% topper certification" },
  { category: "NPTEL", section: "professional", ruleKey: "nptel_silver", displayName: "NPTEL / SWAYAM - Elite + Silver (75-89%)", creditPoints: 15, description: "8-12 week advanced certification" },
  { category: "NPTEL", section: "professional", ruleKey: "nptel_pass", displayName: "NPTEL / SWAYAM - Successful Completion", creditPoints: 10, description: "Passed proctored MOOC examination" },

  // Doctoral Thesis
  { category: "DoctoralThesis", section: "rnd", ruleKey: "phd_awarded", displayName: "Ph.D. Scholar Guided & Awarded", creditPoints: 25, description: "Doctoral degree conferred under faculty guide" },
  { category: "DoctoralThesis", section: "rnd", ruleKey: "phd_ongoing", displayName: "Ph.D. Scholar Currently Guiding", creditPoints: 10, description: "Active registered doctoral candidate" },

  // Honors, Awards & MoUs
  { category: "HonorsAwards", section: "professional", ruleKey: "award_national", displayName: "National / State Level Academic Award", creditPoints: 25, description: "Excellence in research or teaching" },
  { category: "MoU", section: "rnd", ruleKey: "mou_active_industry", displayName: "Active Industry MoU Initiator", creditPoints: 20, description: "Formal partnership agreement signed" },
  { category: "GuestLecture", section: "professional", ruleKey: "guest_lecture_keynote", displayName: "Keynote Address / Invited Expert Talk", creditPoints: 10, description: "Resource person at recognized forum" },
  { category: "Certification", section: "professional", ruleKey: "global_certification", displayName: "Global Industry Certification (AWS/Google/CISCO)", creditPoints: 15, description: "Professional proctored certification" },
  { category: "ResearchPolicy", section: "rnd", ruleKey: "institutional_policy", displayName: "Institutional Research Policy Contribution", creditPoints: 15, description: "Committee framing academic research guidelines" }
];

/* ── GET ALL RULES (Auto-Seeds if Empty) ── */
router.get("/rules", async (req, res) => {
  try {
    let rules = await CreditRule.find().sort({ category: 1, creditPoints: -1 });

    if (!rules || rules.length === 0) {
      await CreditRule.insertMany(DEFAULT_RULES);
      rules = await CreditRule.find().sort({ category: 1, creditPoints: -1 });
    }

    res.json({ rules });
  } catch (err) {
    console.error("FETCH RULES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch credit rules" });
  }
});

/* ── CREATE RULE ── */
router.post("/rules", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can create credit rules" });
    }

    const { category, section, ruleKey, displayName, creditPoints, description } = req.body;
    if (!category || !displayName || creditPoints === undefined) {
      return res.status(400).json({ message: "Category, Display Name, and Credit Points are required" });
    }

    const generatedKey = ruleKey?.trim() || `${category.toLowerCase()}_${displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const newRule = await CreditRule.create({
      category: category.trim(),
      section: section || "rnd",
      ruleKey: generatedKey,
      displayName: displayName.trim(),
      creditPoints: Number(creditPoints),
      description: description?.trim() || ""
    });

    res.status(201).json({ message: "Credit rule created successfully", rule: newRule });
  } catch (err) {
    console.error("CREATE RULE ERROR:", err);
    res.status(500).json({ message: "Failed to create credit rule" });
  }
});

/* ── UPDATE RULE ── */
router.put("/rules/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can edit credit rules" });
    }

    const { id } = req.params;
    const { category, section, ruleKey, displayName, creditPoints, description } = req.body;

    const rule = await CreditRule.findById(id);
    if (!rule) {
      return res.status(404).json({ message: "Credit rule not found" });
    }

    if (category) rule.category = category.trim();
    if (section) rule.section = section;
    if (ruleKey) rule.ruleKey = ruleKey.trim();
    if (displayName) rule.displayName = displayName.trim();
    if (creditPoints !== undefined) rule.creditPoints = Number(creditPoints);
    if (description !== undefined) rule.description = description.trim();

    await rule.save();

    res.json({ message: "Credit rule updated successfully", rule });
  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    res.status(500).json({ message: "Failed to update credit rule" });
  }
});

/* ── DELETE RULE ── */
router.delete("/rules/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can delete credit rules" });
    }

    const { id } = req.params;
    const deleted = await CreditRule.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Credit rule not found" });
    }

    res.json({ message: `Rule "${deleted.displayName}" deleted successfully` });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ message: "Failed to delete credit rule" });
  }
});

/* ── BULK DELETE RULES ── */
router.post("/rules/bulk-delete", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can perform bulk delete" });
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No rule IDs specified" });
    }

    const result = await CreditRule.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} credit rule(s) deleted successfully`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("BULK DELETE RULES ERROR:", err);
    res.status(500).json({ message: "Failed to bulk delete credit rules" });
  }
});

/* ── RESET / SEED DEFAULTS ── */
router.post("/rules/reset-defaults", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can reset defaults" });
    }

    await CreditRule.deleteMany({});
    const inserted = await CreditRule.insertMany(DEFAULT_RULES);

    res.json({ message: `Restored ${inserted.length} default institutional credit rules`, count: inserted.length });
  } catch (err) {
    console.error("RESET DEFAULTS ERROR:", err);
    res.status(500).json({ message: "Failed to reset default credit rules" });
  }
});

/* ── LEGACY GET ALL FOR MATRIX ── */
router.get("/all", async (req, res) => {
  try {
    let rules = await CreditRule.find().sort({ category: 1, creditPoints: -1 });
    if (!rules || rules.length === 0) {
      await CreditRule.insertMany(DEFAULT_RULES);
      rules = await CreditRule.find().sort({ category: 1, creditPoints: -1 });
    }

    const configs = await CreditConfig.find();
    const result = {};
    configs.forEach(c => {
      result[c.type] = c.config;
    });

    res.json({ result, rules, configs: rules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch config" });
  }
});

/* ── LEGACY GET BY TYPE ── */
router.get("/:type", async (req, res) => {
  const { type } = req.params;
  const config = await CreditConfig.findOne({ type });
  res.json(config || { config: {} });
});

/* ── LEGACY POST BY TYPE ── */
router.post("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const configData = req.body.config || req.body;

    if (!configData || Object.keys(configData).length === 0) {
      return res.status(400).json({ message: "Config is empty" });
    }

    let existing = await CreditConfig.findOne({ type });
    if (existing) {
      existing.config = configData;
      await existing.save();
    } else {
      await CreditConfig.create({ type, config: configData });
    }

    res.json({ message: "Config saved successfully" });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ message: "Error saving config" });
  }
});

/* ── RECALCULATE CREDITS FOR ALL UPLOADS ── */
router.post("/recalculate-all", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    const uploads = await Upload.find({});
    let updatedCount = 0;
    for (const u of uploads) {
      const calculated = await calculateCredits(u);
      if (calculated !== u.credits) {
        u.credits = calculated;
        await u.save();
        updatedCount++;
      }
    }
    res.json({
      success: true,
      message: `Successfully re-evaluated and updated ${updatedCount} submissions.`,
      total: uploads.length,
      updated: updatedCount
    });
  } catch (err) {
    console.error("Recalculate error:", err);
    res.status(500).json({ message: "Failed to recalculate credits", error: err.message });
  }
});

module.exports = router;