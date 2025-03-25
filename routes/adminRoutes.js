const express = require("express");
const Admin = require("../models/Admin");
const router = express.Router();
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const admin = await Admin.findOne({ username }).exec();

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(admin._id);
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
    res.status(201).json({ 
      message: "Admin created successfully", 
    });

  } catch (err) {
    console.error("Error in admin route:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const admins = await Admin.find();
    if (!admins) return res.status(404).json({ message: "No admins found" });
    else {
      res.status(200).json(admins);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    else {
      res.status(200).json(admin);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
