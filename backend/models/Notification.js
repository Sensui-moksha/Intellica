const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true // admin / hod / faculty
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  {
    timestamps: true // automatically adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Notification", notificationSchema);