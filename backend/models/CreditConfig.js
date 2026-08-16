const mongoose = require("mongoose");

const creditConfigSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["professional", "rnd"]
    },
    config: {
      type: Object,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("CreditConfig", creditConfigSchema);