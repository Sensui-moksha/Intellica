const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const uploadController = require("../controllers/uploadController");

const {
  getPendingFaculty,
  approveFaculty,
  getAllHods,
  getPendingHods,
  approveHod,
  hodDiscussion,
  getPendingUploadsForAdmin,
  approveUploadByAdmin,
  adminDiscussion
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");

/* ===============================
   FACULTY MANAGEMENT (CRUD & BULK DELETE)
=============================== */

router.get("/faculty", authMiddleware, adminController.getAllFaculty);
router.post("/faculty", authMiddleware, adminController.createFaculty);
router.post("/create-admin", authMiddleware, adminController.createAdmin);
router.put("/faculty/:id", authMiddleware, adminController.updateFaculty);
router.delete("/faculty/:id", authMiddleware, adminController.deleteFaculty);
router.post("/faculty/bulk-delete", authMiddleware, adminController.bulkDeleteFaculty);
router.delete("/faculty/bulk", authMiddleware, adminController.bulkDeleteFaculty);

router.get("/pending-faculty", authMiddleware, getPendingFaculty);
router.put("/approve/faculty/:id", authMiddleware, approveFaculty);

/* ===============================
   HOD MANAGEMENT ROUTES
=============================== */

router.get("/hods", authMiddleware, getAllHods);
router.get("/pending-hods", authMiddleware, getPendingHods); // ⭐ IMPORTANT
router.put("/approve-hod/:id", authMiddleware, approveHod);
router.post(
"/hod-discussion/:id",
authMiddleware,
hodDiscussion
);
/* ===============================
   DEPARTMENT MANAGEMENT (CRUD & BULK DELETE)
=============================== */
router.get("/departments", authMiddleware, adminController.getDepartmentStatus);
router.post("/departments", authMiddleware, adminController.createDepartment);
router.put("/departments/:id", authMiddleware, adminController.updateDepartment);
router.delete("/departments/:id", authMiddleware, adminController.deleteDepartment);
router.post("/departments/bulk-delete", authMiddleware, adminController.bulkDeleteDepartments);
router.delete("/departments/bulk", authMiddleware, adminController.bulkDeleteDepartments);
router.delete(
"/remove-hod/:id",
authMiddleware,
adminController.removeApprovedHod
);
router.get(
"/top-departments",
authMiddleware,
adminController.getTopDepartments
);

router.get(
"/activity-stats",
authMiddleware,
adminController.getActivityStats
);
router.get("/pending-uploads", authMiddleware, getPendingUploadsForAdmin);
router.post("/approve-upload/:id", authMiddleware, approveUploadByAdmin);
router.put("/approve-upload/:id", authMiddleware, approveUploadByAdmin);
router.post("/reject-upload/:id", authMiddleware, uploadController.rejectUploadByAdmin);
router.put("/reject-upload/:id", authMiddleware, uploadController.rejectUploadByAdmin);
router.post("/discussion/:id", authMiddleware, adminDiscussion);
router.put("/discussion/:id", authMiddleware, adminDiscussion);
router.get("/all-users", authMiddleware, adminController.getAllUsers);
router.delete(
"/delete-user/:id",
authMiddleware,
adminController.deleteUser
);
router.put(
"/change-department/:id",
authMiddleware,
adminController.changeDepartment
);
router.get(
"/department-analytics/:department",
authMiddleware,
adminController.getDepartmentAnalytics
);
router.post(
  "/archive-year",
  authMiddleware,
  adminController.archiveAcademicYear
);
module.exports = router;
