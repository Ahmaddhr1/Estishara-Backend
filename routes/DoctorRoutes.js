const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
router.get("/", (req, res) => {
  res.send("Hello from the Doctor route");
});

module.exports = router;
