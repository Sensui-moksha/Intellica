const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Administrator",
      trim: true
    },
    regId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    employeeId: {
      type: String,
      default: "",
      trim: true
    },
    department: {
      type: String,
      default: "ADMINISTRATION",
      trim: true
    },
    designation: {
      type: String,
      default: "Institutional Administrator",
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: false,
      default: null,
    },
    role: {
      type: String,
      enum: ["ADMIN", "FACULTY", "HOD"],
      default: "ADMIN"
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    isFirstLogin: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: "",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);