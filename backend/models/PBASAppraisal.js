/**
 * PBASAppraisal.js — Mongoose Model for PBAS Appraisal Records
 * ─────────────────────────────────────────────────────────────────────────────
 * Stores faculty PBAS appraisal data including inputs, calculated scores,
 * and calculation metadata. This is completely independent from the existing
 * Upload/Credit models.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mongoose = require("mongoose");

const pbasAppraisalSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["ASSISTANT_PROFESSOR", "ASSOCIATE_PROFESSOR", "PROFESSOR"],
      required: true,
    },

    /* ── General Information (from the appraisal form header) ── */
    generalInfo: {
      // Common fields across all roles
      employeeId:     { type: String, default: "" },
      dateOfJoining:  { type: Date, default: null },
      email:          { type: String, default: "" },
      mobile:         { type: String, default: "" },
      educationalQualifications: [{
        degree:        { type: String, default: "" },
        periodOfStudy: { type: String, default: "" },
        university:    { type: String, default: "" },
        classCgpa:     { type: String, default: "" },
        yearOfPass:    { type: String, default: "" },
      }],
      // Assistant / Associate specific
      totalExperience:        { type: Number, default: null },
      experienceInMIC:        { type: String, default: "" },
      universityRatification: { type: String, enum: ["Yes", "No", ""], default: "" },
      totalEmoluments: {
        basic: { type: Number, default: null },
        gross: { type: Number, default: null },
      },
      // Professor specific
      dateOfBirth: { type: Date, default: null },
      address:     { type: String, default: "" },
    },

    /* ── Raw input data per semester ── */
    semester1: {
      teaching:       { type: Object, default: {} },
      professional:   { type: Object, default: {} },
      research:       { type: Object, default: {} },
      administrative: { type: Object, default: {} },
    },

    semester2: {
      teaching:       { type: Object, default: {} },
      professional:   { type: Object, default: {} },
      research:       { type: Object, default: {} },
      administrative: { type: Object, default: {} },
    },

    /* ── Self-Calculated scores (summary) ── */
    calculatedScores: {
      teaching:       { type: Number, default: 0 },
      professional:   { type: Number, default: 0 },
      research:       { type: Number, default: 0 },
      administrative: { type: Number, default: 0 },
      total:          { type: Number, default: 0 },
      percentage:     { type: Number, default: 0 },
    },

    /* ── HoD / DFAC Scores (departmental review) ── */
    hodScores: {
      teaching:       { type: Number, default: null },
      professional:   { type: Number, default: null },
      research:       { type: Number, default: null },
      administrative: { type: Number, default: null },
      total:          { type: Number, default: null },
    },

    /* ── IFAC Scores (institutional final appraisal) ── */
    ifacScores: {
      teaching:       { type: Number, default: null },
      professional:   { type: Number, default: null },
      research:       { type: Number, default: null },
      administrative: { type: Number, default: null },
      total:          { type: Number, default: null },
    },

    /* ── Full calculation breakdown (for explainability) ── */
    calculationDetails: {
      type: Object,
      default: null,
    },

    /* ── Calculation metadata ── */
    calculationMetadata: {
      rulesVersion:    { type: String, default: "PBAS-v2" },
      calculatedAt:    { type: Date, default: null },
      unresolvedRules: { type: [Object], default: [] },
      warnings:        { type: [Object], default: [] },
    },

    /* ── Workflow status ── */
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "HOD_REVIEW",
        "HOD_APPROVED",
        "IFAC_REVIEW",
        "APPROVED",
        "REVISION_REQUIRED",
      ],
      default: "DRAFT",
    },

    /* ── Review comments ── */
    hodComment: {
      type: String,
      default: "",
    },

    ifacComment: {
      type: String,
      default: "",
    },

    adminComment: {
      type: String,
      default: "",
    },

    /* ── IFAC member signatures ── */
    ifacSignatures: [{
      name:      { type: String, default: "" },
      signedAt:  { type: Date, default: null },
    }],
  },
  { timestamps: true }
);

// Compound index: one appraisal per faculty per academic year
pbasAppraisalSchema.index({ faculty: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model("PBASAppraisal", pbasAppraisalSchema);
