const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true
    },
    // Specific targeted user (e.g., Neil when his proposal is approved/rejected)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    // Role filter: "ADMIN", "HOD", "FACULTY"
    role: {
      type: String,
      default: null,
      index: true
    },
    // Department filter (e.g., "CSE" so only CSE HOD receives it)
    department: {
      type: String,
      default: null,
      index: true
    },
    // Type of notification
    type: {
      type: String,
      enum: ["SUBMISSION", "APPROVAL", "REJECTION", "DISCUSSION", "CREDIT", "SYSTEM", "GENERAL"],
      default: "GENERAL"
    },
    // Related Upload ID
    uploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Upload",
      default: null
    },
    // List of users who have read this notification
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Notification", notificationSchema);