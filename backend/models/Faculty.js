
const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: false,
      default: null,
    },

    department: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    designation: {
      type: String,
      required: true
    },

    googleScholar: {
      type: String,
      default: ""
    },

    vidwanId: {
      type: String,
      default: ""
    },

    scopusId: {
      type: String,
      default: ""
    },

    role: {
      type: String,
      default: "FACULTY",
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    /* NEW FIELD FOR ACCOUNT STATUS */

    status: {
      type: String,
      enum: ["PENDING", "DISCUSSION", "APPROVED"],
      default: "PENDING"
    },

    profileImage: {
      type: String,
      default: "",
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faculty", facultySchema);

