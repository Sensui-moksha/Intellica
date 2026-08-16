const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

// Analytics & Interactive Portfolio Routes
router.get("/analytics", auth, reportController.getDepartmentAnalytics);
router.get("/portfolio/:id", auth, reportController.getFacultyPortfolio);

// Excel Reports
router.get("/faculty-excel", auth, reportController.downloadFacultyReport);
router.get("/department-excel", auth, reportController.downloadDepartmentReport);

module.exports = router;