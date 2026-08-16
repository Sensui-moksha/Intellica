const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema(
{
  /* who created the upload */

 faculty: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Faculty",
  required: true
},

  createdByRole: {
    type: String,
    enum: ["FACULTY", "HOD", "ADMIN"],
    required: true
  },

  department: {
    type: String,
    default: ""
  },

  category: {
    type: String,
    required: true
  },

  subcategory: {
    type: String,
    default: ""
  },

  title: {
    type: String,
    default: ""
  },

  metadata: {
    type: Object,
    default: {}
  },

  filePath: {
    type: String,
    default: ""
  },

  credits: {
    type: Number,
    default: 0
  },

  year: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  

  /* workflow status */

  status: {
    type: String,
    enum: [
      "FACULTY_SUBMITTED",
      "HOD_COMMENT",
      "HOD_APPROVED",
      "HOD_SUBMITTED",
      "ADMIN_COMMENT",
      "ADMIN_APPROVED",
      "ADMIN_REJECTED",
      "HOD_REJECTED",
      "REJECTED",
      "NEEDS_REVISION"
    ],
    default: "FACULTY_SUBMITTED"
  },

  /* comments & rejection */

  hodComment: {
    type: String,
    default: ""
  },

  adminComment: {
    type: String,
    default: ""
  },

  rejectionReason: {
    type: String,
    default: ""
  },

  rejectedBy: {
    type: String,
    default: ""
  },

  rejectedAt: {
    type: Date,
    default: null
  },

  /* ================= NEW FIELDS ================= */

  changedFields: {
    type: [String],
    default: []
  },

  previousMetadata: {
    type: Object,
    default: {}
  },

  archived: {
    type: Boolean,
    default: false
  },

  archivedYear: {
    type: String,
    default: null
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Upload", uploadSchema);