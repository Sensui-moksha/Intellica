const Notification = require("../models/Notification");
const Faculty = require("../models/Faculty");
const HOD = require("../models/HOD");
const Upload = require("../models/Upload");
const createUserFolder = require("../utils/createUserFolder");
const { sendOnboardingEmail } = require("../utils/emailService");

/* =====================================================
   HOD CREATE FACULTY (FOR HOD'S DEPARTMENT ONLY)
   Status will be set to PENDING / isApproved: false
   Admin must approve in the Faculty Approvals tab.
===================================================== */
exports.createFaculty = async (req, res) => {
  try {
    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied. Only HOD can perform this action." });
    }

    const {
      name,
      email,
      employeeId,
      designation,
      googleScholar,
      vidwanId,
      scopusId
    } = req.body;

    if (!name || !email || !employeeId) {
      return res.status(400).json({ message: "Name, Email, and Employee ID are required." });
    }

    // Always enforce the HOD's department
    const hodDept = (req.user.department || "").trim().toUpperCase();
    if (!hodDept) {
      return res.status(400).json({ message: "HOD department is not configured." });
    }

    // Check if faculty or HOD already exists with this employeeId or email
    const existing = await Faculty.findOne({
      $or: [{ employeeId: employeeId.trim() }, { email: email.trim().toLowerCase() }]
    }) || await HOD.findOne({
      $or: [{ employeeId: employeeId.trim() }, { email: email.trim().toLowerCase() }]
    });

    if (existing) {
      return res.status(400).json({ message: "A member with this Employee ID or Email already exists." });
    }

    const newFaculty = new Faculty({
      employeeId: employeeId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: null, // Set during first-time OTP onboarding
      department: hodDept,
      designation: designation ? designation.trim() : "Assistant Professor",
      googleScholar: googleScholar ? googleScholar.trim() : "",
      vidwanId: vidwanId ? vidwanId.trim() : "",
      scopusId: scopusId ? scopusId.trim() : "",
      role: "FACULTY",
      isApproved: false, // Requires Admin approval
      status: "PENDING",  // Pending Admin approval
      isFirstLogin: true,
      totalCredits: 0
    });

    await newFaculty.save();

    await Notification.create({
      message: `HOD (${req.user.name}) added faculty member ${newFaculty.name} (${hodDept}). Awaiting Admin Approval.`,
      role: "ADMIN"
    });

    // Send onboarding email (non-blocking)
    Promise.resolve().then(async () => {
      try { await sendOnboardingEmail(newFaculty, `HOD (${req.user.name})`); } catch (e) { console.error('[EMAIL] Faculty onboarding by HOD failed:', e.message); }
    });

    return res.status(201).json({
      message: `Faculty member ${newFaculty.name} created for ${hodDept}. Awaiting Admin Approval.`,
      faculty: newFaculty
    });
  } catch (err) {
    console.error("HOD CREATE FACULTY ERROR:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'Employee ID / Email';
      return res.status(400).json({ message: `A member with this ${field} already exists.` });
    }
    return res.status(500).json({ message: err.message || "Failed to create faculty member." });
  }
};


/* =====================================================
   GET PENDING FACULTY (DEPARTMENT SAFE)
===================================================== */
exports.getPendingFaculty = async (req, res) => {

  try {

    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }

    const faculty = await Faculty.find({
      status: { $in: ["PENDING", "DISCUSSION"] },
      department: req.user.department
    });

    res.status(200).json(faculty);

  } catch (error) {

    console.error("GET PENDING FACULTY ERROR:", error);

    res.status(500).json({
      message: "Server Error"
    });

  }

};


/* =====================================================
   APPROVE FACULTY
===================================================== */
exports.approveFaculty = async (req, res) => {

  try {

    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const faculty = await Faculty.findById(id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    /* CHECK SAME DEPARTMENT */

    if (faculty.department !== req.user.department) {
      return res.status(403).json({
        message: "You cannot approve faculty from another department"
      });
    }

    /* UPDATE STATUS */

    faculty.status = "APPROVED";
    faculty.isApproved = true;

    await faculty.save();

    /* CREATE FACULTY FOLDER */

    if (faculty.employeeId) {
      createUserFolder("faculty", faculty.employeeId);
    }

    /* CREATE NOTIFICATION */

    await Notification.create({
      message: `${req.user.name} approved faculty ${faculty.name}`,
      role: "HOD"
    });

    res.status(200).json({
      message: "Faculty approved successfully",
      faculty
    });

  } catch (error) {

    console.error("APPROVE FACULTY ERROR:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};



/* =====================================================
   CALL FOR DISCUSSION
===================================================== */
exports.discussionFaculty = async (req, res) => {

  try {

    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const faculty = await Faculty.findById(id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    /* CHECK SAME DEPARTMENT */

    if (faculty.department !== req.user.department) {
      return res.status(403).json({
        message: "You cannot manage faculty from another department"
      });
    }

    /* UPDATE STATUS */

    faculty.status = "DISCUSSION";
    await faculty.save();

    /* CREATE NOTIFICATION */

    await Notification.create({
      message: `${req.user.name} called ${faculty.name} for discussion`,
      role: "HOD"
    });

    res.status(200).json({
      message: "Faculty called for discussion"
    });

  } catch (error) {

    console.error("DISCUSSION FACULTY ERROR:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};
/* =====================================================
   GET APPROVED FACULTY FOR HOD DEPARTMENT
===================================================== */
exports.getApprovedFaculty = async (req, res) => {
  try {

    console.log("HOD USER:", req.user);

    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }

    const faculty = await Faculty.find({
      status: "APPROVED"
    });

    const hodDept = (req.user.department || "").toLowerCase().trim();

    const filtered = faculty.filter(f => {
      const facultyDept = (f.department || "").toLowerCase().trim();

      return facultyDept.includes(hodDept) || hodDept.includes(facultyDept);
    });

    console.log("HOD DEPT:", req.user.department);
    console.log("FACULTY COUNT:", filtered.length);

    res.json(filtered);

  } catch (error) {
    console.error("GET APPROVED FACULTY ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   GET FACULTY UPLOADS FOR HOD DASHBOARD
===================================================== */
exports.getFacultyUploads = async (req, res) => {

  try {

    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { facultyId } = req.params;

    const faculty = await Faculty.findById(facultyId);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    if (faculty.department !== req.user.department) {
      return res.status(403).json({
        message: "You cannot view another department faculty"
      });
    }

   const uploads = await Upload.find({
  faculty: facultyId
});

    res.json(uploads);

  } catch (error) {

    console.error("GET FACULTY UPLOADS ERROR:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};
/* =====================================================
   GET HOD PROFILE
===================================================== */

exports.getHodProfile = async (req, res) => {
  try {
    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }

    const hod = await HOD.findById(req.user.id).select("-password").lean();

    if (!hod) {
      return res.status(404).json({
        message: "HOD not found"
      });
    }

    const approvedUploads = await Upload.find({
      faculty: req.user.id,
      status: { $in: ["ADMIN_APPROVED", "HOD_APPROVED", "APPROVED"] }
    });

    const totalCredits = approvedUploads.reduce((sum, u) => sum + (Number(u.credits) || 0), 0);
    hod.totalCredits = totalCredits;

    res.json(hod);
  } catch (error) {
    console.error("GET HOD PROFILE ERROR:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};