const router = require("express").Router();

const { getProfile, getFacultyById } = require("../controllers/facultyController");

const authMiddleware = require("../middleware/authMiddleware");
const Faculty = require("../models/Faculty");

/* ================= GET ROUTES ================= */

/* Faculty viewing own profile */
router.get("/profile", authMiddleware, getProfile);

/* ================= UPDATE PROFILE (MOVE THIS UP) ================= */

router.put("/update-profile", authMiddleware, async (req, res) => {
  try {

    console.log("UPDATE PROFILE API HIT"); // 🔥 debug

    const faculty = await Faculty.findById(req.user.id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    faculty.name = req.body.name || faculty.name;
    faculty.email = req.body.email || faculty.email;
    faculty.designation = req.body.designation || faculty.designation;
    faculty.googleScholar = req.body.googleScholar || faculty.googleScholar;
    faculty.scopusId = req.body.scopusId || faculty.scopusId;
    faculty.vidwanId = req.body.vidwanId || faculty.vidwanId;

    await faculty.save();

    res.json({
      message: "Profile updated successfully",
      faculty
    });

  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

/* ================= DYNAMIC ROUTE (KEEP LAST) ================= */

router.get("/:id", authMiddleware, getFacultyById);

module.exports = router;