const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const authenticateToken = require("../utils/middleware");
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    // Only allow admins to access this route
    if (role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: You are not authorized to view this resource" });
    }

    const query = {};
    for (const key in req.query) {
      query[key] = { $regex: new RegExp(req.query[key], "i") };
    }

    const patients = await Patient.find(query);

    if (!patients.length) {
      return res.status(404).json({ message: "Patients not found" });
    }

    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/:id', async (req,res) => {
  try {
    const patient = await Patient.findById(req.params.id)
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Only the patient or admin can update this patient
    if (requestingUserRole !== 'admin' && requestingUserId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden: You can only update your own profile" });
    }

    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE patient (allowed for self or admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Only the patient or admin can delete this patient
    if (requestingUserRole !== 'admin' && requestingUserId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden: You are not allowed to delete this account" });
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


module.exports = router;