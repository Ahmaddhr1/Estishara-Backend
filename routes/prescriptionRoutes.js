const express = require("express");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Prescription = require("../models/Prescription");
const router = express.Router();

// Route to get all prescriptions sent (for Doctor) or received (for Patient)
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    
    const doctor = await Doctor.findById(id).populate("prescriptionsSent");
    const patient = await Patient.findById(id).populate("prescriptionsRecieved");

    if (doctor) {
      return res.status(200).json({
        message: "Doctor found",
        prescriptionsSent: doctor.prescriptionsSent,
      });
    }

    if (patient) {
      return res.status(200).json({
        message: "Patient found",
        prescriptionsRecieved: patient.prescriptionsRecieved,
      });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to get detailed information about a specific prescription
router.get("/prescription/:prescriptionId", async (req, res) => {
  const { prescriptionId } = req.params;

  try {
    // Find the prescription by ID and populate related fields (Doctor and Patient)
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name email") // Populate patient details (name and email)
      .populate("doctor", "name email"); // Populate doctor details (name and email)

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    return res.status(200).json({
      message: "Prescription details",
      prescription,
    });
  } catch (error) {
    console.error("Error fetching prescription details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to create a new prescription
router.post("/", async (req, res) => {
  try {
    const {
      patientId,
      medicationName,
      strength,
      form,
      direction,
      quantity,
      diagnosis,
      doctorId,
    } = req.body;

    if (
      !patientId ||
      !medicationName ||
      !strength ||
      !form ||
      !direction ||
      !quantity ||
      !diagnosis ||
      !doctorId
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create the new prescription document
    const newPrescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      medicationName,
      strength,
      form,
      direction,
      quantity,
      diagnosis,
    });
    await newPrescription.save();

    const patient = await Patient.findById(patientId);
    const doctor = await Doctor.findById(doctorId);

    if (!patient || !doctor) {
      return res.status(404).json({ message: "Patient or Doctor not found" });
    }

    patient.prescriptionsRecieved.push(newPrescription._id);
    await patient.save();

    doctor.prescriptionsSent.push(newPrescription._id);
    await doctor.save();

    res.status(201).json({
      message: "Prescription created successfully",
      prescription: newPrescription,
    });
  } catch (error) {
    console.error("Error creating prescription:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
