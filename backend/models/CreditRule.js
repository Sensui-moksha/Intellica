const mongoose = require("mongoose");

const creditRuleSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true
    },
    section: {
      type: String,
      enum: ["teaching", "professional", "rnd", "research", "administrative"],
      default: "rnd"
    },
    ruleKey: {
      type: String,
      required: true,
      trim: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    creditPoints: {
      type: Number,
      required: true,
      default: 10
    },
    description: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CreditRule", creditRuleSchema);
