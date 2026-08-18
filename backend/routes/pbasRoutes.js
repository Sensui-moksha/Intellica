/**
 * pbasRoutes.js — Express Routes for PBAS Appraisal
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes use existing authMiddleware + authorizeRoles.
 * Does NOT modify any existing route file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const pbas = require("../controllers/pbasController");

// ── Public-ish (authenticated) ──
// Get PBAS rules for a role (needed by frontend to render forms)
router.get("/rules/:role", authMiddleware, pbas.getRules);

// ── Faculty & Admin evaluation endpoints ──
router.post("/sync-activities",   authMiddleware, authorizeRoles("FACULTY", "HOD", "ADMIN"), pbas.syncActivities);
router.post("/",                  authMiddleware, authorizeRoles("FACULTY", "HOD", "ADMIN"), pbas.saveAppraisal);
router.get("/my/:academicYear",   authMiddleware, authorizeRoles("FACULTY", "HOD", "ADMIN"), pbas.getMyAppraisal);
router.put("/:id/submit",         authMiddleware, authorizeRoles("FACULTY", "HOD"), pbas.submitAppraisal);
router.put("/:id/recall",         authMiddleware, authorizeRoles("FACULTY", "HOD"), pbas.recallAppraisal);
router.put("/:id/revision",       authMiddleware, authorizeRoles("HOD", "ADMIN"), pbas.requestRevision);

// ── Faculty score (for cards — HOD/Admin can view any faculty's score) ──
router.get("/faculty-score/:facultyId", authMiddleware, authorizeRoles("FACULTY", "HOD", "ADMIN"), pbas.getFacultyScore);

// ── HOD review endpoints ──
router.get("/review/:facultyId/:academicYear", authMiddleware, authorizeRoles("HOD", "ADMIN"), pbas.getAppraisalForReview);
router.get("/department/:academicYear",        authMiddleware, authorizeRoles("HOD"),           pbas.getDepartmentAppraisals);
router.put("/:id/hod-scores",                  authMiddleware, authorizeRoles("HOD", "ADMIN"),  pbas.updateHodScores);

// ── Admin / IFAC endpoints ──
router.get("/all/:academicYear",  authMiddleware, authorizeRoles("ADMIN"), pbas.getAllAppraisals);
router.put("/:id/ifac-scores",    authMiddleware, authorizeRoles("ADMIN"), pbas.updateIfacScores);

module.exports = router;
