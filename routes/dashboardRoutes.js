const router = require("express").Router();
const Consultation = require("../models/Consultation");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Speciality = require("../models/Speciality");
const PlatformStats = require("../models/PlatformStats"); 

// Helper functions to get the start of the day and week
const getStartOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day == 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfLastWeek = () => {
  const d = getStartOfWeek();
  d.setDate(d.getDate() - 7); 
  return d;
};

router.get("/summary", async (req, res) => {
  try {
    const startOfDay = getStartOfDay();
    const startOfLastWeek = getStartOfLastWeek();
    const [consultsToday, consultsLastWeek, totalConsults] = await Promise.all([
      Consultation.countDocuments({ createdAt: { $gte: startOfDay } }),
      Consultation.countDocuments({ createdAt: { $gte: startOfLastWeek } }),
      Consultation.countDocuments(),
    ]);

    const [patientsToday, patientsLastWeek, totalPatients] = await Promise.all([
      Patient.countDocuments({ createdAt: { $gte: startOfDay } }),
      Patient.countDocuments({ createdAt: { $gte: startOfLastWeek } }),
      Patient.countDocuments(),
    ]);

    const [doctorsToday, doctorsLastWeek, totalDoctors, pendingDoctors] =
      await Promise.all([
        Doctor.countDocuments({ createdAt: { $gte: startOfDay } }),
        Doctor.countDocuments({ createdAt: { $gte: startOfLastWeek } }),
        Doctor.countDocuments(),
        Doctor.countDocuments({ isPendingDoctor: true }),
      ]);

    const specialities = await Speciality.find().populate("doctors");
    const specialityDistribution = specialities.map((s) => ({
      title: s.title,
      count: s.doctors?.length || 0,
    }));

    // Fetch Platform Stats
    const platformStats = await PlatformStats.findOne().sort({ createdAt: -1 }); // Get the latest platform stats

    res.json({
      consultations: {
        today: consultsToday,
        lastWeek: consultsLastWeek,
        total: totalConsults,
      },
      patients: {
        today: patientsToday,
        lastWeek: patientsLastWeek,
        total: totalPatients,
      },
      doctors: {
        today: doctorsToday,
        lastWeek: doctorsLastWeek,
        total: totalDoctors,
        pending: pendingDoctors,
      },
      specialityDistribution,
      platformStats: {
        totalPlatformCut: platformStats ? platformStats.totalPlatformCut : 0,
        totalTransactions: platformStats ? platformStats.totalTransactions : 0,
      },
    });
  } catch (error) {
    console.error("❌ Dashboard summary error:", error);
    res.status(500).json({
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
});

module.exports = router;
