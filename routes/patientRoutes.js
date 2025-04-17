const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const authenticateToken = require("../utils/middleware");

// Utility functions
function sanitizePatient(patient) {
  const pat = patient.toObject();
  delete pat.password;
  return pat;
}

function sanitizePatients(patients) {
  return patients.map(sanitizePatient);
}

// GET all patients (admin only)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to view this resource",
      });
    }

    const query = {};
    for (const key in req.query) {
      query[key] = { $regex: new RegExp(req.query[key], "i") };
    }

    const patients = await Patient.find(query);

    if (!patients.length) {
      return res.status(404).json({ message: "Patients not found" });
    }

    res.json(sanitizePatients(patients));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single patient by ID
router.get("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(sanitizePatient(patient));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT (update) patient profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    if (requestingUserRole !== 'admin' && requestingUserId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden: You can only update your own profile" });
    }

    await Patient.findByIdAndUpdate(req.params.id, req.body.patient, { new: true });

    const updatedPatient = await Patient.findById(req.params.id); 
    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json({ patient: sanitizePatient(updatedPatient) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE patient
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    if (requestingUserRole !== "admin" && requestingUserId !== req.params.id) {
      return res.status(403).json({
        error: "Forbidden: You are not allowed to delete this account",
      });
    }

    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json({ message: "Patient deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET requested consultations for a patient
router.get("/getrc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id).populate({
      path: "requestedConsultations",
      populate: {
        path: "doctorId",
        select: "name lastName profilePic email",
      },
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found!" });
    }

    res.status(200).json({ patient: sanitizePatient(patient) });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching consultations for the patient." });
  }
});

module.exports = router;
