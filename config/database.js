require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Connected to MongoDB!");
  } catch (err) {
    console.error("❌ Connection Error:", err.message);
  }
};

module.exports = connectDB;
