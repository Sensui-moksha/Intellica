const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const reportController = require("../controllers/reportController");

// Analytics & Interactive Portfolio Routes (Admin & HOD only)
router.get("/analytics", auth, authorizeRoles("ADMIN", "HOD"), reportController.getDepartmentAnalytics);
router.get("/portfolio/:id", auth, authorizeRoles("ADMIN", "HOD"), reportController.getFacultyPortfolio);

// Excel Reports (Admin & HOD only)
router.get("/faculty-excel", auth, authorizeRoles("ADMIN", "HOD"), reportController.downloadFacultyReport);
router.get("/department-excel", auth, authorizeRoles("ADMIN", "HOD"), reportController.downloadDepartmentReport);

module.exports = router;