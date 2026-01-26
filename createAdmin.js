const mongoose = require("mongoose");
const User = require("./models/User"); 
require("dotenv").config();

const createAdmin = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    const adminData = {
      name: "System Admin",
      email: process.env.ADMIN_EMAIL.toLowerCase().trim(),
      password: "IijrpAdmin5562", 
      role: "admin",
    };

    // 2. Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log(`Admin with email ${adminData.email} already exists.`);
      process.exit();
    }

    // 3. Create the Admin
    const admin = await User.create(adminData);
    console.log("Successfully created admin user:");
    console.log(admin);

    process.exit();
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
