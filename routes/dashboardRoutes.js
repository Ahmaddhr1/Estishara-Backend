const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Consultation = require("../models/Consultation");
const Speciality = require("../models/Speciality");

const getStartOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay(); // Sunday - Saturday: 0 - 6
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

router.get("/summary", async (req, res) => {
    try {
      console.log("📊 Dashboard summary endpoint hit");
  
      const startOfDay = getStartOfDay();
      const startOfWeek = getStartOfWeek();
  
      console.log("🕒 Start of Day:", startOfDay);
      console.log("📅 Start of Week:", startOfWeek);
  
      const consultsToday = await Consultation.countDocuments({ createdAt: { $gte: startOfDay } });
      const consultsWeek = await Consultation.countDocuments({ createdAt: { $gte: startOfWeek } });
      const totalConsults = await Consultation.countDocuments({});
      console.log("✅ Consultations counted");
  
      const patientsWeek = await Patient.countDocuments({ createdAt: { $gte: startOfWeek } });
      const totalPatients = await Patient.countDocuments({});
      console.log("✅ Patients counted");
  
      const doctorsWeek = await Doctor.countDocuments({ createdAt: { $gte: startOfWeek } });
      const totalDoctors = await Doctor.countDocuments({});
      const pendingDoctors = await Doctor.countDocuments({ isPendingDoctor: true });
      console.log("✅ Doctors counted");
  
      const specialities = await Speciality.find().populate("doctors");
      const specialityDistribution = specialities.map((s) => ({
        title: s.title,
        count: s.doctors?.length || 0,
      }));
      console.log("✅ Specialities fetched and processed");
  
      const response = {
        consultations: {
          today: consultsToday,
          week: consultsWeek,
          total: totalConsults,
        },
        patients: {
          week: patientsWeek,
          total: totalPatients,
        },
        doctors: {
          week: doctorsWeek,
          total: totalDoctors,
          pending: pendingDoctors,
        },
        specialityDistribution,
      };
  
      console.log("📦 Final response:", response);
  
      res.json(response);
    } catch (error) {
      console.error("❌ Error in dashboard summary:", error);
      res.status(500).json({
        message: "Failed to fetch dashboard data",
        error: error.message,
      });
    }
  });
  

module.exports = router;