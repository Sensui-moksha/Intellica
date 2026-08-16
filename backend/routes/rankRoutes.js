const express = require("express");
const router = express.Router();

const { getRank } = require("../controllers/rankController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ ADD AUTH HERE

router.get("/", authMiddleware, getRank);
router.get("/:id", authMiddleware, getRank);

module.exports = router;