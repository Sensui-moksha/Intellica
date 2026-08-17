const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const ay = require("../controllers/academicYearController");

// Public / Authenticated for all users (Faculty, HOD, Admin) to fetch list of years
router.get("/",        authMiddleware, ay.getAllAcademicYears);
router.get("/current", authMiddleware, ay.getCurrentAcademicYear);

// Admin-only management routes
router.post("/",                authMiddleware, authorizeRoles("ADMIN"), ay.createAcademicYear);
router.put("/:id/set-current",  authMiddleware, authorizeRoles("ADMIN"), ay.setCurrentAcademicYear);
router.put("/:id",              authMiddleware, authorizeRoles("ADMIN"), ay.updateAcademicYear);
router.delete("/:id",           authMiddleware, authorizeRoles("ADMIN"), ay.deleteAcademicYear);

module.exports = router;
