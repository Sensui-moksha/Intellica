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
const { calculatePBAS } = require("../services/pbasCalculator");
const { getRulesForRole, mapDesignationToRole, RULES_VERSION } = require("../constants/pbasRules");

/**
 * POST /api/pbas/calculate
 * Stateless calculation — does not persist. Returns full scored result.
 */
exports.calculate = async (req, res) => {
  try {
    const { role, semester1, semester2 } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required (ASSISTANT_PROFESSOR, ASSOCIATE_PROFESSOR, PROFESSOR)." });
    }

    const result = calculatePBAS(role, semester1 || {}, semester2 || null);

    if (!result.success) {
      return res.status(400).json({ message: result.error, validRoles: result.validRoles });
    }

    res.json(result);
  } catch (err) {
    console.error("[PBAS] Calculate error:", err);
    res.status(500).json({ message: "PBAS calculation failed." });
  }
};

/**
 * POST /api/pbas
 * Save or update a PBAS appraisal draft. Also runs calculation.
 */
exports.saveAppraisal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { academicYear, role, semester1, semester2, facultyId } = req.body;
    const targetFacultyId = (facultyId && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) ? facultyId : userId;

    if (!academicYear || !role) {
      return res.status(400).json({ message: "academicYear and role are required." });
    }

    // Run calculation
    const calcResult = calculatePBAS(role, semester1 || {}, semester2 || null);
    if (!calcResult.success) {
      return res.status(400).json({ message: calcResult.error });
    }

    // Upsert the appraisal
    const appraisal = await PBASAppraisal.findOneAndUpdate(
      { faculty: targetFacultyId, academicYear },
      {
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
      },
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
    }).populate("faculty", "name email department designation employeeId").lean();

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

    const facultyList = await Faculty.find({}).lean();
    const savedAppraisals = await PBASAppraisal.find({ academicYear })
      .populate("faculty", "name email department designation employeeId").lean();

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
          status: "AUTO_CALCULATED",
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
    const academicYear = "2025-26";

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
