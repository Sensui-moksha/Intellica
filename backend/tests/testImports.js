// Test all backend imports
try {
  console.log("Testing backend imports...");
  require("../constants/pbasRules");
  require("../services/pbasCalculator");
  require("../models/PBASAppraisal");
  require("../controllers/pbasController");
  require("../routes/pbasRoutes");
  console.log("✅ All PBAS backend modules imported cleanly!");
} catch (e) {
  console.error("❌ Import error:", e);
  process.exit(1);
}
