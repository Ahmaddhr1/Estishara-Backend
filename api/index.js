const express = require("express");
const app = express();

const cors = require("cors");

const User = require("../models/Patient.js");


const doctorRoutes = require('../routes/DoctorRoutes.js');

app.use(express.json());
app.use(cors());
app.use('/doctor', doctorRoutes);

app.get("/", (req, res) => {
  res.send("Helllooo estisharaaaaaaaaaaaaa");
});

app.get("/", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/ahmad", (req, res) => {
  res.send("Helllooo ahmaddd");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
