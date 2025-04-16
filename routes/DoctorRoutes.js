const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const Speciality = require("../models/Speciality");
const authenticateToken = require("../utils/middleware");

router.get("/", async (req, res) => {
  try {
    const doctors = await Doctor.find({ isPendingDoctor: false })
      .populate("specialityId")
      .exec();

    if (!doctors || doctors.length === 0) {
      return res.status(200).json({ message: "No doctors available" });
    }

    res.status(200).json(doctors);
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({
      message: "An error occurred while fetching doctors",
      error: err.message,
    });
  }
});
router.get("/search-filter", authenticateToken, async (req, res) => {
  try {
    const { name, responseTime, specialityId, minFee, maxFee } = req.query;

    const query = {};

    if (name) {
      query.name = { $regex: new RegExp(name, "i") };
    }

    // Response time (<=)
    if (responseTime) {
      query.responseTime = { $lte: parseInt(responseTime) };
    }

    // Match by speciality ID
    if (specialityId) {
      query.specialityId = specialityId;
    }

    // Consultation fee (price) range
    if (minFee || maxFee) {
      query.consultationFee = {};
      if (minFee) query.consultationFee.$gte = parseFloat(minFee);
      if (maxFee) query.consultationFee.$lte = parseFloat(maxFee);
    }

    const doctors = await Doctor.find(query).populate("specialityId");

    if (!doctors.length) {
      return res.status(404).json({ message: "No doctors matched the filter" });
    }

    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/pending", async (req, res) => {
  try {
    const doctors = await Doctor.find({
      isPendingDoctor: true,
    }).populate("specialityId", "title");

    res.status(200).json(doctors);
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
    res.status(500).json({ error: err.message });
  }
});

router.get("/topten", async (req, res) => {
  try {
    const doctors = await Doctor.aggregate([
      {
        $match: {
          isPendingDoctor: false,
        },
      },
      {
        $addFields: {
          nbRecommendations: { $size: "$recommendedBy" },
        },
      },
      {
        $sort: {
          nbRecommendations: -1,
        },
      },
      {
        $limit: 10,
      },
    ]);

    // Manually populate `specialityId`
    const populatedDoctors = await Doctor.populate(doctors, {
      path: "specialityId",
      select: "title",
    });

    return res.status(200).json(populatedDoctors);
  } catch (error) {
    console.error("Error fetching top doctors:", error);
    return res.status(500).json({ message: error.message });
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

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;

    console.log(requestingUserId);

    // Check if the user is the doctor themselves or an admin
    if (requestingUserRole !== "admin" && requestingUserId !== req.params.id) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to update this profile",
      });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body.doctor,
      { new: true }
    );
    const savedDoctor = await doctor.save();
    await savedDoctor.populate("specialityId", "title");
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    const docObj = savedDoctor.toObject();
    delete docObj.password;
    res.json({ doctor: docObj, message: "Doctor updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE doctor (Only admins or the signed-in doctor can delete)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;

    // Check if the user is the doctor themselves or an admin
    if (requestingUserRole !== "admin" && requestingUserId !== req.params.id) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to delete this profile",
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const speciality = doctor.specialityId;
    if (speciality) {
      await Speciality.findByIdAndUpdate(speciality, {
        $pull: { doctors: doctor._id },
      });
    }

    await Doctor.findByIdAndDelete(req.params.id);
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

router.put("/approve/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;

    if (requestingUserRole !== "admin" && requestingUserId !== req.params.id) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to delete this profile",
      });
    }
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, {
      isPendingDoctor: false,
    });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json({ message: "The doctor is now available On the platform!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/addrecommendation/:id", authenticateToken, async (req, res) => {
  try {
    const requestUserRole = req.user.role;
    const patientId = req.user.id;

    if (requestUserRole !== "patient") {
      return res.status(403).json({ message: "You are not authorized" });
    }

    const { id: doctorId } = req.params;
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctor ID format" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const hasRecommended = doctor.recommendedBy?.includes(patientId);

    if (hasRecommended) {
      // 🔻 Remove recommendation
      doctor.nbRecommendation = Math.max(0, (doctor.nbRecommendation || 1) - 1);
      doctor.recommendedBy = doctor.recommendedBy.filter(
        (recommenderId) => recommenderId.toString() !== patientId
      );

      patient.recommendedDoctors = patient.recommendedDoctors.filter(
        (dId) => dId.toString() !== doctorId
      );

      await doctor.save();
      await patient.save();

      return res.status(200).json({ message: "Recommendation removed." });
    } else {
      doctor.nbRecommendation = (doctor.nbRecommendation || 0) + 1;
      doctor.recommendedBy.push(patientId);
      patient.recommendedDoctors.push(doctorId);

      await doctor.save();
      await patient.save();

      return res.status(200).json({ message: "Recommendation added." });
    }
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});




router.get("/getrc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id).populate({
      path: "pendingConsultations",
      populate: {
        path: "patientId",
        select: "name lastName profilePic email",
      },
    });
    if (!doctor) {
      return res.status(404).json({ message: "doctor not found!" });
    }
    res.status(200).json({ doctor });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching consultations for the doctor." });
  }
});

module.exports = router;
