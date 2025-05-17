const express = require("express");
const Feedback = require("../models/Feedbacks");
const router = express.Router();

router.post("/", async (req, res) => {
  const { stars, feedback, doctor, patient } = req.body;
  const feedbackk = await new Feedback({ stars, feedback, doctor ,patient});
  res.status(201).json({ message: "Feedback was Created"});
});

router.get("/", async (req, res) => {
  const feedbacks = await Feedback.find({})
    .populate({
      path: "doctor",
      select: "email phoneNumber name lastName",
    })
    .populate({
      path: "patient",
      select: "email phoneNumber name lastName",
    });
  res.status(200).json(feedbacks);
});

module.exports = router;
