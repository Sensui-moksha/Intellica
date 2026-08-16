const Upload = require("../models/Upload");
const Faculty = require("../models/Faculty");
const HOD = require("../models/HOD");
const User = require("../models/User");

exports.getRank = async (req, res) => {
  try {
    const id = req.params.id || req.user.id;

    let faculty = await Faculty.findById(id);
    let hod = null;
    let isHOD = false;

    /* ================= IDENTIFY USER ================= */

    if (!faculty) {
      hod = await HOD.findById(id);
      if (hod) isHOD = true;
    }

    if (!faculty && !hod) {
      const user = await User.findById(id);
      if (user) {
        faculty = await Faculty.findOne({ email: user.email });
      }
    }

    if (!faculty && !hod) {
      return res.status(404).json({ message: "User not found" });
    }

    const department = isHOD ? hod.department : faculty.department;

    /* ================= GET APPROVED UPLOADS ================= */

    const uploads = await Upload.find({
      status: "ADMIN_APPROVED"
    });

    /* ================= BUILD CREDIT MAP ================= */

    const map = new Map();

    uploads.forEach(u => {
      let key = null;

      // Faculty uploads
      if (u.faculty) {
        key = u.faculty.toString();
      }

      // HOD uploads → grouped by department (since no createdBy)
      else if (u.createdByRole === "HOD") {
        key = `HOD_${u.department}`;
      }

      if (!key) return;

      map.set(key, (map.get(key) || 0) + (u.credits || 0));
    });

    /* ================= BUILD PARTICIPANT LIST ================= */

    const fullList = [];

    // Faculty participants
    const faculties = await Faculty.find();

    faculties.forEach(f => {
      const key = f._id.toString();

      if (map.has(key)) {
        fullList.push({
          _id: key,
          department: f.department,
          totalCredits: map.get(key)
        });
      }
    });

    // HOD participants (ONE per department)
    const hods = await HOD.find();

    hods.forEach(h => {
      const key = `HOD_${h.department}`;

      if (map.has(key)) {
        fullList.push({
          _id: h._id.toString(),
          department: h.department,
          totalCredits: map.get(key)
        });
      }
    });

    /* ================= SORT GLOBAL ================= */

    fullList.sort((a, b) => b.totalCredits - a.totalCredits);

    const currentId = isHOD
      ? hod._id.toString()
      : faculty._id.toString();

    const collegeRank =
      fullList.findIndex(u => u._id === currentId) + 1;

    /* ================= DEPARTMENT RANK ================= */

    const deptList = fullList.filter(
      u => u.department === department
    );

    const departmentRank =
      deptList.findIndex(u => u._id === currentId) + 1;

    /* ================= SAFE RESPONSE ================= */

    res.json({
      collegeRank: collegeRank > 0 ? collegeRank : null,
      collegeTotal: fullList.length,
      departmentRank: departmentRank > 0 ? departmentRank : null,
      departmentTotal: deptList.length,
      role: isHOD ? "HOD" : "FACULTY"
    });

  } catch (err) {
    console.error("RANK ERROR:", err);
    res.status(500).json({ message: "Rank calculation failed" });
  }
};