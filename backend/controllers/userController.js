const Faculty = require("../models/Faculty");

exports.getFacultyById = async (req, res) => {
  try {

    const faculty = await Faculty.findById(req.params.id).select("-password");

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found"
      });
    }

    res.json(faculty);

  } catch (error) {

    console.error("GET FACULTY ERROR:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
};