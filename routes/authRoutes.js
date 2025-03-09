const express = require("express");
const router = express.Router();
const admin = require("../config/firebaseConfig");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND);
router.use(express.json());

// Send OTP email
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const actionCodeSettings = {
      url: "https://estishara-6d1e0.web.app",
      android: {
        packageName: "com.example.estishara",
        installApp: true,
        minimumVersion: "1",
      },
      handleCodeInApp: true,
    };

    const otpLink = await admin
      .auth()
      .generateSignInWithEmailLink(email, actionCodeSettings);

      await resend.emails.send({
        from:"onboarding@resend.dev",
        to: email,
        subject: "Your Estishara OTP Code",
        html: `<p>Click this link to verify your email: <a href="${otpLink}">${otpLink}</a></p>`,
      });

    res.json({ message: "OTP email sent successfully", otpLink });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message, message: "Failed to send OTP!" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otpToken } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(otpToken);
    if (!decodedToken || decodedToken.email !== email) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message, message: "OTP verification failed!" });
  }
});

module.exports = router;
