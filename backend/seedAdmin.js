const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: __dirname + "/.env" });

const User = require("./models/User");
const Faculty = require("./models/Faculty");
const HOD = require("./models/HOD");
const Notification = require("./models/Notification");

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("❌ MONGO_URI is missing in .env");
      process.exit(1);
    }

    console.log("Connecting to MongoDB…");
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB.");

    // 1. Remove all existing users
    console.log("Purging all existing users (Faculty, HOD, User/Admin)…");
    const [delFaculty, delHod, delUsers] = await Promise.all([
      Faculty.deleteMany({}),
      HOD.deleteMany({}),
      User.deleteMany({}),
    ]);
    console.log(`Deleted: ${delFaculty.deletedCount} faculty, ${delHod.deletedCount} HODs, ${delUsers.deletedCount} users.`);

    // 2. Clear old notifications
    await Notification.deleteMany({});
    console.log(" Cleared old notification queue.");

    // 3. Seed fresh Admin
    const adminEmail = "mokshyagnay@gmail.com";
    const initialPassword = "Admin@123";
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    const adminUser = await User.create({
      regId: "admin",
      email: adminEmail.toLowerCase().trim(),
      password: hashedPassword,
      role: "ADMIN",
      isApproved: true,
      twoFactorEnabled: false,
      isFirstLogin: false,
      profileImage: "",
    });

    console.log("=========================================");
    console.log("🎉 ADMIN USER SEEDED SUCCESSFULLY!");
    console.log("=========================================");
    console.log(`📧 Email:        ${adminUser.email}`);
    console.log(`🔑 Initial Pass: ${initialPassword}`);
    console.log(`🆔 Role:         ADMIN`);
    console.log(`🛡️ Reg ID:       ${adminUser.regId}`);
    console.log("=========================================");
    console.log("💡 You can log in with Password OR sign in with OTP via your email!");

    process.exit(0);
  } catch (err) {
    console.error("❌ SEEDING ERROR:", err);
    process.exit(1);
  }
}

seedAdmin();
