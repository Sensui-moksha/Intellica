const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["ADMIN", "HOD", "FACULTY"]
    },
    resource: {
      type: String, // e.g., "DoctoralThesis", "Categories", "Users"
      required: true
    },
    action: {
      type: String, // e.g., "Approve", "Create", "View"
      required: true
    },
    allowed: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure a role has only one setting for a specific resource/action combo
permissionSchema.index({ role: 1, resource: 1, action: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);
