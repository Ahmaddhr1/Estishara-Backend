const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const Speciality = require("../models/Speciality");
const Patient = require("../models/Patient");
const authenticateToken = require("../utils/middleware");
const mongoose = require("mongoose");
const { sanitizeDoctor, sanitizeDoctors } = require("../utils/sanitize");

// Utility to remove password from doctor object

router.get("/", async (req, res) => {
  try {
    const doctors = await Doctor.find({ isPendingDoctor: false })
      .populate("specialityId")
      .populate({
        path: "pendingConsultations",
        select: "status",
      })
      .populate({
        path: "acceptedConsultations",
        select: "status",
      });

    if (!doctors || doctors.length === 0) {
      return res.status(200).json({ message: "No doctors available" });
    }

    res.status(200).json(sanitizeDoctors(doctors));
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while fetching doctors",
      error: err.message,
    });
  }
});

router.get("/search-filter", authenticateToken, async (req, res) => {
  try {
    const { responseTime, specialityId, minFee, maxFee } = req.query;

    const query = { isPendingDoctor: false };

    if (responseTime) query.responseTime = { $lte: parseInt(responseTime) };
    if (specialityId) query.specialityId = specialityId;
    if (minFee || maxFee) {
      query.consultationFee = {};
      if (minFee) query.consultationFee.$gte = parseFloat(minFee);
      if (maxFee) query.consultationFee.$lte = parseFloat(maxFee);
    }

    const doctors = await Doctor.find(query)
      .populate("specialityId", "title")
      .populate({
        path: "pendingConsultations",
        select: "status",
      })
      .populate({
        path: "acceptedConsultations",
        select: "status",
      });

    const total = await Doctor.countDocuments(query);

    if (!doctors.length) {
      return res.status(404).json({ message: "No doctors matched the filter" });
    }
    res.json({
      total,
      doctors: sanitizeDoctors(doctors),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/pending", async (req, res) => {
  try {
    const doctors = await Doctor.find({ isPendingDoctor: true })
      .populate("specialityId", "title")
      .populate({
        path: "pendingConsultations",
        select: "status",
      })
      .populate({
        path: "acceptedConsultations",
        select: "status",
      });
    res.status(200).json(sanitizeDoctors(doctors));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ message: "Name is required for basic search" });
    }
    const query = {
      name: { $regex: name, $options: "i" },
      isPendingDoctor: false,
    };
    const doctors = await Doctor.find(query)
      .populate("specialityId", "title")
      .populate({
        path: "pendingConsultations",
        select: "status",
      })
      .populate({
        path: "acceptedConsultations",
        select: "status",
      });

    const total = await Doctor.countDocuments(query);

    res.json({
      total,
      doctors: sanitizeDoctors(doctors),
    });
  } catch (err) {
    console.error("Basic search error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/topten", async (req, res) => {
  try {
    const doctors = await Doctor.aggregate([
      { $match: { isPendingDoctor: false } },
      { $addFields: { nbRecommendations: { $size: "$recommendedBy" } } },
      { $sort: { nbRecommendations: -1 } },
      { $limit: 10 },
      { $project: { password: 0 } },
    ]);

    const populatedDoctors = await Doctor.populate(doctors, {
      path: "specialityId",
      select: "title",
    })
      .populate({
        path: "pendingConsultations",
        select: "status",
      })
      .populate({
        path: "acceptedConsultations",
        select: "status",
      });

    res.status(200).json(populatedDoctors);
  } catch (error) {
    console.error("Error fetching top doctors:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate("specialityId")
      .populate({
        path: "pendingConsultations",
        select: "status",
      })
      .populate({
        path: "acceptedConsultations",
        select: "status",
      });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json(sanitizeDoctor(doctor));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;

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
    await savedDoctor
      .populate("specialityId", "title")
      .populate({
        path: "pendingConsultations",
        select: "status",
      })
      .populate({
        path: "acceptedConsultations",
        select: "status",
      });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json({
      doctor: sanitizeDoctor(savedDoctor),
      message: "Doctor updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;

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
    await Patient.updateMany(
      { recommendedDoctors: doctor._id },
      { $pull: { recommendedDoctors: doctor._id } }
    );
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: "Doctor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
      doctor.nbRecommendation = Math.max(0, (doctor.nbRecommendation || 1) - 1);
      doctor.recommendedBy = doctor.recommendedBy.filter(
        (recommenderId) => recommenderId.toString() !== patientId
      );

      patient.recommendedDoctors = patient.recommendedDoctors.filter(
        (dId) => dId.toString() !== doctorId
      );
    } else {
      doctor.nbRecommendation = (doctor.nbRecommendation || 0) + 1;
      doctor.recommendedBy.push(patientId);
      patient.recommendedDoctors.push(doctorId);
    }

    await doctor.save();
    await patient.save();

    res.status(200).json({
      message: hasRecommended
        ? "Recommendation removed."
        : "Recommendation added.",
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/getpc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id)
      .populate({
        path: "pendingConsultations",
        populate: {
          path: "patientId",
          select: "name lastName profilePic email",
        },
      })
      .populate("specialityId", "title")
      .populate({
        path: "acceptedConsultations",
        select: "status",
      });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found!" });
    }

    res.status(200).json({ doctor: sanitizeDoctor(doctor) });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching consultations for the doctor." });
  }
});

router.get("/getac/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id)
      .populate({
        path: "acceptedConsultations",
        populate: {
          path: "patientId",
          select: "name lastName profilePic email",
        },
      })
      .populate("specialityId", "title")
      .populate({
        path: "requestedConsultations",
        select: "status",
      });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found!" });
    }

    res.status(200).json({ doctor: sanitizeDoctor(doctor) });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching accepted consultations for the doctor.",
    });
  }
});

module.exports = router;
