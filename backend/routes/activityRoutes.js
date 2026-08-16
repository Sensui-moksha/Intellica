const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const activityController = require("../controllers/activityController");

router.get("/", authMiddleware, activityController.getActivities);
router.post("/", authMiddleware, activityController.createActivity);
router.put("/:id", authMiddleware, activityController.updateActivity);
router.delete("/:id", authMiddleware, activityController.deleteActivity);

module.exports = router;
