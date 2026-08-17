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

    /* ── Calculated scores (summary) ── */
    calculatedScores: {
      teaching:       { type: Number, default: 0 },
      professional:   { type: Number, default: 0 },
      research:       { type: Number, default: 0 },
      administrative: { type: Number, default: 0 },
      total:          { type: Number, default: 0 },
      percentage:     { type: Number, default: 0 },
    },

    /* ── Full calculation breakdown (for explainability) ── */
    calculationDetails: {
      type: Object,
      default: null,
    },

    /* ── Calculation metadata ── */
    calculationMetadata: {
      rulesVersion:    { type: String, default: "PBAS-v1" },
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

    adminComment: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Compound index: one appraisal per faculty per academic year
pbasAppraisalSchema.index({ faculty: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model("PBASAppraisal", pbasAppraisalSchema);
