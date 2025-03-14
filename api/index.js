const express = require("express");
const app = express();
const cors = require("cors");
const doctorRoutes = require("../routes/DoctorRoutes.js");
const authRoutes = require("../routes/authRoutes.js");
const specialityRoutes = require("../routes/specialityRoutes.js");
const connectDB = require("../config/database.js");

try {
  connectDB();
}catch(e) {
  console.error(e);
}

app.use(express.json());
app.use(cors());
app.use("/api/doctor", doctorRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/speciality", specialityRoutes);

app.get("/", (req, res) => {
  res.send("Helllooo estisharaaaaaaaaaaaaa");
});

app.get("/ahmad", (req, res) => {
  res.send("Helllooo ahmaddd");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
