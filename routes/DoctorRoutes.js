const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const Speciality = require("../models/Speciality");
const authenticateToken  = require("../utils/middleware");


router.get("/", async (req, res) => {
  try {
    const query = {};
    for (const key in req.query) {
      query[key] = { $regex: new RegExp(req.query[key], "i") };
    }
    const doctors = await Doctor.find({
      isPendingDoctor: true && query,
    }).populate("specialties");
    if (!doctors.length) {
      return res.status(404).json({ message: "Doctors not found" });
    }
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("specialties");
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authenticateToken , async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    const speciality = doctor.speciality;
    if (speciality) {
      await Speciality.findByIdAndUpdate(speciality, {
        $pull: { doctors: doctor._id },
      });
    }
    await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json({ message: "Doctor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// router.post('/',  async(req, res) => {
//   //drop all database collections
//    await Doctor.deleteMany({});
//    res.send("Doctors were deleted") ;

// })

module.exports = router;
