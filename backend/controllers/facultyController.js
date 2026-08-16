const Faculty = require("../models/Faculty");
const Upload = require("../models/Upload");

exports.getProfile = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.user.id).select("-password").lean();

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const approvedUploads = await Upload.find({
      faculty: req.user.id,
      status: { $in: ["ADMIN_APPROVED", "HOD_APPROVED", "APPROVED"] }
    });

    const totalCredits = approvedUploads.reduce((sum, u) => sum + (Number(u.credits) || 0), 0);
    faculty.totalCredits = totalCredits;

    res.status(200).json(faculty);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getFacultyById = async (req, res) => {
  try {

    const faculty = await Faculty
      .findById(req.params.id)
      .select("-password");

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found"
      });
    }

    res.status(200).json(faculty);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }
};