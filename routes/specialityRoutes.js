const express = require("express");
const router = express.Router();
const Speciality = require("../models/Speciality");
const Doctor = require("../models/Doctor");

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

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const doctors = await Doctor.find({ isPendingDoctor:false ,specialityId: id }).populate(
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

router.post("/", async (req, res) => {
  try {
    const { title, logo, description } = req.body;
    if (!title || !logo || !description) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const existingSpeciality = await Speciality.findOne({ title });
    if (existingSpeciality) {
      return res
        .status(400)
        .json({ message: "Speciality with this title already exists" });
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

router.put("/:id", async (req, res) => {
  try {
    const { title, logo, description } = req.body;

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

router.delete("/:id", async (req, res) => {
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
