const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const Doctor = require("../models/Doctor");

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
    } = req.body;

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

    // Generate JWT token
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

module.exports = router;
