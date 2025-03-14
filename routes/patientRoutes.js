const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");

router.get("/", async (req, res) => {
  try {
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

router.put('/:id', async (req,res)=> {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req,res) => {
  try {
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