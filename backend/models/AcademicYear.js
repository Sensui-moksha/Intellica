const mongoose = require("mongoose");

const academicYearSchema = new mongoose.Schema(
  {
    year: {
      type: String,
      required: true,
      unique: true, // e.g. "2025-26", "2026-27", "2024-25"
      trim: true,
    },
    label: {
      type: String,
      default: "", // e.g. "AY 2025-2026"
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademicYear", academicYearSchema);
