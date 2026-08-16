const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    hod: {
      type: String,
      default: "Unassigned",
    },
    description: {
      type: String,
      default: "",
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);
