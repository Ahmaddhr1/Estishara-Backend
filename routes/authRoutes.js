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
      fcmToken,
      otpToken,
      otpCode,
    } = req.body;
    const email1 = email.toLowerCase();

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

    // First save the doctor
    const savedDoctor = await newDoctor.save();

    // Then populate the saved doctor
    const populatedDoctor = await Doctor.findById(savedDoctor._id)
      .populate("specialityId", "title")
      .populate({
        path: "pendingConsultations",
        select: "status",
      })
      .populate({
        path: "acceptedConsultations",
        select: "status",
      })
      .populate({ path: "ongoingConsultation", select: "status" })
      .populate({ path: "historyConsultations", select: "status" })
      .populate({ path: "notificationsRecieved", select: "title" });

    if (fcmToken) {
      await Doctor.updateOne(
        { _id: populatedDoctor._id },
        { $set: { fcmToken } }
      );
    }

    const speciality = await Speciality.findById(specialityId);
    if (!speciality) {
      return res.status(404).json({ error: "Speciality Not Found" });
    }

    speciality.doctors.push(savedDoctor._id);
    await speciality.save();

    const { accessToken, refreshToken } = generateTokens(populatedDoctor);

    const doctorObject = populatedDoctor.toObject();
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
      return res
        .status(400)
        .json({ error: "Authorization header is required" });
    }

    const refreshToken = authHeader.split(" ")[1];
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ error: "Invalid or expired refresh token" });
      }

      const { id, role } = decoded;

      let user;
      if (role === "doctor") {
        user = await Doctor.findById(id)
          .populate("specialityId")
          .populate({ path: "pendingConsultations", select: "status" })
          .populate({ path: "acceptedConsultations", select: "status" })
          .populate({ path: "ongoingConsultation", select: "status" })
          .populate({ path: "historyConsultations", select: "status" })
          .populate({ path: "notificationsRecieved", select: "title" });
      } else {
        user = await Patient.findById(id)
          .populate({ path: "historyConsultations", select: "status" })
          .populate({ path: "requestedConsultations", select: "status" })
          .populate({ path: "ongoingConsultation", select: "status" })
          .populate({ path: "acceptedConsultations", select: "status" })
          .populate({ path: "notificationsRecieved", select: "title" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { accessToken, refreshToken: newRefreshToken } =
        generateTokens(user);

      const userObject = user.toObject();
      delete userObject.password;

      return res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken,
        user: userObject,
        role,
      });
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: e.message || "Unexpected error during refresh" });
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
      fcmToken,
      otpToken,
      otpCode,
    } = req.body;
    const email1 = email.toLowerCase();

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
      fcmToken,
    });

    // First save the patient
    const savedPatient = await newPatient.save();

    // Then populate if needed (though for a new patient, these will likely be empty)
    const populatedPatient = await Patient.findById(savedPatient._id)
      .populate({
        path: "historyConsultations",
        select: "status",
      })
      .populate({
        path: "requestedConsultations",
        select: "status",
      })
      .populate({ path: "ongoingConsultation", select: "status" })
      .populate({ path: "acceptedConsultations", select: "status" })
      .populate({ path: "notificationsRecieved", select: "title" });

    if (fcmToken) {
      await Patient.updateOne(
        { _id: populatedPatient._id },
        { $set: { fcmToken } }
      );
    }

    const { accessToken, refreshToken } = generateTokens(populatedPatient);

    const patientObject = populatedPatient.toObject();
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
    const { email, password, fcmToken } = req.body;
    console.log("Email " + email);
    console.log("password " + password);
    console.log("fcmToken " + fcmToken);
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required!" });
    }

    const emailNormalized = email.toLowerCase().trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailNormalized)) {
      return res.status(400).json({ error: "Invalid email format!" });
    }

    // Check Patient first
    let user = await Patient.findOne({ email: emailNormalized })
      .populate({ path: "historyConsultations", select: "status" })
      .populate({ path: "requestedConsultations", select: "status" })
      .populate({ path: "ongoingConsultation", select: "status" })
      .populate({ path: "acceptedConsultations", select: "status" })
      .populate({ path: "notificationsRecieved", select: "title" });
    let role = "patient";

    // If not patient, check Doctor
    if (!user) {
      user = await Doctor.findOne({ email: emailNormalized })
        .populate("specialityId")
        .populate({ path: "pendingConsultations", select: "status" })
        .populate({ path: "acceptedConsultations", select: "status" })
        .populate({ path: "ongoingConsultation", select: "status" })
        .populate({ path: "historyConsultations", select: "status" })
        .populate({ path: "notificationsRecieved", select: "title" });
      role = "doctor";
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials!" });
    }

    if (fcmToken) {
      if (role === "patient") {
        await Patient.updateOne({ _id: user._id }, { $set: { fcmToken } });
      } else if (role === "doctor") {
        await Doctor.updateOne({ _id: user._id }, { $set: { fcmToken } });
      }
    }

    const { accessToken, refreshToken } = generateTokens(user);

    const userObject = user.toObject();
    delete userObject.password;

    res.status(200).json({
      message: "Login successful",
      [role]: userObject,
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
  const { idToken, phoneNumber, age, specialityId } = req.body;
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
      if (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const { id, role } = decoded;

      let user;
      if (role === "doctor") {
        user = await Doctor.findById(id)
          .populate("specialityId")
          .populate({
            path: "pendingConsultations",
            select: "status",
          })
          .populate({
            path: "acceptedConsultations",
            select: "status",
          })
          .populate({ path: "ongoingConsultation", select: "status" })
          .populate({ path: "historyConsultations", select: "status" })
          .populate({ path: "notificationsRecieved", select: "title" });

        if (!user) {
          return res.status(404).json({ error: "Doctor not found" });
        }

        const doctorObject = user.toObject();
        delete doctorObject.password;
        return res.status(200).json({
          message: "Token is valid",
          doctor: doctorObject,
          role,
        });
      } else if (role === "patient") {
        user = await Patient.findById(id)
          .populate({
            path: "historyConsultations",
            select: "status",
          })
          .populate({
            path: "requestedConsultations",
            select: "status",
          })
          .populate({ path: "ongoingConsultation", select: "status" })
          .populate({ path: "acceptedConsultations", select: "status" })
          .populate({ path: "notificationsRecieved", select: "title" });

        if (!user) {
          return res.status(404).json({ error: "Patient not found" });
        }

        const patientObject = user.toObject();
        delete patientObject.password;
        return res.status(200).json({
          message: "Token is valid",
          patient: patientObject,
          role,
        });
      } else {
        return res.status(400).json({ error: "Invalid user role" });
      }
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

router.post("/trigger-forget-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    let email1 = email.toLowerCase();
    let user = await Patient.findOne({ email: email1 }).exec();

    if (!user) {
      user = await Doctor.findOne({ email: email1 }).exec();
    }

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const apikey = process.env.BREVO_MAIL;
    const url = process.env.BREVO_URL;
    const resetLink = `https://estishara.com/resetpassword?email=${encodeURIComponent(
      email1
    )}`;
    const emailData = {
      sender: { name: "Estishara", email: "ka530893@gmail.com" },
      to: [{ email: email1 }],
      subject: "Reset Your Password",
      htmlContent: `
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">Click the link below to reset your password:</p>
    <br/>
    <a href="${resetLink}" style="font-family: Arial, sans-serif; font-size: 16px; color: #007bff; text-decoration: none; font-weight: bold;">Reset Your Password</a>
    <br/><br/>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">If you didn't request to change your account password, just ignore this email. Maybe someone entered your email by mistake.</p>
    <br/>
    <h3 style="font-family: Arial, sans-serif; font-size: 18px;">Stay safe out there!</h3>
    <h2 style="font-family: Arial, sans-serif; font-size: 22px;">Estishara Team</h2>
  `,
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
      return res.json({ message: "Email sent successfully" });
    } else {
      console.error("Failed to send email:", data);
      return res.status(500).json({ error: "Failed to send email" });
    }
  } catch (err) {
    console.error("Error in forget-password route:", err);
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
});

router.put("/forget-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    let email1 = email.toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    let user = await Patient.findOne({ email: email1 });

    if (user) {
      user.password = hashedPassword;
      await user.save();
      return res
        .status(200)
        .json({ message: "Patient password updated successfully" });
    }
    user = await Doctor.findOne({ email: email1 });
    if (user) {
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
