// routes/chat.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Doctor = require("../models/Doctor");
const Speciality = require("../models/Speciality"); // Import Speciality model

const getSpecialityFromQuestion = (question) => {
  const lower = question.toLowerCase();
  if (lower.includes("heart") || lower.includes("chest pain"))
    return "Cardiology";
  if (lower.includes("skin") || lower.includes("rash")) return "Dermatology";
  if (lower.includes("bones") || lower.includes("joint")) return "Orthopedics";
  if (lower.includes("mental") || lower.includes("stress")) return "Psychiatry";
  return null;
};

router.post("/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) return res.status(400).json({ error: "Question is required" });

  try {
    // Call DeepSeek
    const aiResponse = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a medical assistant. Answer only medical-related questions and provide professional responses. Do not provide diagnoses.",
          },
          {
            role: "user",
            content: question,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiAnswer = aiResponse.data.choices[0].message.content;
    const specialityTitle = getSpecialityFromQuestion(question);
    if (specialityTitle) {
      // Find doctors matching the speciality title
      const speciality = await Speciality.findOne({ title: specialityTitle });
      const recommendedDoctors = speciality
        ? await Doctor.find({ specialityId: speciality._id })
        : [];

      res.json({
        answer: aiAnswer,
        recommendedDoctors,
      });
    } else {
      res.json({
        answer: aiAnswer,
        recommendedDoctors: [],
      });
    }
  } catch (error) {
    console.error("AI Error:", error.message);
    res.status(500).json({ error: "Something went wrong. Try again later." });
  }
});

module.exports = router;
