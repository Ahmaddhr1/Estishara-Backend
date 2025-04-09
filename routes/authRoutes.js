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

// ✅ Function to generate both access and refresh tokens
const generateTokens = (user) => {
  const secretKey = process.env.JWT_SECRET || "defaultSecret";
  const uniqueAddition = uuidv4();

  let role = "patient";
  if (user.role === "admin") {
    role = "admin";
  } else if (user.specialityId) {
    role = "doctor";
  }

  const payload = {
    id: user._id,
    email: user.email,
    role: role, // inferred role
    uuid: uniqueAddition, // optional
  };

  const accessToken = jwt.sign(payload, secretKey, { expiresIn: "1h" });
  const refreshToken = jwt.sign(payload, secretKey, { expiresIn: "30d" });

  return { accessToken, refreshToken };
};

// Function to generate OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

// ✅ Route to request OTP
router.post("/request-otp", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
      return res
        .status(400)
        .json({ error: "Email or Phone number is required" });
    }

    const existingDoctorByEmail = await Doctor.findOne({ email }).exec();
    const existingPatientByEmail = await Patient.findOne({ email }).exec();
    const existingDoctorByPhone = await Doctor.findOne({ phoneNumber }).exec();
    const existingPatientByPhone = await Patient.findOne({
      phoneNumber,
    }).exec();

    if (existingDoctorByEmail || existingPatientByEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }
    if (existingDoctorByPhone || existingPatientByPhone) {
      return res.status(400).json({ error: "Phone number already registered" });
    }

    const otp = generateOTP();
    const otpToken = jwt.sign({ email, otp }, process.env.OTP_SECRET, {
      expiresIn: "5m",
    });

    const apikey = process.env.BREVO_MAIL;
    const url = process.env.BREVO_URL;

    const emailData = {
      sender: { name: "Estishara", email: "ahmaddaher0981@gmail.com" },
      to: [{ email }],
      subject: "Your OTP Code",
      htmlContent: `<p>Your OTP code is :</p><br/><h1>${otp}</h1><p><strong>Note:</strong> It will expire in 5 minutes.</p><br/><h3>Estishara Team,</h3>`,
      textContent: `Your OTP code is: ${otp}. Note: It will expire in 5 minutes.`,
    };

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
      return res
        .status(500)
        .json({ error: "Failed to send OTP", details: data });
    }

    res.json({ message: "OTP sent successfully", otpToken });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// ✅ Doctor Registration
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

    try {
      const decoded = jwt.verify(otpToken, process.env.OTP_SECRET);
      if (decoded.otp !== otpCode) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Expired or invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    email = email.toLowerCase();

    const newDoctor = new Doctor({
      email,
      password: hashedPassword,
      phoneNumber,
      name,
      age,
      specialityId,
      documents,
    });

    const savedDoctor = await newDoctor.save();
    await savedDoctor.populate("specialityId");

    const speciality = await Speciality.findById(specialityId);
    if (!speciality) {
      return res.status(404).json({ error: "Speciality Not Found" });
    }

    speciality.doctors.push(savedDoctor._id);
    await speciality.save();

    const { accessToken, refreshToken } = generateTokens(savedDoctor);

    const doctorObject = savedDoctor.toObject();
    delete doctorObject.password;
     const role="doctor"

    res.status(201).json({
      message: "Doctor created successfully",
      doctor: doctorObject,
      accessToken,
      refreshToken,
      role
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error creating doctor!" });
  }
});

// ✅ Doctor Login
router.post("/doctor/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    email = email.toLowerCase();
    const doctor = await Doctor.findOne({ email }).exec();
    if (!doctor) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(doctor);

    const doctorObject = doctor.toObject();
    delete doctorObject.password;

     const role="doctor"
    res.status(200).json({
      message: "Login successful",
      doctor: doctorObject,
      accessToken,
      refreshToken,
      role
    });
  } catch (e) {
    res.status(500).json({ error: e.message, message: "Login failed!" });
  }
});

// ✅ Refresh Token Endpoint
router.post("/refresh-token", async (req, res) => {
  try {
    // Extract refresh token from Authorization header (Bearer <refresh_token>)
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(400).json({ error: "Authorization header is required" });
    }

    const refreshToken = authHeader.split(' ')[1]; // Get the token part (remove "Bearer" part)
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Verify the refresh token
    jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ error: "Invalid or expired refresh token" });
      }

      // Generate new access token and refresh token
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded);

      // Return the new tokens
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
// ✅ Patient Registration
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

    try {
      const decoded = jwt.verify(otpToken, process.env.OTP_SECRET);
      if (decoded.otp !== otpCode) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Expired or invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    email = email.toLowerCase();
    const newPatient = new Patient({
      name,
      lastName,
      email,
      phoneNumber,
      age,
      password: hashedPassword,
    });

    await newPatient.save();

    const { accessToken, refreshToken } = generateTokens(newPatient);

    const patientObject = newPatient.toObject();
    delete patientObject.password;

    const role="patient"

    res.status(201).json({
      message: "Patient registered successfully",
      patient: patientObject,
      accessToken,
      refreshToken,
      role
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error registering patient!" });
  }
});

// ✅ Patient Login
router.post("/patient/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required!" });
    }
    email = email.toLowerCase();
    const patient = await Patient.findOne({ email }).exec();
    if (!patient) {
      return res.status(400).json({ error: "Patient not found!" });
    }

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password!" });
    }

    const { accessToken, refreshToken } = generateTokens(patient);

    const patientObject = patient.toObject();
    delete patientObject.password;
    const role="patient"
    res.status(200).json({
      message: "Login successful",
      patient: patientObject,
      accessToken,
      refreshToken,
      role
    });
  } catch (e) {
    res.status(500).json({ error: e.message, message: "Login failed!" });
  }
});

// ✅ Google Sign-In for Patient
router.post("/patient-google", async (req, res) => {
  const { idToken, phoneNumber, age } = req.body;
  if (!idToken) return res.status(400).json({ error: "ID token is required" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;

    let patient = await Patient.findOne({ email });
    if (!patient) {
      patient = await Patient.create({
        name,
        email,
        profilePic: picture,
        phoneNumber,
        age,
      });
    }

    const { accessToken, refreshToken } = generateTokens(patient);
    const role="patient"
    res.status(200).json({
      message: "Patient authenticated via Google",
      token: accessToken,
      refreshToken,
      patient,
      role
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired ID token" });
  }
});

// ✅ Google Sign-In for Doctor
router.post("/doctor-google", async (req, res) => {
  const { idToken, phoneNumber, age, specialityId, documents } = req.body;
  if (!idToken) return res.status(400).json({ error: "ID token is required" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decodedToken;

    let doctor = await Doctor.findOne({ email });
    if (!doctor) {
      doctor = await Doctor.create({
        name,
        email,
        phoneNumber,
        age,
        specialityId,
        documents,
      });
    }

    const { accessToken, refreshToken } = generateTokens(doctor);
    const role="doctor"
    res.status(200).json({
      message: "Doctor authenticated via Google",
      token: accessToken,
      refreshToken,
      doctor,
      role
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired ID token" });
  }
});

// ✅ Token Verification
router.post("/verify-token", async (req, res) => {
  try {
    // Extract token from Authorization header (Bearer <token>)
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res
        .status(400)
        .json({ error: "Authorization header is required" });
    }

    const token = authHeader.split(" ")[1]; // Get the token part (remove "Bearer" part)
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Return the decoded user data if the token is valid
      res.status(200).json({ message: "Token is valid", user: decoded });
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: e.message, message: "Error verifying token" });
  }
});

module.exports = router;
