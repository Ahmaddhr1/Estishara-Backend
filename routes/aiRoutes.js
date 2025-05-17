const express = require("express");
const router = express.Router();
const axios = require("axios");
const Doctor = require("../models/Doctor");
const Speciality = require("../models/Speciality");

const getResponseFromGemini = async (prompt) => {
  try {
    const aiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responseText =
      aiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return responseText || null;
  } catch (error) {
    console.error(
      "Gemini AI Error:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};

const isMedicalQuestion = async (question) => {
  const prompt = `Determine if the following question is strictly related to medical or health topics. 
  Respond ONLY with "YES" if it's medical/health-related, or "NO" if it's not.

  Question: ${question}
  
  Answer:`;

  const response = await getResponseFromGemini(prompt);
  return response?.trim().toUpperCase() === "YES";
};

const getSpecialityFromQuestion = async (question) => {
  const specialites = await Speciality.find({});
  if (!specialites) {
    return "Specialites Not Found!";
  }
  const prompt = `Analyze this medical question and respond with ONLY the most relevant medical specialty title from this exact list:\n
  ${specialites.map((speciality) => `- ${speciality.title}`).join("\n")}\n
  Important: Return ONLY the exact specialty title from the list above.\n
  Question: ${question}\n
  Specialty:`;

  const response = await getResponseFromGemini(prompt);
  return response?.trim();
};

router.post("/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) return res.status(400).json({ error: "Question is required" });

  try {
    const isMedical = await isMedicalQuestion(question);
    if (!isMedical) {
      return res.status(400).json({
        error: "This service only answers medical and health-related questions",
        answer: null,
        recommendedDoctors: [],
      });
    }

    const medicalPrompt = `As a board-certified medical professional, provide a concise and accurate answer to this health question:
    ${question}`;
    const answer = await getResponseFromGemini(medicalPrompt);
    if (!answer) {
      return res.status(500).json({ error: "AI processing failed." });
    }

    const specialityTitle = await getSpecialityFromQuestion(question);
    let recommendedDoctors = [];
    if (specialityTitle) {
      const speciality = await Speciality.findOne({
        title: { $regex: new RegExp(`^${specialityTitle}$`, "i") },
      });

      if (speciality) {
        recommendedDoctors = await Doctor.find({
          specialityId: speciality._id,
          isPendingDoctor: false,
        })
          .limit(5)
          .populate("specialityId", "title")
          .select("-password -notificationsRecieved -prescriptionsSent -pendingConsultations -acceptedConsultations -historyConsultations -ongoingConsultation")
          
      }
    }

    return res.json({
      answer,
      recommendedDoctors,
      specialityMatched: specialityTitle || "General",
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Something went wrong. Try again later." });
  }
});

module.exports = router;
