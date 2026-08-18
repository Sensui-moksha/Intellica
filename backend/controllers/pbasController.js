/**
 * pbasController.js — Express Handlers for PBAS Appraisal
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles CRUD operations and calculation for PBAS appraisals.
 * Uses existing authMiddleware for authentication.
 * Does NOT modify any existing controller or business logic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PBASAppraisal = require("../models/PBASAppraisal");
const Faculty = require("../models/Faculty");
const HOD = require("../models/HOD");
const { calculatePBAS } = require("../services/pbasCalculator");
const { getRulesForRole, mapDesignationToRole, RULES_VERSION } = require("../constants/pbasRules");


/**
 * POST /api/pbas
 * Save or update a PBAS appraisal draft. Also runs calculation.
 */
exports.saveAppraisal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { academicYear, role, semester1, semester2, generalInfo, facultyId } = req.body;
    const targetFacultyId = (facultyId && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) ? facultyId : userId;

    if (!academicYear || !role) {
      return res.status(400).json({ message: "academicYear and role are required." });
    }

    // If semester2 is empty, treat as null to avoid halving semesterAveraged scores
    const sem2 = (semester2 && Object.keys(semester2).length > 0) ? semester2 : null;
    
    // Run calculation
    const calcResult = calculatePBAS(role, semester1 || {}, sem2);
    if (!calcResult.success) {
      return res.status(400).json({ message: calcResult.error });
    }

    const updatePayload = {
      role,
      semester1: semester1 || {},
      semester2: semester2 || {},
      calculatedScores: {
        teaching:       calcResult.sections.find(s => s.key === "teaching")?.finalScore || 0,
        professional:   calcResult.sections.find(s => s.key === "professional")?.finalScore || 0,
        research:       calcResult.sections.find(s => s.key === "research")?.finalScore || 0,
        administrative: calcResult.sections.find(s => s.key === "administrative")?.finalScore || 0,
        total:          calcResult.totalScore,
        percentage:     calcResult.percentage,
      },
      calculationDetails: calcResult,
      calculationMetadata: {
        rulesVersion: calcResult.metadata.rulesVersion,
        calculatedAt: new Date(),
        unresolvedRules: calcResult.unresolvedRules,
        warnings: calcResult.warnings,
      },
      status: "DRAFT",
    };

    // Merge generalInfo if provided
    if (generalInfo) {
      updatePayload.generalInfo = generalInfo;
    }

    // Upsert the appraisal
    const appraisal = await PBASAppraisal.findOneAndUpdate(
      { faculty: targetFacultyId, academicYear },
      updatePayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: "PBAS appraisal saved successfully.",
      appraisal,
      calculation: calcResult,
    });
  } catch (err) {
    console.error("[PBAS] Save error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "An appraisal already exists for this academic year." });
    }
    res.status(500).json({ message: "Failed to save PBAS appraisal." });
  }
};

/**
 * GET /api/pbas/my/:academicYear
 * Fetch the authenticated faculty's own PBAS appraisal.
 * Automatically auto-populates from verified submitted activities and designation if no manual draft exists.
 */
exports.getMyAppraisal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { academicYear } = req.params;

    const appraisal = await PBASAppraisal.findOne({ faculty: userId, academicYear })
      .populate("faculty", "name email department designation employeeId");

    if (appraisal) {
      return res.json(appraisal);
    }

    // Auto-calculate on-the-fly from faculty designation & submitted activities
    const faculty = await Faculty.findById(userId).lean();
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found." });
    }

    const role = mapDesignationToRole(faculty.designation);
    const { autoPopulateFromActivities } = require("../services/pbasActivitySync");
    const syncResult = await autoPopulateFromActivities(userId, academicYear, {}, role);
    const calcResult = calculatePBAS(role, syncResult.semester1, null);

    res.json({
      faculty,
      academicYear,
      role,
      semester1: syncResult.semester1,
      semester2: {},
      calculatedScores: {
        teaching:       calcResult.sections.find(s => s.key === "teaching")?.finalScore || 0,
        professional:   calcResult.sections.find(s => s.key === "professional")?.finalScore || 0,
        research:       calcResult.sections.find(s => s.key === "research")?.finalScore || 0,
        administrative: calcResult.sections.find(s => s.key === "administrative")?.finalScore || 0,
        total:          calcResult.totalScore,
        percentage:     calcResult.percentage,
      },
      calculationDetails: calcResult,
      status: "DRAFT",
      isAutoCalculated: true,
    });
  } catch (err) {
    console.error("[PBAS] Get appraisal error:", err);
    res.status(500).json({ message: "Failed to fetch PBAS appraisal." });
  }
};

/**
 * PUT /api/pbas/:id/submit
 * Submit a PBAS appraisal for HOD review.
 */
exports.submitAppraisal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const appraisal = await PBASAppraisal.findOne({ _id: id, faculty: userId });
    if (!appraisal) {
      return res.status(404).json({ message: "Appraisal not found." });
    }

    if (appraisal.status !== "DRAFT" && appraisal.status !== "REVISION_REQUIRED") {
      return res.status(400).json({ message: "Only DRAFT or REVISION_REQUIRED appraisals can be submitted." });
    }

    appraisal.status = "SUBMITTED";
    appraisal.submittedAt = new Date();
    await appraisal.save();

    res.json({ message: "Appraisal submitted for HOD review.", appraisal });
  } catch (err) {
    console.error("[PBAS] Submit error:", err);
    res.status(500).json({ message: "Failed to submit appraisal." });
  }
};

/**
 * PUT /api/pbas/:id/recall
 * Recall a submitted PBAS appraisal back to DRAFT state.
 */
exports.recallAppraisal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const appraisal = await PBASAppraisal.findOne({ _id: id, faculty: userId });
    if (!appraisal) {
      return res.status(404).json({ message: "Appraisal not found." });
    }

    if (appraisal.status === "DRAFT" || appraisal.status === "REVISION_REQUIRED") {
      return res.status(400).json({ message: "Appraisal is already editable." });
    }

    appraisal.status = "DRAFT";
    await appraisal.save();

    res.json({ message: "Appraisal recalled successfully.", appraisal });
  } catch (err) {
    console.error("[PBAS] Recall error:", err);
    res.status(500).json({ message: "Failed to recall appraisal." });
  }
};

/**
 * PUT /api/pbas/:id/revision
 * HOD or Admin requests a revision for a submitted PBAS appraisal.
 */
exports.requestRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const appraisal = await PBASAppraisal.findById(id);
    if (!appraisal) {
      return res.status(404).json({ message: "Appraisal not found." });
    }

    if (req.user.role === "HOD") {
      const faculty = await Faculty.findById(appraisal.faculty);
      if (!faculty || faculty.department !== req.user.department) {
        return res.status(403).json({ message: "Access denied — faculty not in your department." });
      }
    }

    if (appraisal.status !== "SUBMITTED" && appraisal.status !== "HOD_APPROVED") {
      return res.status(400).json({ message: "Only SUBMITTED or HOD_APPROVED appraisals can be sent for revision." });
    }

    appraisal.status = "REVISION_REQUIRED";
    if (comment) {
      appraisal.hodComment = comment;
    }
    
    await appraisal.save();

    res.json({ message: "Appraisal sent back for revision.", appraisal });
  } catch (err) {
    console.error("[PBAS] Revision error:", err);
    res.status(500).json({ message: "Failed to request revision." });
  }
};

/**
 * GET /api/pbas/review/:facultyId/:academicYear
 * HOD or Admin reviews a specific faculty's appraisal.
 * Auto-calculates from activities and designation if not yet saved.
 */
exports.getAppraisalForReview = async (req, res) => {
  try {
    const { facultyId, academicYear } = req.params;
    const userRole = req.user.role;

    // HOD can only view department members
    if (userRole === "HOD") {
      const faculty = await Faculty.findById(facultyId);
      if (!faculty || faculty.department !== req.user.department) {
        return res.status(403).json({ message: "Access denied — faculty not in your department." });
      }
    }

    const appraisal = await PBASAppraisal.findOne({ faculty: facultyId, academicYear })
      .populate("faculty", "name email department designation employeeId");

    if (appraisal) {
      return res.json(appraisal);
    }

    // Auto-calculate on-the-fly
    const faculty = await Faculty.findById(facultyId).lean();
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found." });
    }

    const role = mapDesignationToRole(faculty.designation);
    const { autoPopulateFromActivities } = require("../services/pbasActivitySync");
    const syncResult = await autoPopulateFromActivities(facultyId, academicYear, {}, role);
    const calcResult = calculatePBAS(role, syncResult.semester1, null);

    res.json({
      faculty,
      academicYear,
      role,
      semester1: syncResult.semester1,
      semester2: {},
      calculatedScores: {
        teaching:       calcResult.sections.find(s => s.key === "teaching")?.finalScore || 0,
        professional:   calcResult.sections.find(s => s.key === "professional")?.finalScore || 0,
        research:       calcResult.sections.find(s => s.key === "research")?.finalScore || 0,
        administrative: calcResult.sections.find(s => s.key === "administrative")?.finalScore || 0,
        total:          calcResult.totalScore,
        percentage:     calcResult.percentage,
      },
      calculationDetails: calcResult,
      status: "DRAFT",
      isAutoCalculated: true,
    });
  } catch (err) {
    console.error("[PBAS] Review fetch error:", err);
    res.status(500).json({ message: "Failed to fetch appraisal for review." });
  }
};

/**
 * GET /api/pbas/department/:academicYear
 * HOD views all department appraisals for an academic year.
 * Auto-calculates scores for any faculty without a manual appraisal.
 */
exports.getDepartmentAppraisals = async (req, res) => {
  try {
    const { academicYear } = req.params;
    const dept = req.user.department;

    if (!dept) {
      return res.status(400).json({ message: "Department not found for current user." });
    }

    const facultyList = await Faculty.find({ department: dept }).lean();
    const ids = facultyList.map(f => f._id);

    const savedAppraisals = await PBASAppraisal.find({
      faculty: { $in: ids },
      academicYear,
    })
      .sort({ createdAt: 1 })
      .populate("faculty", "name email department designation employeeId")
      .lean();

    const savedMap = {};
    savedAppraisals.forEach(a => {
      const fid = (a.faculty?._id || a.faculty)?.toString();
      if (fid) savedMap[fid] = a;
    });

    const { autoPopulateFromActivities } = require("../services/pbasActivitySync");

    const result = [];
    for (const f of facultyList) {
      const fid = f._id.toString();
      if (savedMap[fid]) {
        result.push(savedMap[fid]);
      } else {
        const role = mapDesignationToRole(f.designation);
        const syncResult = await autoPopulateFromActivities(f._id, academicYear, {}, role);
        const calcResult = calculatePBAS(role, syncResult.semester1, null);
        result.push({
          _id: `auto_${fid}`,
          faculty: f,
          academicYear,
          role,
          calculatedScores: {
            teaching:       calcResult.sections.find(s => s.key === "teaching")?.finalScore || 0,
            professional:   calcResult.sections.find(s => s.key === "professional")?.finalScore || 0,
            research:       calcResult.sections.find(s => s.key === "research")?.finalScore || 0,
            administrative: calcResult.sections.find(s => s.key === "administrative")?.finalScore || 0,
            total:          calcResult.totalScore,
            percentage:     calcResult.percentage,
          },
          calculationDetails: calcResult,
          status: "AUTO_CALCULATED",
          isAutoCalculated: true,
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error("[PBAS] Department appraisals error:", err);
    res.status(500).json({ message: "Failed to fetch department appraisals." });
  }
};

/**
 * GET /api/pbas/all/:academicYear
 * Admin views all appraisals for an academic year.
 * Auto-calculates scores for any faculty in the college.
 */
exports.getAllAppraisals = async (req, res) => {
  try {
    const { academicYear } = req.params;

    const facultyUsers = await Faculty.find({}).lean();
    const hodUsers = await HOD.find({}).lean();
    const facultyList = [...facultyUsers, ...hodUsers];

    const savedAppraisals = await PBASAppraisal.find({ academicYear })
      .sort({ createdAt: 1 })
      .populate("faculty", "name email department designation employeeId")
      .lean();

    const savedMap = {};
    savedAppraisals.forEach(a => {
      const fid = (a.faculty?._id || a.faculty)?.toString();
      if (fid) savedMap[fid] = a;
    });

    const { autoPopulateFromActivities } = require("../services/pbasActivitySync");

    const result = [];
    for (const f of facultyList) {
      const fid = f._id.toString();
      if (savedMap[fid]) {
        result.push(savedMap[fid]);
      } else {
        const role = mapDesignationToRole(f.designation);
        const syncResult = await autoPopulateFromActivities(f._id, academicYear, {}, role);
        const calcResult = calculatePBAS(role, syncResult.semester1, null);
        result.push({
          _id: `auto_${fid}`,
          faculty: f,
          academicYear,
          role,
          calculatedScores: {
            teaching:       calcResult.sections.find(s => s.key === "teaching")?.finalScore || 0,
            professional:   calcResult.sections.find(s => s.key === "professional")?.finalScore || 0,
            research:       calcResult.sections.find(s => s.key === "research")?.finalScore || 0,
            administrative: calcResult.sections.find(s => s.key === "administrative")?.finalScore || 0,
            total:          calcResult.totalScore,
            percentage:     calcResult.percentage,
          },
          calculationDetails: calcResult,
          status: savedMap[fid] ? "DRAFT" : "AUTO_CALCULATED",
          isAutoCalculated: true,
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error("[PBAS] All appraisals error:", err);
    res.status(500).json({ message: "Failed to fetch all appraisals." });
  }
};

/**
 * GET /api/pbas/rules/:role
 * Return the PBAS rule configuration for a given role (for frontend rendering).
 */
exports.getRules = async (req, res) => {
  try {
    const { role } = req.params;
    const rules = getRulesForRole(role);

    if (!rules) {
      return res.status(400).json({
        message: `Invalid role: ${role}`,
        validRoles: ["ASSISTANT_PROFESSOR", "ASSOCIATE_PROFESSOR", "PROFESSOR"],
      });
    }

    res.json({ rules, version: RULES_VERSION });
  } catch (err) {
    console.error("[PBAS] Get rules error:", err);
    res.status(500).json({ message: "Failed to fetch rules." });
  }
};

/**
 * GET /api/pbas/faculty-score/:facultyId
 * Get a faculty's latest PBAS score.
 * Dynamically computes from the faculty's designation and verified submitted credits
 * if no manual appraisal has been saved yet!
 */
exports.getFacultyScore = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const faculty = await Faculty.findById(facultyId).lean();
    if (!faculty) {
      return res.json({ score: null });
    }

    const role = mapDesignationToRole(faculty.designation);
    const academicYear = req.query.academicYear || "2026-27";

    // Check if a saved appraisal exists
    const appraisal = await PBASAppraisal.findOne({ faculty: facultyId, academicYear })
      .sort({ createdAt: -1 })
      .select("calculatedScores academicYear role status")
      .lean();

    if (appraisal && appraisal.calculatedScores && appraisal.status !== "DRAFT") {
      return res.json({
        score: appraisal.calculatedScores,
        academicYear: appraisal.academicYear,
        role: appraisal.role || role,
        status: appraisal.status,
      });
    }

    // Auto-calculate on-the-fly directly from verified submitted activities & designation
    const { autoPopulateFromActivities } = require("../services/pbasActivitySync");
    const syncResult = await autoPopulateFromActivities(facultyId, academicYear, {}, role);
    const calcResult = calculatePBAS(role, syncResult.semester1, null);

    const liveScores = {
      teaching:       calcResult.sections.find(s => s.key === "teaching")?.finalScore || 0,
      professional:   calcResult.sections.find(s => s.key === "professional")?.finalScore || 0,
      research:       calcResult.sections.find(s => s.key === "research")?.finalScore || 0,
      administrative: calcResult.sections.find(s => s.key === "administrative")?.finalScore || 0,
      total:          calcResult.totalScore,
      percentage:     calcResult.percentage,
    };

    res.json({
      score: liveScores,
      academicYear,
      role,
      status: appraisal?.status || "AUTO_CALCULATED",
      isAutoCalculated: true,
      totalApprovedActivities: syncResult.totalApprovedActivities,
    });
  } catch (err) {
    console.error("[PBAS] Faculty score error:", err);
    res.status(500).json({ message: "Failed to fetch faculty PBAS score." });
  }
};

/**
 * POST /api/pbas/sync-activities
 * Auto-populate PBAS inputs from verified activity uploads in MongoDB.
 */
exports.syncActivities = async (req, res) => {
  try {
    const { facultyId, academicYear, semester1 } = req.body;
    const targetFacultyId = (facultyId && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) ? facultyId : req.user.id;

    const faculty = await Faculty.findById(targetFacultyId).lean();
    const role = mapDesignationToRole(faculty?.designation);

    const { autoPopulateFromActivities } = require("../services/pbasActivitySync");
    const result = await autoPopulateFromActivities(targetFacultyId, academicYear || '2025-26', { semester1 }, role);
    res.json(result);
  } catch (err) {
    console.error("[PBAS] Sync activities error:", err);
    res.status(500).json({ message: "Failed to sync activities." });
  }
};

/**
 * PUT /api/pbas/:id/hod-scores
 * HOD/DFAC enters their own scores for each section.
 */
exports.updateHodScores = async (req, res) => {
  try {
    const { id } = req.params;
    const { teaching, professional, research, administrative, comment } = req.body;

    const appraisal = await PBASAppraisal.findById(id);
    if (!appraisal) {
      return res.status(404).json({ message: "Appraisal not found." });
    }

    // Verify HOD has access (same department)
    if (req.user.role === "HOD") {
      const faculty = await Faculty.findById(appraisal.faculty);
      if (!faculty || faculty.department !== req.user.department) {
        return res.status(403).json({ message: "Access denied — faculty not in your department." });
      }
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only HOD or Admin can enter HoD/DFAC scores." });
    }

    const hodTeaching       = teaching != null ? Number(teaching) : null;
    const hodProfessional   = professional != null ? Number(professional) : null;
    const hodResearch       = research != null ? Number(research) : null;
    const hodAdministrative = administrative != null ? Number(administrative) : null;
    const hodTotal = [hodTeaching, hodProfessional, hodResearch, hodAdministrative]
      .filter(v => v != null)
      .reduce((a, b) => a + b, 0);

    appraisal.hodScores = {
      teaching: hodTeaching,
      professional: hodProfessional,
      research: hodResearch,
      administrative: hodAdministrative,
      total: hodTotal,
    };

    if (comment) {
      appraisal.hodComment = comment;
    }

    appraisal.status = "HOD_APPROVED";
    await appraisal.save();

    res.json({ message: "HoD/DFAC scores saved successfully.", appraisal });
  } catch (err) {
    console.error("[PBAS] HoD score error:", err);
    res.status(500).json({ message: "Failed to save HoD/DFAC scores." });
  }
};

/**
 * PUT /api/pbas/:id/ifac-scores
 * IFAC committee enters final scores for each section.
 */
exports.updateIfacScores = async (req, res) => {
  try {
    const { id } = req.params;
    const { teaching, professional, research, administrative, comment, signatures } = req.body;

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin/IFAC can enter IFAC scores." });
    }

    const appraisal = await PBASAppraisal.findById(id);
    if (!appraisal) {
      return res.status(404).json({ message: "Appraisal not found." });
    }

    const ifacTeaching       = teaching != null ? Number(teaching) : null;
    const ifacProfessional   = professional != null ? Number(professional) : null;
    const ifacResearch       = research != null ? Number(research) : null;
    const ifacAdministrative = administrative != null ? Number(administrative) : null;
    const ifacTotal = [ifacTeaching, ifacProfessional, ifacResearch, ifacAdministrative]
      .filter(v => v != null)
      .reduce((a, b) => a + b, 0);

    appraisal.ifacScores = {
      teaching: ifacTeaching,
      professional: ifacProfessional,
      research: ifacResearch,
      administrative: ifacAdministrative,
      total: ifacTotal,
    };

    if (comment) {
      appraisal.ifacComment = comment;
    }

    if (signatures && Array.isArray(signatures)) {
      appraisal.ifacSignatures = signatures.map(s => ({
        name: s.name || "",
        signedAt: new Date(),
      }));
    }

    appraisal.status = "APPROVED";
    await appraisal.save();

    res.json({ message: "IFAC scores saved successfully.", appraisal });
  } catch (err) {
    console.error("[PBAS] IFAC score error:", err);
    res.status(500).json({ message: "Failed to save IFAC scores." });
  }
};
