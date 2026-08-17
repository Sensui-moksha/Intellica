
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const bcrypt = require("bcryptjs");

const Faculty = require("../models/Faculty");
const HOD = require("../models/HOD");
const User = require("../models/User");
const { sendOTP, sendRegistrationNotification } = require("../utils/emailService");
const { getUserRelativePath } = require("../utils/storagePath");

/* =====================================================
   FACULTY REGISTRATION
===================================================== */
exports.registerFaculty = async (req, res) => {
  try {

    if (req.fileValidationError) {
      return res.status(400).json({
        message: req.fileValidationError
      });
    }

    const {
      employeeId,
      name,
      email,
      department,
      designation,
      googleScholar,
      vidwanId,
      scopusId
    } = req.body;

    if (!employeeId || !name || !email || !department || !designation) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Profile image is required"
      });
    }

    // Research IDs are optional (Scholar, Vidwan, Scopus)

    const normalizedDept = department.trim().toUpperCase();

    const existing = await Faculty.findOne({
      $or: [
        { employeeId: employeeId.trim() },
        { email: email.trim().toLowerCase() }
      ]
    });

    if (existing) {
      return res.status(400).json({
        message: "Employee ID or Email already exists"
      });
    }

    const hodExists = await HOD.findOne({
      department: normalizedDept,
      isApproved: true
    });

    if (!hodExists) {
      return res.status(400).json({
        message: "No approved HOD found for this department"
      });
    }

    let hashedPassword = null;
    if (req.body.password && req.body.password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(req.body.password, 10);
    }

    const newFaculty = new Faculty({
      employeeId: employeeId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      department: normalizedDept,
      designation: designation.trim(),
      googleScholar: googleScholar || "",
      vidwanId: vidwanId || "",
      scopusId: scopusId || "",
      role: "FACULTY",
      isApproved: false,
      status: "PENDING",
      profileImage: req.file.filename
    });

    await newFaculty.save();

    // send registration email to faculty and notify admins
    try {
      await sendRegistrationNotification({
        name: newFaculty.name,
        email: newFaculty.email,
        role: 'FACULTY',
        department: newFaculty.department
      });
    } catch (err) {
      console.error('Failed to send registration notification:', err);
    }

    res.status(201).json({
      message: `Faculty registered under ${normalizedDept}. Waiting for HOD approval.`
    });

  } catch (err) {
    console.error("FACULTY REGISTER ERROR:", err);
    res.status(500).json({ message: "Faculty registration failed" });
  }
};


/* =====================================================
   HOD REGISTRATION
===================================================== */
exports.registerHOD = async (req, res) => {
  try {

    if (req.fileValidationError) {
      return res.status(400).json({
        message: req.fileValidationError
      });
    }

    const {
      employeeId,
      name,
      email,
      department,
      designation,
      googleScholar,
      vidwanId,
      scopusId
    } = req.body;

    if (!employeeId || !name || !email || !department || !designation) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Profile image is required"
      });
    }

    const normalizedDept = department.trim().toUpperCase();

    const existing = await HOD.findOne({
      $or: [
        { employeeId: employeeId.trim() },
        { email: email.trim().toLowerCase() }
      ]
    });

    if (existing) {
      return res.status(400).json({
        message: "Employee ID or Email already exists"
      });
    }

    const departmentHOD = await HOD.findOne({
      department: normalizedDept
    });

    if (departmentHOD) {
      return res.status(400).json({
        message: `HOD already registered for ${normalizedDept}`
      });
    }

    let hodHashedPassword = null;
    if (req.body.password && req.body.password.trim().length > 0) {
      hodHashedPassword = await bcrypt.hash(req.body.password, 10);
    }

    const newHOD = new HOD({
      employeeId: employeeId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hodHashedPassword,
      department: normalizedDept,
      designation: designation.trim(),
      googleScholar: googleScholar || "",
      vidwanId: vidwanId || "",
      scopusId: scopusId || "",
      role: "HOD",
      isApproved: false,
      status: "PENDING",
      profileImage: req.file.filename
    });

    await newHOD.save();

    // send registration email to HOD and notify admins
    try {
      await sendRegistrationNotification({
        name: newHOD.name,
        email: newHOD.email,
        role: 'HOD',
        department: newHOD.department
      });
    } catch (err) {
      console.error('Failed to send HOD registration notification:', err);
    }

    res.status(201).json({
      message: `HOD registered for ${normalizedDept}. Waiting for Admin approval.`
    });

  } catch (err) {
    console.error("HOD REGISTER ERROR:", err);
    res.status(500).json({ message: "HOD registration failed" });
  }
};

/* =====================================================
   CHECK USER STATUS (Email / ID Validation before password)
===================================================== */
exports.checkUserStatus = async (req, res) => {
  try {
    const identifier = req.body.identifier?.toString().trim();
    if (!identifier) {
      return res.status(400).json({ message: "Identifier (Email or ID) is required" });
    }

    let user;
    let foundRole;

    // Search in Faculty model
    user = await Faculty.findOne({
      $or: [
        { employeeId: identifier },
        { email: identifier.toLowerCase() }
      ]
    });
    if (user) {
      foundRole = "FACULTY";
    } else {
      // Search in HOD model
      user = await HOD.findOne({
        $or: [
          { employeeId: identifier },
          { email: identifier.toLowerCase() }
        ]
      });
      if (user) {
        foundRole = "HOD";
      } else {
        // Search in User model (Admin)
        user = await User.findOne({
          $or: [
            { regId: identifier },
            { email: identifier.toLowerCase() }
          ]
        });
        if (user) {
          foundRole = "ADMIN";
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        exists: false,
        message: "No account found with this Email or Employee/Admin ID"
      });
    }

    // Check account status
    if (foundRole === "FACULTY") {
      if (user.status === "DISCUSSION") {
        return res.status(403).json({
          exists: true,
          status: "DISCUSSION",
          message: "HOD requested discussion before approving your account"
        });
      }
      if (user.status !== "APPROVED") {
        return res.status(403).json({
          exists: true,
          status: "PENDING",
          message: "Your account is waiting for HOD approval"
        });
      }
    }

    if (foundRole === "HOD") {
      if (user.status === "DISCUSSION") {
        return res.status(403).json({
          exists: true,
          status: "DISCUSSION",
          message: "Admin requested discussion before approving your account"
        });
      }
      if (user.status !== "APPROVED") {
        return res.status(403).json({
          exists: true,
          status: "PENDING",
          message: "Your account is waiting for Admin approval"
        });
      }
    }

    const hasPassword = Boolean(user.password && user.password.length > 0 && !user.isFirstLogin);
    const isFirstLogin = Boolean(user.isFirstLogin || !user.password || user.password.length === 0);

    return res.status(200).json({
      exists: true,
      name: user.name || user.regId || "User",
      email: user.email || identifier,
      role: user.role || foundRole,
      department: user.department || null,
      designation: user.designation || null,
      hasPassword,
      isFirstLogin,
      twoFactorEnabled: Boolean(user.twoFactorEnabled)
    });
  } catch (err) {
    console.error("CHECK USER STATUS ERROR:", err);
    res.status(500).json({ message: "Failed to validate user" });
  }
};

/* =====================================================
   LOGIN - DIRECT PASSWORD LOGIN OR 2FA / OTP LOGIN
===================================================== */
exports.login = async (req, res) => {
  try {

    const identifier   = req.body.identifier?.toString().trim();
    const password     = req.body.password?.toString();
    const loginMethod  = req.body.loginMethod; // 'PASSWORD' | 'OTP'

    if (!identifier) {
      return res.status(400).json({ message: "Identifier (Email or ID) is required" });
    }

    let user;
    let foundRole;

    // Search in Faculty model
    user = await Faculty.findOne({
      $or: [
        { employeeId: identifier },
        { email: identifier.toLowerCase() }
      ]
    });
    if (user) {
      foundRole = "FACULTY";
    } else {
      // Search in HOD model
      user = await HOD.findOne({
        $or: [
          { employeeId: identifier },
          { email: identifier.toLowerCase() }
        ]
      });
      if (user) {
        foundRole = "HOD";
      } else {
        // Search in User model (Admin)
        user = await User.findOne({
          $or: [
            { regId: identifier },
            { email: identifier.toLowerCase() }
          ]
        });
        if (user) {
          foundRole = "ADMIN";
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

/* =====================================================
   HANDLE ACCOUNT STATUS
===================================================== */

if (foundRole === "FACULTY") {

  if (user.status === "DISCUSSION") {
    return res.status(403).json({
      message: "HOD requested discussion before approving your account"
    });
  }

  if (user.status !== "APPROVED") {
    return res.status(403).json({
      message: "Your account is waiting for HOD approval"
    });
  }

}

if (foundRole === "HOD") {

  if (user.status === "DISCUSSION") {
    return res.status(403).json({
      message: "Admin requested discussion before approving your account"
    });
  }

  if (user.status !== "APPROVED") {
    return res.status(403).json({
      message: "Your account is waiting for Admin approval"
    });
  }

}

    // CASE 1: Password Login
    if (loginMethod !== 'OTP' && password !== undefined && password !== '') {
      // First-time users without an established password MUST do OTP login first
      if (!user.password || user.isFirstLogin) {
        return res.status(400).json({
          message: "First-time activation required: Please click 'Sign in with OTP' below to verify your email and set your password.",
          requiresFirstTimeOtp: true
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Incorrect password. Please try again." });
      }

      // If 2-Step Verification is NOT enabled, login immediately without OTP!
      if (!user.twoFactorEnabled) {
        const token = jwt.sign(
          { id: user._id, role: user.role, department: user.department || null },
          process.env.JWT_SECRET,
          { expiresIn: "8h" }
        );

        // ── Set session for browser clients (httpOnly cookie) ──
        req.session.user = {
          id:         user._id.toString(),
          role:       user.role,
          department: user.department || null,
          name:       user.name || user.regId,
        };

        return res.status(200).json({
          token,                              // JWT for API/mobile
          id: user._id.toString(),
          _id: user._id.toString(),
          userId: user._id.toString(),
          role: user.role,
          name: user.name || user.regId,
          department: user.department || null,
          designation: user.designation || null,
          googleScholar: user.googleScholar || "",
          vidwanId: user.vidwanId || "",
          scopusId: user.scopusId || "",
          profileImage: user.profileImage || "",
          twoFactorEnabled: false,
          requiresOtp: false,
          isFirstLogin: Boolean(user.isFirstLogin),
          message: "Login successful"
        });
      }

      // If 2-Step Verification IS enabled, fall through to send 2FA OTP
    }

    // CASE 2: OTP Login OR 2-Step Verification is ON
    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // NOTE: Do NOT log the OTP in production — security audit fix
    if (process.env.NODE_ENV !== "production") {
      console.log(`🔑 [DEV ONLY - AUTH OTP] Sent to ${user.email ? user.email.replace(/(?<=.{3}).(?=.*@)/g, '*') : 'user'}`);
    }

    // Send OTP to email
    try {
      if (user.email) {
        await sendOTP(user.email, otp);
      }
    } catch (emailError) {
      console.error('Email send error:', emailError);
    }

    const notice = user.twoFactorEnabled
      ? "Password verified. 2-Step Verification is active: OTP sent to your email."
      : "OTP code sent to your registered email.";

    res.status(200).json({
      message: notice,
      requiresOtp: true,
      email: user.email || identifier
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   VERIFY OTP
===================================================== */
exports.verifyOTP = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ message: "Identifier and OTP are required" });
    }

    let user;
    let foundRole;

    // Search in Faculty model
    user = await Faculty.findOne({
      $or: [
        { employeeId: identifier },
        { email: identifier.toLowerCase() }
      ]
    });
    if (user) {
      foundRole = "FACULTY";
    } else {
      // Search in HOD model
      user = await HOD.findOne({
        $or: [
          { employeeId: identifier },
          { email: identifier.toLowerCase() }
        ]
      });
      if (user) {
        foundRole = "HOD";
      } else {
        // Search in User model (Admin)
        user = await User.findOne({
          $or: [
            { regId: identifier },
            { email: identifier.toLowerCase() }
          ]
        });
        if (user) {
          foundRole = "ADMIN";
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    if (user.otpExpires < new Date()) {
      return res.status(401).json({ message: "OTP expired" });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, department: user.department || null },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // ── Set session for browser clients (httpOnly cookie) ──
    req.session.user = {
      id:         user._id.toString(),
      role:       user.role,
      department: user.department || null,
      name:       user.name || user.regId,
    };

    res.status(200).json({
      token,                            // JWT for API/mobile
      id: user._id.toString(),
      _id: user._id.toString(),
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      department: user.department || null,
      designation: user.designation || null,
      googleScholar: user.googleScholar || "",
      vidwanId: user.vidwanId || "",
      scopusId: user.scopusId || "",
      profileImage: user.profileImage || "",
      isFirstLogin: Boolean(user.isFirstLogin),
      message: "Login successful"
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* =====================================================
   GET CURRENT USER
===================================================== */
exports.getMe = async (req, res) => {
  try {

    let user;

    if (req.user.role === "FACULTY") {
      user = await Faculty.findById(req.user.id).select("-password");
    } else if (req.user.role === "HOD") {
      user = await HOD.findById(req.user.id).select("-password");
    } else if (req.user.role === "ADMIN") {
      user = await User.findById(req.user.id).select("-password");
    } else {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};


/* =====================================================
   UPDATE PROFILE (FULL EDIT: NAME, RESEARCH IDS, 2FA)
===================================================== */
exports.updateProfile = async (req, res) => {
  try {

    const {
      name,
      designation,
      department,
      googleScholar,
      vidwanId,
      scopusId,
      twoFactorEnabled
    } = req.body;

    let user;

    if (req.user.role === "FACULTY") {
      user = await Faculty.findById(req.user.id);
    } else if (req.user.role === "HOD") {
      user = await HOD.findById(req.user.id);
    } else if (req.user.role === "ADMIN") {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name && name.trim() !== "") {
      user.name = name.trim();
    }
    if (designation !== undefined) {
      user.designation = designation.trim();
    }
    if (department !== undefined && department.trim() !== "") {
      user.department = department.trim().toUpperCase();
    }
    if (googleScholar !== undefined) {
      user.googleScholar = googleScholar.trim();
    }
    if (vidwanId !== undefined) {
      user.vidwanId = vidwanId.trim();
    }
    if (scopusId !== undefined) {
      user.scopusId = scopusId.trim();
    }
    if (twoFactorEnabled !== undefined) {
      user.twoFactorEnabled = Boolean(twoFactorEnabled);
    }

    await user.save();

    res.json({
      message: "Profile details updated successfully",
      user: {
        _id: user._id,
        name: user.name || user.regId,
        email: user.email,
        department: user.department || null,
        designation: user.designation || null,
        googleScholar: user.googleScholar || "",
        vidwanId: user.vidwanId || "",
        scopusId: user.scopusId || "",
        twoFactorEnabled: user.twoFactorEnabled || false,
        profileImage: user.profileImage || "",
        isFirstLogin: user.isFirstLogin || false
      }
    });

  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Profile update failed" });
  }
};

/* =====================================================
   COMPLETE ONBOARDING (FIRST TIME LOGIN SETUP)
===================================================== */
exports.completeOnboarding = async (req, res) => {
  try {
    const {
      newPassword,
      googleScholar,
      vidwanId,
      scopusId,
      designation
    } = req.body;

    let user;
    if (req.user.role === "FACULTY") {
      user = await Faculty.findById(req.user.id);
    } else if (req.user.role === "HOD") {
      user = await HOD.findById(req.user.id);
    } else if (req.user.role === "ADMIN") {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (newPassword && newPassword.trim().length >= 6) {
      user.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    if (googleScholar !== undefined) user.googleScholar = googleScholar.trim();
    if (vidwanId !== undefined) user.vidwanId = vidwanId.trim();
    if (scopusId !== undefined) user.scopusId = scopusId.trim();
    if (designation && designation.trim()) user.designation = designation.trim();

    user.isFirstLogin = false;
    await user.save();

    res.json({
      message: "Onboarding completed successfully! Welcome to Intellica.",
      user: {
        id: user._id,
        name: user.name || user.regId,
        role: user.role,
        department: user.department || null,
        designation: user.designation || null,
        googleScholar: user.googleScholar || "",
        vidwanId: user.vidwanId || "",
        scopusId: user.scopusId || "",
        isFirstLogin: false
      }
    });
  } catch (err) {
    console.error("COMPLETE ONBOARDING ERROR:", err);
    res.status(500).json({ message: "Failed to complete onboarding" });
  }
};

/* =====================================================
   CHANGE PASSWORD (FROM PROFILE)
===================================================== */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    let user;
    if (req.user.role === "FACULTY") {
      user = await Faculty.findById(req.user.id);
    } else if (req.user.role === "HOD") {
      user = await HOD.findById(req.user.id);
    } else if (req.user.role === "ADMIN") {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check current password if set
    if (user.password && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect." });
      }
    }

    user.password = await bcrypt.hash(newPassword.trim(), 10);
    user.isFirstLogin = false;
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Failed to change password." });
  }
};

/* =====================================================
   UPDATE PROFILE IMAGE
===================================================== */

exports.updateProfileImage = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    let user;

    if (req.user.role === "FACULTY") {
      user = await Faculty.findById(req.user.id);
    } else if (req.user.role === "HOD") {
      user = await HOD.findById(req.user.id);
    } else if (req.user.role === "ADMIN") {
      user = await User.findById(req.user.id);
    } else {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profileImage = getUserRelativePath(req.user, "profile_pic", req.file.filename);
    await user.save();

    res.json({
      message: "Profile image updated successfully",
      profileImage: user.profileImage
    });

  } catch (err) {
    console.error("UPDATE PROFILE IMAGE ERROR:", err);
    res.status(500).json({
      message: "Failed to update profile image"
    });
  }
};

/* =====================================================
   REMOVE PROFILE IMAGE
===================================================== */
exports.removeProfileImage = async (req, res) => {
  try {
    let user;

    if (req.user.role === "FACULTY") {
      user = await Faculty.findById(req.user.id);
    } else if (req.user.role === "HOD") {
      user = await HOD.findById(req.user.id);
    } else if (req.user.role === "ADMIN") {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profileImage = "";
    await user.save();

    res.json({
      message: "Profile photo removed successfully",
      profileImage: ""
    });
  } catch (err) {
    console.error("REMOVE PROFILE IMAGE ERROR:", err);
    res.status(500).json({ message: "Failed to remove profile photo" });
  }
};


/* =====================================================
   GET FACULTY PROFILE (FOR HOD DASHBOARD)
===================================================== */

exports.getFacultyProfile = async (req, res) => {
  try {

    const { id } = req.params;

    const faculty = await Faculty.findById(id).select("-password");

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found"
      });
    }

    res.json(faculty);

  } catch (error) {

    console.error("GET FACULTY PROFILE ERROR:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
};


/* =====================================================
   FORGOT PASSWORD - SEND RESET OTP
===================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const identifier = req.body.identifier?.toString().trim() || req.body.email?.toString().trim();

    if (!identifier) {
      return res.status(400).json({ message: "Email or ID is required" });
    }

    let user;

    // Search in Faculty, HOD, and User (Admin)
    user = await Faculty.findOne({
      $or: [
        { employeeId: identifier },
        { email: identifier.toLowerCase() }
      ]
    });
    if (!user) {
      user = await HOD.findOne({
        $or: [
          { employeeId: identifier },
          { email: identifier.toLowerCase() }
        ]
      });
    }
    if (!user) {
      user = await User.findOne({
        $or: [
          { regId: identifier },
          { email: identifier.toLowerCase() }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({ message: "No account found matching this Email/ID." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    // Security: Never log the actual OTP value in any environment
    if (process.env.NODE_ENV !== "production") {
      console.log(`🔑 [DEV ONLY - RESET OTP] Sent to masked email`);
    }

    try {
      if (user.email) {
        await sendOTP(user.email, otp);
      }
    } catch (emailError) {
      console.error("Email send error for password reset:", emailError);
    }

    res.status(200).json({
      message: `Password reset OTP code sent to your email (${user.email || identifier}).`,
      email: user.email || identifier
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   RESET PASSWORD - VERIFY OTP & SET NEW PASSWORD
===================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const identifier = req.body.identifier?.toString().trim() || req.body.email?.toString().trim();
    const otp = req.body.otp?.toString().trim();
    const newPassword = req.body.newPassword?.toString();

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ message: "Identifier, OTP, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    let user;
    user = await Faculty.findOne({
      $or: [
        { employeeId: identifier },
        { email: identifier.toLowerCase() }
      ]
    });
    if (!user) {
      user = await HOD.findOne({
        $or: [
          { employeeId: identifier },
          { email: identifier.toLowerCase() }
        ]
      });
    }
    if (!user) {
      user = await User.findOne({
        $or: [
          { regId: identifier },
          { email: identifier.toLowerCase() }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    // Verify OTP
    const isOtpValid = (user.resetPasswordOtp && user.resetPasswordOtp === otp) || (user.otp && user.otp === otp);
    if (!isOtpValid) {
      return res.status(401).json({ message: "Invalid reset OTP code. Please check and try again." });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      return res.status(401).json({ message: "Reset OTP has expired. Please request a new one." });
    }

    // Hash new password and save
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.status(200).json({
      message: "Password reset successful! You can now sign in with your new password."
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   VERIFY RESET OTP (STEP BEFORE SETTING NEW PASSWORD)
===================================================== */
exports.verifyResetOtp = async (req, res) => {
  try {
    const identifier = req.body.identifier?.toString().trim() || req.body.email?.toString().trim();
    const otp = req.body.otp?.toString().trim();

    if (!identifier || !otp) {
      return res.status(400).json({ message: "Identifier and OTP are required." });
    }

    let user = await Faculty.findOne({
      $or: [{ employeeId: identifier }, { email: identifier.toLowerCase() }]
    });
    if (!user) {
      user = await HOD.findOne({
        $or: [{ employeeId: identifier }, { email: identifier.toLowerCase() }]
      });
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ regId: identifier }, { email: identifier.toLowerCase() }]
      });
    }

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    const isOtpValid = (user.resetPasswordOtp && user.resetPasswordOtp === otp) || (user.otp && user.otp === otp);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid 6-digit OTP code. Please check and try again." });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: "OTP code has expired. Please request a new one." });
    }

    res.status(200).json({
      message: "OTP code verified successfully.",
      valid: true,
    });
  } catch (err) {
    console.error("VERIFY RESET OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

