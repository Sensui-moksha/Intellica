const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const Category = require("./models/Category");
const CATEGORY_REGISTRY = require("./constants/categoryRegistry");

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    for (const [name, data] of Object.entries(CATEGORY_REGISTRY)) {
      const exists = await Category.findOne({ name });
      if (!exists) {
        await Category.create({
          name: name,
          section: data.section,
          key: data.key,
          isActive: true
        });
        console.log(`✅ Seeded Category: ${name}`);
      } else {
        console.log(`⚠️ Category ${name} already exists.`);
      }
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
}

seedCategories();
