const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const admin = require("../config/firebaseConfig");
dotenv.config();

const router = express.Router();

const generateToken = (userId) => {
  const secretKey = process.env.JWT_SECRET || "defaultSecret";
  const uniqueAddition = uuidv4();
  return jwt.sign({ id: userId + "-" + uniqueAddition }, secretKey);
};

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

router.post("/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = generateOTP();
    const otpToken = jwt.sign({ email, otp }, process.env.OTP_SECRET, {
      expiresIn: "5m",
    });

    const apikey = process.env.BREVO_MAIL;
    const url = process.env.BREVO_URL;

    // Prepare email data
    const emailData = {
      sender: {
        name: "Estishara",
        email: "ahmaddaher0981@gmail.com",
      },
      to: [
        {
          email: email,
        },
      ],
      subject: "Your OTP Code",
      htmlContent: `<p>Your OTP code is :</p><br/><h1>${otp}</h1><p><strong>Note:</strong> It will expire in 5 minutes.</p><br/><h3>Estishara Team,</h3>`,
      textContent: `Your OTP code is: ${otp}. Note: It will expire in 5 minutes.`,
    };

    // Send email using Brevo's API
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apikey,
        },
        body: JSON.stringify(emailData),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Error sending email:", data);
        return res
          .status(500)
          .json({ error: "Failed to send OTP", details: data });
      }
    } catch (e) {
      console.error("Failed to send email:", e.message);
      return res
        .status(500)
        .json({ error: "Failed to send OTP", details: e.message });
    }

    // Respond with OTP token
    res.json({ message: "OTP sent successfully", otpToken });
  } catch (error) {
    console.error("Error in request-otp route:", error); // Log the error for debugging
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
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
      treated,
      service,
      experience,
      profilePic,
      otpToken,
      otpCode,
    } = req.body;

    // Verify OTP
    try {
      const decoded = jwt.verify(otpToken, process.env.OTP_SECRET);
      if (decoded.otp !== otpCode) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Expired or invalid OTP" });
    }

    // Check if email or phone is already registered as a Doctor or Patient
    const existingDoctor = await Doctor.findOne({ email }).exec();
    const existingPatient = await Patient.findOne({ email }).exec();
    const existingPhoneDoctor = await Doctor.findOne({ phoneNumber }).exec();
    const existingPhonePatient = await Patient.findOne({ phoneNumber }).exec();

    if (existingDoctor || existingPatient) {
      return res.status(400).json({ error: "Email already registered!" });
    }

    if (existingPhoneDoctor || existingPhonePatient) {
      return res
        .status(400)
        .json({ error: "Phone number already registered!" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save doctor
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

    // Remove password before sending response
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
      .json({ error: e.message, message: "Error creating doctor!" });
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

router.post("/patient/register", async (req, res) => {
  try {
    const { name, email, phoneNumber, age, password, otpToken, otpCode } =
      req.body;

    try {
      const decoded = jwt.verify(otpToken, process.env.OTP_SECRET);
      if (decoded.otp !== otpCode) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Expired or invalid OTP" });
    }

    const existingDoctor = await Doctor.findOne({ email }).exec();
    const existingPatient = await Patient.findOne({ email }).exec();
    const existingPhoneDoctor = await Doctor.findOne({ phoneNumber }).exec();
    const existingPhonePatient = await Patient.findOne({ phoneNumber }).exec();

    if (existingDoctor || existingPatient) {
      return res.status(400).json({ error: "Email already registered!" });
    }

    if (existingPhoneDoctor || existingPhonePatient) {
      return res
        .status(400)
        .json({ error: "Phone number already registered!" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save patient
    const newPatient = new Patient({
      name,
      email,
      phoneNumber,
      age,
      password: hashedPassword,
    });

    await newPatient.save();

    const token = generateToken(newPatient._id);

    // Remove password before sending response
    const patientObject = newPatient.toObject();
    delete patientObject.password;

    res.status(201).json({
      message: "Patient registered successfully",
      patient: patientObject,
      token,
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error registering patient!" });
  }
});
router.post("/patient/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required!" });
    }

    const patient = await Patient.findOne({ email }).exec();
    if (!patient) {
      return res.status(400).json({ error: "Patient not found!" });
    }

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password!" });
    }

    const token = generateToken(patient._id);

    const patientObject = patient.toObject();
    delete patientObject.password;

    res.status(200).json({
      message: "Login successful",
      patient: patientObject,
      token,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, message: "Login failed!" });
  }
});

router.post("/patient-google", async (req, res) => {
  const { idToken, phoneNumber, alergic, smooking, height, age, weight } =
    req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID token is required" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;

    // Check if patient already exists
    let patient = await Patient.findOne({ email });

    if (!patient) {
      patient = await Patient.create({
        name: name,
        email,
        profilePic: picture,
        phoneNumber,
        alergic,
        smooking,
        height,
        age,
        weight,
      });
    }
    const token = generateToken(patient._id);

    res.status(200).json({
      message: "Patient authenticated via Google",
      token,
      patient,
    });
  } catch (error) {
    console.error("Google sign-in error:", error);
    res.status(401).json({ error: "Invalid or expired ID token" });
  }
});

router.post("/doctor-google", async (req, res) => {
  const {
    idToken,
    phoneNumber,
    profilePic,
    age,
    respondTime,
    consultationFees,
    workingAt,
    education,
    treated,
    service,
    experience,
    specialityId,
    documents,
  } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID token is required" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decodedToken;

    let doctor = await Doctor.findOne({ email });

    if (!doctor) {
      doctor = await Doctor.create({
        name: name,
        email,
        phoneNumber,
        profilePic,
        age,
        respondTime,
        consultationFees,
        workingAt,
        education,
        treated,
        service,
        experience,
        specialityId,
        documents,
      });
    }

    const token = generateToken(doctor._id);

    res.status(200).json({
      message: "Doctor authenticated via Google",
      token,
      doctor,
    });
  } catch (error) {
    console.error("Doctor Google sign-in error:", error);
    res.status(401).json({ error: "Invalid or expired ID token" });
  }
});

module.exports = router;
