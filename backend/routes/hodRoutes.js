const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const hodController = require("../controllers/hodController");
const uploadController = require("../controllers/uploadController");

/* =====================================================
   HOD PROFILE
===================================================== */

router.get(
  "/profile",
  authMiddleware,
  hodController.getHodProfile
);

/* =====================================================
   FACULTY MANAGEMENT
===================================================== */

// CREATE FACULTY (FOR HOD DEPARTMENT - PENDING ADMIN APPROVAL)
router.post(
  "/faculty",
  authMiddleware,
  hodController.createFaculty
);
router.post(
  "/create-faculty",
  authMiddleware,
  hodController.createFaculty
);

// GET PENDING FACULTY
router.get(
  "/pending-faculty",
  authMiddleware,
  hodController.getPendingFaculty
);

// GET APPROVED FACULTY (FOR VIEW DASHBOARD)
router.get(
  "/faculty-list",
  authMiddleware,
  hodController.getApprovedFaculty
);

// APPROVE FACULTY
router.put(
  "/approve-faculty/:id",
  authMiddleware,
  hodController.approveFaculty
);

// CALL FACULTY FOR DISCUSSION
router.put(
  "/discussion-faculty/:id",
  authMiddleware,
  hodController.discussionFaculty
);


/* =====================================================
   RESEARCH UPLOAD MANAGEMENT
===================================================== */

// GET PENDING UPLOADS FOR HOD
router.get(
  "/pending-uploads",
  authMiddleware,
  uploadController.getPendingUploadsForHOD
);

// APPROVE UPLOAD
router.put(
  "/approve-upload/:id",
  authMiddleware,
  uploadController.approveUploadByHOD
);

// REJECT UPLOAD
router.put(
  "/reject-upload/:id",
  authMiddleware,
  uploadController.rejectUploadByHOD
);

// CALL FOR DISCUSSION (UPLOAD)
router.put(
  "/discussion/:id",
  authMiddleware,
  uploadController.callForDiscussion
);

/* =====================================================
   GET FACULTY DASHBOARD DATA
===================================================== */

router.get(
  "/faculty-uploads/:facultyId",
  authMiddleware,
  hodController.getFacultyUploads
);
router.get(
  "/department-uploads",
  authMiddleware,
  uploadController.getDepartmentUploads
);
/* =====================================================
   UPDATE HOD PROFILE (NEW)
===================================================== */

const HOD = require("../models/HOD");

router.put(
  "/update-profile",
  authMiddleware,
  async (req, res) => {
    try {

      const hod = await HOD.findById(req.user.id);

      if (!hod) {
        return res.status(404).json({ message: "HOD not found" });
      }

      hod.name = req.body.name || hod.name;
      hod.email = req.body.email || hod.email;
      hod.designation = req.body.designation || hod.designation;
      hod.googleScholar = req.body.googleScholar?.trim() || "";
      hod.scopusId = req.body.scopusId?.trim() || "";
      hod.vidwanId = req.body.vidwanId?.trim() || "";

      await hod.save();

      res.json({
        message: "HOD profile updated successfully",
        hod
      });

    } catch (err) {
      console.error("HOD UPDATE ERROR:", err);
      res.status(500).json({ message: "Update failed" });
    }
  }
);
module.exports = router;