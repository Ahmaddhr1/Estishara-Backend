const express = require("express");
const app = express();
const cors = require("cors");
const doctorRoutes = require("../routes/DoctorRoutes.js");
const authRoutes = require("../routes/authRoutes.js");
const specialityRoutes = require("../routes/specialityRoutes.js");
const patientRoutes = require("../routes/patientRoutes.js");
const adminRoutes = require("../routes/adminRoutes.js");
const bannerRoutes = require("../routes/bannerRoutes.js");
const consultationRoutes = require("../routes/consultationRoutes.js")
const dashboardRoutes = require("../routes/dashboardRoutes.js");
const notificationRoutes =require("../routes/notificationRoutes.js")
const aiRoutes = require("../routes/adminRoutes.js");
const connectDB = require("../config/database.js");

try {
  connectDB();
} catch (e) {
  console.error(e);
}

app.use(express.json());
app.use(cors());
app.use("/api/doctor", doctorRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/speciality", specialityRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/consultation",consultationRoutes)
app.use("/api/dashboard",dashboardRoutes);
app.use("/api/notification",notificationRoutes)
app.use("/api/ai",aiRoutes)


app.get("/", (req, res) => {
  res.send("Helllooo estisharaaaaaaaaaaaaa");
});

app.get("/ahmad", (req, res) => {
  res.send("Helllooo ahmaddd");
});

app.get("*", (req, res) => {
  res.status(404).json({ message: "Page not found" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
