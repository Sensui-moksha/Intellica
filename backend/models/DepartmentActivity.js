const mongoose = require("mongoose");

const departmentActivitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    department: {
      type: String,
      default: "ALL",
      uppercase: true,
      trim: true
    },
    targetAudience: {
      type: String,
      enum: ["ALL_HODS", "DEPARTMENT_FACULTY"],
      default: "DEPARTMENT_FACULTY"
    },
    date: {
      type: Date,
      required: true
    },
    time: {
      type: String,
      default: "10:00 AM",
      trim: true
    },
    venue: {
      type: String,
      default: "Conference Hall",
      trim: true
    },
    link: {
      type: String,
      default: "",
      trim: true
    },
    type: {
      type: String,
      default: "MEETING"
    },
    customTypeName: {
      type: String,
      default: "",
      trim: true
    },
    status: {
      type: String,
      enum: ["UPCOMING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "UPCOMING"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "creatorModel",
      required: false
    },
    creatorModel: {
      type: String,
      enum: ["User", "HOD", "Faculty"],
      default: "HOD"
    },
    createdByName: {
      type: String,
      default: "Head of Department"
    },
    createdByRole: {
      type: String,
      enum: ["ADMIN", "HOD", "FACULTY"],
      default: "HOD"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.DepartmentActivity || mongoose.model("DepartmentActivity", departmentActivitySchema);
