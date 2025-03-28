const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const Speciality = require("../models/Speciality");
const authenticateToken = require("../utils/middleware");

router.get("/", async (req, res) => {
  try {
    const doctors = await Doctor.find({
      isPendingDoctor: true,
    }).populate("specialityId");

    if (!doctors.length) {
      return res.status(404).json({ message: "Doctors not found" });
    }
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { name, respondTime, specialityId, consultationFees } = req.query;

    const query = {
      isPendingDoctor: false, // show only approved doctors
    };

    // Search by name (case-insensitive)
    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    // Filter by respondTime (less than or equal)
    if (respondTime) {
      query.respondTime = { $lte: parseInt(respondTime) };
    }

    // Filter by consultationFees (less than or equal)
    if (consultationFees) {
      query.consultationFees = { $lte: parseInt(consultationFees) };
    }

    // Filter by specialityId (exact match)
    if (specialityId) {
      query.specialityId = specialityId;
    }

    const doctors = await Doctor.find(query).populate("specialityId");

    if (!doctors.length) {
      return res.status(404).json({ message: "No matching doctors found" });
    }

    res.json(doctors);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      "specialityId"
    );
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

router.delete("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    const speciality = doctor.specialityId;
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
