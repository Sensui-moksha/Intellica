const express = require("express");
const router = express.Router();

const {
  registerFaculty,
  registerHOD,
  checkUserStatus,
  login,
  verifyOTP,
  getMe,
  updateProfile,
  updateProfileImage,
  removeProfileImage,
  getFacultyProfile,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  completeOnboarding,
  changePassword,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const profileUpload = require("../middleware/profileUpload");
const {
  authLimiter,
  otpLimiter,
  registerLimiter,
} = require("../middleware/securityMiddleware");

/* =====================================================
   REGISTRATION — 5 per hour per IP
===================================================== */
router.post(
  "/faculty/register",
  registerLimiter,
  profileUpload.single("profileImage"),
  registerFaculty
);

router.post(
  "/hod/register",
  registerLimiter,
  profileUpload.single("profileImage"),
  registerHOD
);

/* =====================================================
   LOGIN & CREDENTIAL FLOW — 30 per 15 minutes per IP
===================================================== */
router.post("/check-user",    authLimiter, checkUserStatus);
router.post("/login",         authLimiter, login);
router.post("/forgot-password", authLimiter, forgotPassword);

/* =====================================================
   OTP ENDPOINTS — 10 per 10 minutes per IP
===================================================== */
router.post("/verify-otp",       otpLimiter, verifyOTP);
router.post("/verify-reset-otp", otpLimiter, verifyResetOtp);
router.post("/reset-password",   otpLimiter, resetPassword);

/* =====================================================
   AUTHENTICATED ENDPOINTS
===================================================== */
router.post("/complete-onboarding", authMiddleware, completeOnboarding);
router.post("/change-password",     authMiddleware, changePassword);

router.get("/me",           authMiddleware, getMe);
router.get("/faculty/:id",  authMiddleware, getFacultyProfile);

router.put("/update-profile", authMiddleware, updateProfile);
router.put(
  "/update-profile-image",
  authMiddleware,
  profileUpload.single("profileImage"),
  updateProfileImage
);
router.delete("/profile-image", authMiddleware, removeProfileImage);

/* =====================================================
   LOGOUT — destroys session + instructs client to drop JWT
===================================================== */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);
    res.clearCookie("intellica.sid");
    res.json({ message: "Logged out successfully" });
  });
});

module.exports = router;