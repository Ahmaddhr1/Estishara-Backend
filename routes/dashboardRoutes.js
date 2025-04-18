const router = require("express").Router();
const Consultation = require("../models/Consultation");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Speciality = require("../models/Speciality");

const getStartOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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
    const startOfYesterday = getStartOfYesterday();
    const startOfWeek = getStartOfWeek();
    const startOfLastWeek = getStartOfLastWeek();

    const [
      consultsToday,
      consultsYesterday,
      consultsWeek,
      consultsLastWeek,
      totalConsults
    ] = await Promise.all([
      Consultation.countDocuments({ createdAt: { $gte: startOfDay } }),
      Consultation.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfDay } }),
      Consultation.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Consultation.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfWeek } }),
      Consultation.countDocuments()
    ]);

    const [
      patientsToday,
      patientsYesterday,
      patientsWeek,
      patientsLastWeek,
      totalPatients
    ] = await Promise.all([
      Patient.countDocuments({ createdAt: { $gte: startOfDay } }),
      Patient.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfDay } }),
      Patient.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Patient.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfWeek } }),
      Patient.countDocuments()
    ]);

    const [
      doctorsToday,
      doctorsYesterday,
      doctorsWeek,
      doctorsLastWeek,
      totalDoctors,
      pendingDoctors
    ] = await Promise.all([
      Doctor.countDocuments({ createdAt: { $gte: startOfDay } }),
      Doctor.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfDay } }),
      Doctor.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Doctor.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfWeek } }),
      Doctor.countDocuments(),
      Doctor.countDocuments({ isPendingDoctor: true })
    ]);

    const specialities = await Speciality.find().populate("doctors");
    const specialityDistribution = specialities.map((s) => ({
      title: s.title,
      count: s.doctors?.length || 0,
    }));

    res.json({
      consultations: {
        today: consultsToday,
        yesterday: consultsYesterday,
        week: consultsWeek,
        lastWeek: consultsLastWeek,
        total: totalConsults,
      },
      patients: {
        today: patientsToday,
        yesterday: patientsYesterday,
        week: patientsWeek,
        lastWeek: patientsLastWeek,
        total: totalPatients,
      },
      doctors: {
        today: doctorsToday,
        yesterday: doctorsYesterday,
        week: doctorsWeek,
        lastWeek: doctorsLastWeek,
        total: totalDoctors,
        pending: pendingDoctors,
      },
      specialityDistribution,
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
