const express = require("express");
const Consultation = require("../models/Consultation");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const { app } = require("firebase-admin");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { patientId, doctorId, status } = req.body;

    // Create new consultation
    const consultation = new Consultation({
      patientId,
      doctorId,
      status: status || "requested",
      duration,
    });

    await consultation.save();

    const patient = await Patient.findById(patientId);
    patient.requestedConsultations.push(consultation._id);
    await patient.save();


    const doctor = await Doctor.findById(doctorId);
    doctor.pendingConsultations.push(consultation._id);
    await doctor.save();

    res.status(201).json({ message: "Consultation created", consultation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating consultation" });
  }
});



module.exports = router;
