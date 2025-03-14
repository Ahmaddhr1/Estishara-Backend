const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { Resend } = require("resend");
const dotenv = require("dotenv");
const Doctor = require("../models/Doctor");
dotenv.config();

const router = express.Router();
const resend = new Resend(process.env.RESEND);

// Generate JWT Token for Authentication
const generateToken = (userId) => {
  const secretKey = process.env.JWT_SECRET || "defaultSecret";
  const uniqueAddition = uuidv4();

  return jwt.sign({ id: userId + "-" + uniqueAddition }, secretKey, {
    expiresIn: "7d",
  });
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

router.post("/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = generateOTP();
    const otpToken = jwt.sign({ email, otp }, process.env.OTP_SECRET, {
      expiresIn: "5m",
    });

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP code is <strong>${otp}</strong>. It will expire in 5 minutes.</p>`,
    });
    res.json({ message: "OTP sent successfully", otpToken });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to send OTP", details: error.message });
  }
});

router.post("/doctor/register", async (req, res) => {
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
      otpCode,
    } = req.body;

    try {
      const decoded = jwt.verify(otpToken, process.env.OTP_SECRET);
      if (decoded.otp !== otpCode) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Expired or invalid OTP" });
    }

    const checkDoctor = await Doctor.findOne({ email }).exec();
    if (checkDoctor) {
      return res.status(400).json({
        error: "Email already exists",
        message: "Doctor already exists!",
      });
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

    const doctorObject = newDoctor.toObject();
    delete doctorObject.password;

    res.status(201).json({
      message: "Doctor created successfully",
      doctor: doctorObject,
      token,
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error creating Doctor!" });
  }
});

router.post("/doctor/login", async (req, res) => {
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
