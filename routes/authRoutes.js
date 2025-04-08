const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const admin = require("../config/firebaseConfig");
const Speciality = require("../models/Speciality");
dotenv.config();

const router = express.Router();

// Function to generate both access and refresh tokens
const generateTokens = (userId) => {
  const secretKey = process.env.JWT_SECRET || "defaultSecret";
  const uniqueAddition = uuidv4();

  // Access token expires in 1 hour
  const accessToken = jwt.sign(
    { id: userId + "-" + uniqueAddition },
    secretKey,
    { expiresIn: "1h" }
  );

  // Refresh token expires in 30 days
  const refreshToken = jwt.sign(
    { id: userId + "-" + uniqueAddition },
    secretKey,
    { expiresIn: "30d" }
  );

  return { accessToken, refreshToken };
};

// Function to generate OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

// Route to request OTP
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
      to: [{ email }],
      subject: "Your OTP Code",
      htmlContent: `<p>Your OTP code is :</p><br/><h1>${otp}</h1><p><strong>Note:</strong> It will expire in 5 minutes.</p><br/><h3>Estishara Team,</h3>`,
      textContent: `Your OTP code is: ${otp}. Note: It will expire in 5 minutes.`,
    };

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

    res.json({ message: "OTP sent successfully", otpToken });
  } catch (error) {
    console.error("Error in request-otp route:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Doctor Registration with token generation (access and refresh tokens)
router.post("/doctor/register", async (req, res) => {
  try {
    const {
      email,
      password,
      phoneNumber,
      name,
      age,
      documents,
      specialityId,
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

    // Check if email or phone is already registered
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

    const hashedPassword = await bcrypt.hash(password, 10);

    // Save doctor
    const newDoctor = new Doctor({
      email,
      password: hashedPassword,
      phoneNumber,
      name,
      age,
      specialityId,
      documents,
    });

    // Save the doctor to the database
    const savedDoctor = await newDoctor.save();

    // Populate speciality after saving the doctor
    await savedDoctor.populate("specialityId");

    // Find the speciality and add the doctor to the speciality's doctor list
    const speciality = await Speciality.findById(specialityId);
    if (!speciality) {
      return res.status(404).json({ message: "Speciality Not Found" });
    }

    // Add doctor to speciality
    speciality.doctors.push(savedDoctor._id);
    await speciality.save();

    // Generate tokens for the doctor
    const { accessToken, refreshToken } = generateTokens(savedDoctor._id);

    const doctorObject = savedDoctor.toObject();
    delete doctorObject.password;

    // Send response with doctor data and tokens
    res.status(201).json({
      message: "Doctor created successfully",
      doctor: doctorObject,
      accessToken,
      refreshToken,
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error creating doctor!" });
  }
});

// Doctor login with token generation (access and refresh tokens)
router.post("/doctor/login", async (req, res) => {
  try {
    const { email, password } = req.body;

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

    const { accessToken, refreshToken } = generateTokens(doctor._id);

    res.status(200).json({
      message: "Login successful",
      doctor,
      accessToken,
      refreshToken,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, message: "Login failed!" });
  }
});

// Refresh Token Endpoint
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ error: "Invalid or expired refresh token" });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        decoded.id
      );

      res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: e.message, message: "Error refreshing token" });
  }
});

// Patient registration with token generation (access and refresh tokens)
router.post("/patient/register", async (req, res) => {
  try {
    const {
      name,
      lastName,
      email,
      phoneNumber,
      age,
      password,
      otpToken,
      otpCode,
    } = req.body;

    // try {
    //   const decoded = jwt.verify(otpToken, process.env.OTP_SECRET);
    //   if (decoded.otp !== otpCode) {
    //     return res.status(400).json({ error: "Invalid OTP" });
    //   }
    // } catch (err) {
    //   return res.status(400).json({ error: "Expired or invalid OTP" });
    // }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newPatient = new Patient({
      name,
      lastName,
      email,
      phoneNumber,
      age,
      password: hashedPassword,
    });

    await newPatient.save();

    const { accessToken, refreshToken } = generateTokens(newPatient._id);

    const patientObject = newPatient.toObject();
    delete patientObject.password;

    res.status(201).json({
      message: "Patient registered successfully",
      patient: patientObject,
      accessToken,
      refreshToken,
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error registering patient!" });
  }
});

// Patient login with token generation (access and refresh tokens)
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

    const isMatch =  bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password!" });
    }

    const { accessToken, refreshToken } = generateTokens(patient._id);

    const patientObject = patient.toObject();
    delete patientObject.password;

    res.status(200).json({
      message: "Login successful",
      patient: patientObject,
      accessToken,
      refreshToken,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, message: "Login failed!" });
  }
});

// Google Authentication for Patient
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
    const { accessToken, refreshToken } = generateTokens(patient._id);

    res.status(200).json({
      message: "Patient authenticated via Google",
      token: accessToken,
      refreshToken,
      patient,
    });
  } catch (error) {
    console.error("Google sign-in error:", error);
    res.status(401).json({ error: "Invalid or expired ID token" });
  }
});

// Google Authentication for Doctor
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

    const { accessToken, refreshToken } = generateTokens(doctor._id);

    res.status(200).json({
      message: "Doctor authenticated via Google",
      token: accessToken,
      refreshToken,
      doctor,
    });
  } catch (error) {
    console.error("Doctor Google sign-in error:", error);
    res.status(401).json({ error: "Invalid or expired ID token" });
  }
});

module.exports = router;
