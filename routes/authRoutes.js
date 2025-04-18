const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const Patient = require("../models/Patient");
const admin = require("../config/firebaseConfig");
const Speciality = require("../models/Speciality");
const authenticateToken = require("../utils/middleware");
const Doctor = require("../models/Doctor");
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
    role: role,
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
    let { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
      return res
        .status(400)
        .json({ error: "Email or Phone number is required" });
    }
    email = email.toLowerCase();
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
      sender: { name: "Estishara", email: "ka530893@gmail.com" },
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
    if (response.ok) {
      console.log("Email sent successfully:", data);
    } else {
      console.error("Failed to send email:", data);
    }
    res.json({ message: "OTP sent successfully", otpToken });
  } catch (error) {
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
      lastName,
      age,
      documents,
      specialityId,
      otpToken,
      otpCode,
    } = req.body;
    let email1 = email.toLowerCase();

    try {
      const decoded = await jwt.verify(otpToken, process.env.OTP_SECRET);
      if (decoded.otp !== otpCode) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
      if (decoded.email !== email1) {
        return res
          .status(400)
          .json({ error: "Email does not match OTP request" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Expired or invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDoctor = new Doctor({
      email: email1,
      password: hashedPassword,
      phoneNumber,
      name,
      age,
      lastName,
      specialityId,
      documents,
    });

    const savedDoctor = await newDoctor.save();
    await savedDoctor.populate("specialityId", "title");

    const speciality = await Speciality.findById(specialityId);
    if (!speciality) {
      return res.status(404).json({ error: "Speciality Not Found" });
    }

    speciality.doctors.push(savedDoctor._id);
    await speciality.save();

    const { accessToken, refreshToken } = generateTokens(savedDoctor);

    const doctorObject = savedDoctor.toObject();
    delete doctorObject.password;
    const role = "doctor";

    res.status(201).json({
      message: "Doctor created successfully",
      doctor: doctorObject,
      accessToken,
      refreshToken,
      role,
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error creating doctor!" });
  }
});

router.post("/refresh-token", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(400).json({ error: "Authorization header is required" });
    }

    const refreshToken = authHeader.split(" ")[1];
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Verify the refresh token and ensure id is included
    jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }

      const { id, email, role } = decoded; // Ensure we get id here

      // Generate new tokens (ensure that id is passed in the payload)
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded);

      if (role === "doctor") {
        const doctor = await Doctor.findOne({ email }).populate("specialityId").lean();
        if (!doctor) return res.status(404).json({ error: "Doctor not found" });

        delete doctor.password;  // Remove password from the response
        return res.status(200).json({
          accessToken,
          refreshToken: newRefreshToken,
          doctor,
          role,
          id,  // Include the id here in the response
        });
      } else if (role === "patient") {
        const patient = await Patient.findOne({ email }).lean();
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        delete patient.password;  // Remove password from the response
        return res.status(200).json({
          accessToken,
          refreshToken: newRefreshToken,
          patient,
          role,
          id,  // Include the id here in the response
        });
      } else {
        return res.status(400).json({ error: "Unknown user role" });
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Unexpected error during refresh" });
  }
});
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
    let email1 = email.toLowerCase();
    try {
      const decoded = jwt.verify(otpToken, process.env.OTP_SECRET);
      if (decoded.otp !== otpCode) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
      if (decoded.email !== email1) {
        return res
          .status(400)
          .json({ error: "Email does not match OTP request" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Expired or invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newPatient = new Patient({
      name,
      lastName,
      email: email1,
      phoneNumber,
      age,
      password: hashedPassword,
    });

    await newPatient.save();

    const { accessToken, refreshToken } = generateTokens(newPatient);

    const patientObject = newPatient.toObject();
    delete patientObject.password;

    const role = "patient";

    res.status(201).json({
      message: "Patient registered successfully",
      patient: patientObject,
      accessToken,
      refreshToken,
      role,
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message, message: "Error registering patient!" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required!" });
    }

    const emailNormalized = email.toLowerCase().trim();

    // Optional email format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailNormalized)) {
      return res.status(400).json({ error: "Invalid email format!" });
    }

    // Try to find patient first
    let user = await Patient.findOne({ email: emailNormalized }).exec();
    let role = "patient";

    if (!user) {
      // If not found, try doctor
      user = await Doctor.findOne({ email: emailNormalized }).exec();
      role = "doctor";
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials!" });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    const userObject = user.toObject();
    delete userObject.password;

    // Here we send the response with the role-specific key
    if (role === "doctor") {
      return res.status(200).json({
        message: "Login successful",
        doctor: userObject, // Return doctor object
        accessToken,
        refreshToken,
        role,
      });
    }

    return res.status(200).json({
      message: "Login successful",
      patient: userObject, // Return patient object
      accessToken,
      refreshToken,
      role,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, message: "Login failed!" });
  }
});

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
    const role = "patient";
    res.status(200).json({
      message: "Patient authenticated via Google",
      token: accessToken,
      refreshToken,
      patient,
      role,
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
    const role = "doctor";
    res.status(200).json({
      message: "Doctor authenticated via Google",
      token: accessToken,
      refreshToken,
      doctor,
      role,
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired ID token" });
  }
});

router.post("/verify-token", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res
        .status(400)
        .json({ error: "Authorization header is required" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err)
        return res.status(401).json({ error: "Invalid or expired token" });

      const { id, email, role } = decoded;  // Extract id from the decoded token

      // Ensure the ID in the token matches the one in the database
      let user;
      if (role === "doctor") {
        user = await Doctor.findById(id).lean();  // Use id for doctor lookup
      } else if (role === "patient") {
        user = await Patient.findById(id).lean();  // Use id for patient lookup
      }

      if (!user) {
        return res.status(404).json({ error: "User not found or ID mismatch" });
      }

      delete user.password;  // Remove sensitive info like password

      return res.status(200).json({
        message: "Token is valid",
        user,
        role,
      });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/forget-password-k", authenticateToken, async (req, res) => {
  try {
    const { id, password, oldPassword } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    // Try finding the user in Patient collection
    let user = await Patient.findById(id);

    if (user) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      user.password = hashedPassword;
      await user.save();
      return res
        .status(200)
        .json({ message: "Patient password updated successfully" });
    }

    // Try finding the user in Doctor collection
    user = await Doctor.findById(id);

    if (user) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      user.password = hashedPassword;
      await user.save();
      return res
        .status(200)
        .json({ message: "Doctor password updated successfully" });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error("Forget password error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
module.exports = router;
