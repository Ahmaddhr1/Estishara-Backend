const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const authenticateToken = require("../utils/middleware");
const Doctor = require("../models/Doctor");
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

    const patients = await Patient.find(query)
      .populate({
        path: "requestedConsultations",
        select: "status",
      })
      .populate({
        path: "historyConsultations",
        select: "status",
      });

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
    const patient = await Patient.findById(req.params.id)
      .populate({
        path: "requestedConsultations",
        select: "status",
      })
      .populate({
        path: "historyConsultations",
        select: "status",
      });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(sanitizePatient(patient));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT (update) patient profile
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    if (requestingUserRole !== "admin" && requestingUserId !== req.params.id) {
      return res
        .status(403)
        .json({ error: "Forbidden: You can only update your own profile" });
    }

    await Patient.findByIdAndUpdate(req.params.id, req.body.patient, {
      new: true,
    });

    const updatedPatient = await Patient.findById(req.params.id)
      .populate({
        path: "requestedConsultations",
        select: "status",
      })
      .populate({
        path: "historyConsultations",
        select: "status",
      });
    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json({ patient: sanitizePatient(updatedPatient) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    if (requestingUserRole !== "admin" && requestingUserId !== req.params.id) {
      return res.status(403).json({
        error: "Forbidden: You are not allowed to delete this account",
      });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    await Doctor.updateMany(
      { recommendedBy: patient._id },
      { $pull: { recommendedBy: patient._id } }
    );

    await Patient.findByIdAndDelete(req.params.id);

    res.json({ message: "Patient deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET requested consultations for a patient
router.get("/getrc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id)
      .populate({
        path: "requestedConsultations",
        populate: {
          path: "doctorId",
          select: "name lastName profilePic email",
        },
      })
      .populate({
        path: "historyConsultations",
        select: "status",
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

router.get("/gethc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id)
      .populate({
        path: "historyConsultations",
        select: "status",
      })
      .populate({
        path: "requestedConsultations",
        select: "status",
      });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found!" });
    }

    res.status(200).json({ patient: sanitizePatient(patient) });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching history consultations for the patient.",
    });
  }
});

router.get("/recommended/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id)
      .populate({
        path: "recommendedDoctors",
        select: "name lastName email",
      })
      .populate({
        path: "requestedConsultations",
        select: "status",
      })
      .populate({
        path: "historyConsultations",
        select: "status",
      });
    if (!patient) {
      res.status(404).json({ error: "Patient not found!!" });
    }
    res.status(200).json({ patient: sanitizePatient(patient) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Error occured" });
  }
});

module.exports = router;
