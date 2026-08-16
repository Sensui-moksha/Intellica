const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      trim: true,
      default: "",
    },
    creditPoints: {
      type: Number,
      required: true,
      default: 10,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true, timestamps: true }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g., 'Publication', 'Conference', 'Book'
      trim: true,
    },
    section: {
      type: String,
      required: true,
      enum: ["rnd", "professional"], // matches sections in CreditConfig
    },
    key: {
      type: String,
      required: true,
      unique: true, // e.g., 'paperPublications', 'conferences', 'books'
      trim: true,
    },
    creditPoints: {
      type: Number,
      default: 10,
    },
    description: {
      type: String,
      default: "",
    },
    subcategories: {
      type: [subcategorySchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Category", categorySchema);
