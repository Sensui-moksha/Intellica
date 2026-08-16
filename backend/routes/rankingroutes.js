const express = require("express");
const router = express.Router();
const { getRanking } = require("../controllers/rankingcontroller");
const Upload = require("../models/Upload");

router.get("/", getRanking);

// ✅ Temporary debug route
router.get("/debug", async (req, res) => {
  try {
    const all = await Upload.find({});
    const approved = await Upload.find({
      status: { $in: ["HOD_APPROVED", "ADMIN_APPROVED"] }
    });

    res.json({
      totalUploads: all.length,
      approvedUploads: approved.length,
      allStatuses: [...new Set(all.map(u => u.status))],
      sampleUpload: all[0] || null
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;