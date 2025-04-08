const express = require("express");
const router = express.Router();
const Speciality = require("../models/Speciality");
const Doctor = require("../models/Doctor");
const authenticateToken = require("../utils/middleware");

// GET all specialities (Accessible by anyone)
router.get("/", async (req, res) => {
  try {
    const { title } = req.query;
    let query = {};

    if (title) {
      query.title = { $regex: new RegExp(title, "i") };
    }

    const specialities = await Speciality.find(query);
    if (!specialities.length) {
      return res.status(404).json({ message: "No specialities found" });
    }
    res.json(specialities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET doctors by speciality ID (Accessible by anyone)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const doctors = await Doctor.find({ isPendingDoctor: false, specialityId: id }).populate(
      "specialityId",
      "name"
    );

    if (!doctors) {
      return res.status(404).json({ message: "No doctors found" });
    }
    res.status(200).json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create a speciality (Only accessible by admins)
router.post("/", authenticateToken, async (req, res) => {
  const { title, logo, description } = req.body;

  // Check if the user is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Only admins can create specialities" });
  }

  if (!title || !logo || !description) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    const existingSpeciality = await Speciality.findOne({ title });
    if (existingSpeciality) {
      return res.status(400).json({ message: "Speciality with this title already exists" });
    }
    const speciality = new Speciality(req.body);
    await speciality.save();
    res.status(201).json({
      message: "Speciality created successfully",
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update a speciality (Only accessible by admins)
router.put("/:id", authenticateToken, async (req, res) => {
  const { title, logo, description } = req.body;

  // Check if the user is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Only admins can update specialities" });
  }

  try {
    const isSpecialityExists = await Speciality.findById(req.params.id);
    if (!isSpecialityExists) {
      return res.status(404).json({ message: "Speciality not found" });
    }
    isSpecialityExists.title = title;
    isSpecialityExists.logo = logo;
    isSpecialityExists.description = description;
    await isSpecialityExists.save();
    res.json({ message: "Speciality updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a speciality (Only accessible by admins)
router.delete("/:id", authenticateToken, async (req, res) => {
  // Check if the user is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Only admins can delete specialities" });
  }

  try {
    const isSpecialityExists = await Speciality.findById(req.params.id);
    if (!isSpecialityExists) {
      return res.status(404).json({ message: "Speciality not found" });
    }
    const speciality = await Speciality.findByIdAndDelete(req.params.id);
    if (!speciality) {
      return res.status(404).json({ message: "Speciality not found" });
    }
    res.json({ message: "Speciality deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
