const express = require("express");
const app = express();
const cors = require("cors");
const User = require("../models/Patient.js");
const doctorRoutes = require('../routes/DoctorRoutes.js');
const connectDB = require("../config/database.js");

connectDB()

app.use(express.json());
app.use(cors());
app.use('/api/doctor', doctorRoutes);


app.get("/", (req, res) => {
  res.send("Helllooo estisharaaaaaaaaaaaaa");
});

app.get("/ahmad", (req, res) => {
  res.send("Helllooo ahmaddd");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

