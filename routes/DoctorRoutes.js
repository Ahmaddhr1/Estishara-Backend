const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const Doctor = require("../models/Doctor");
const admin = require("../config/firebaseConfig");
router.get("/", (req, res) => {
  res.send("Hello from the Doctor route");
});

router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      phoneNumber,
      name,
      age,
      respondTime,
      documents,
      consultationFees,
      workingAt,
      education,
      isEmergencyAvailable,
      treated,
      service,
      experience,
      profilePic,
      otpToken,
    } = req.body;

    const checkDoctor = await Doctor.findOne({ email }).exec();
    if (checkDoctor) {
      return res.status(400).json({
        error: "Email already exists",
        message: "Doctor already exists!",
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(otpToken);
    if (!decodedToken || decodedToken.email !== email) {
      return res.status(400).json({ error: "Invalid OTP or email mismatch" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newDoctor = new Doctor({
      email,
      password: hashedPassword,
      phoneNumber,
      name,
      age,
      respondTime,
      documents,
      consultationFees,
      workingAt,
      education,
      isEmergencyAvailable,
      treated,
      service,
      experience,
      profilePic,
    });

    await newDoctor.save();
    const token = generateToken(newDoctor._id);

    res.status(201).json({
      message: "Doctor created successfully",
      doctor: newDoctor,
      token,
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error creating Doctor!" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    if (!email || !password) {
      return res.status(400).json({
        error: "Missing fields",
        message: "Email and password are required!",
      });
    }

    const doctor = await Doctor.findOne({ email }).exec();
    if (!doctor) {
      return res.status(400).json({
        error: "Invalid credentials",
        message: "Doctor not found!",
      });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid credentials",
        message: "Incorrect password!",
      });
    }
    const token = generateToken(doctor._id);
    res.status(200).json({
      message: "Login successful",
      doctor,
      token,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, message: "Login failed!" });
  }
});

module.exports = router;
