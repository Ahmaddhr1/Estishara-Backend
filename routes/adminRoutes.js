const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin"); // Assuming Admin model exists
const authenticateToken = require("../utils/middleware");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();


const generateToken = (userId, role = 'admin') => {
  const secretKey = process.env.JWT_SECRET || "defaultSecret";
  return jwt.sign({ id: userId, role: role }, secretKey, { expiresIn: '10d' });
};

// Admin Login Route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const admin = await Admin.findOne({ username }).exec();

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token with role 'admin'
    const token = generateToken(admin._id, 'admin');
    res.status(200).json({
      message: "Logged in successfully",
      token,
      admin: { id: admin._id, username: admin.username },
    });
  } catch (err) {
    console.error("Error in login route:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Admin Registration Route (Creating new Admin)
router.post("/", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const existingAdmin = await Admin.findOne({ username }).exec();
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, password: hashedPassword });

    await newAdmin.save();


    const token = generateToken(newAdmin._id, 'admin');

    res.status(201).json({
      message: "Admin created successfully",
      admin: { id: newAdmin._id, username: newAdmin.username },
      token,
    });
  } catch (err) {
    console.error("Error in admin route:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    // Only admins can delete other admins
    if (role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized: Only admins can delete other admins" });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin Update Route (Admin can update their details)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    // Only admins can update their profile or others' profiles
    if (role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized: Only admins can update admin profiles" });
    }

    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get All Admins (only for admins)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    // Only admin can access the list of admins
    if (role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized: Only admins can access this route" });
    }

    const admins = await Admin.find();
    if (!admins.length) {
      return res.status(404).json({ message: "No admins found" });
    }

    res.status(200).json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Single Admin
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    // Admins can view any admin's profile
    if (role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized: Only admins can access this route" });
    }

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
