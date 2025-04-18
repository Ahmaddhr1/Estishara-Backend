const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const Consultation = require("../models/Consultation");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const authenticateToken = require("../utils/middleware");

dotenv.config();
const router = express.Router();

// Create consultation
router.post("/request", async (req, res) => {
  try {
    const { patientId, doctorId } = req.body;

    const consultation = new Consultation({
      patientId,
      doctorId,
      status: "requested",
    });
    await consultation.save();

    const patient = await Patient.findById(patientId);
    const doctor = await Doctor.findById(doctorId);

    if (patient) {
      patient.requestedConsultations.push(consultation._id);
      await patient.save();
    }

    if (doctor) {
      doctor.pendingConsultations.push(consultation._id);
      await doctor.save();
    }

    res.status(201).json({ message: "Consultation created", consultation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating consultation" });
  }
});

// Delete consultation
router.delete("/requested/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    if (consultation.doctorId.toString() !== doctorId) {
      return res
        .status(403)
        .json({ message: "Forbidden: Unauthorized access" });
    }

    await Patient.findByIdAndUpdate(consultation.patientId, {
      $pull: { requestedConsultations: id },
    });

    await Doctor.findByIdAndUpdate(consultation.doctorId, {
      $pull: { pendingConsultations: id },
    });

    await Consultation.findByIdAndDelete(id);

    res.status(200).json({ message: "Consultation deleted successfully" });
  } catch (error) {
    console.error("Error deleting consultation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Accept consultation (doctor confirms, waiting for payment)
router.put("/accept/:consultationId",  /*authenticateToken ,*/ async (req, res) => {
  try {
    const { consultationId } = req.params;
    const doctorId = req.user.id;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    // if (consultation.doctorId.toString() !== doctorId) {
    //   return res
    //     .status(403)
    //     .json({ message: "Forbidden: Not your consultation" });
    // }

    consultation.status = "accepted";
    await consultation.save();

    res.status(200).json({
      message: "Consultation accepted. Waiting for patient payment.",
      consultation,
    });
  } catch (error) {
    console.error("Error in /accept:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Finalize payment (confirmed by doctor)
router.put("/paid/:consultationId", /*authenticateToken ,*/ async (req, res) => {
  try {
    const { consultationId } = req.params;
    const doctorId = req.user.id;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    // if (consultation.doctorId.toString() !== doctorId) {
    //   return res
    //     .status(403)
    //     .json({ message: "Forbidden: You are not the assigned doctor" });
    // }

    const doctor = await Doctor.findById(doctorId);
    const patient = await Patient.findById(consultation.patientId);

    if (!doctor || !patient) {
      return res.status(404).json({ message: "Doctor or patient not found" });
    }

    const currentRespondTime = doctor.respondTime;
    consultation.respondTime = currentRespondTime;
    consultation.status = "paid";

    doctor.respondTime = currentRespondTime + 1;

    if (!doctor.acceptedConsultations.includes(consultation._id)) {
      doctor.acceptedConsultations.push(consultation._id);
    }

    doctor.pendingConsultations = doctor.pendingConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );

    patient.requestedConsultations = patient.requestedConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );

    if (!patient.historyConsultations.includes(consultation._id)) {
      patient.historyConsultations.push(consultation._id);
    }

    await consultation.save();
    await doctor.save();
    await patient.save();

    res.status(200).json({
      message: "Consultation paid and updated",
      consultation,
      updatedDoctorRespondTime: doctor.respondTime,
    });
  } catch (error) {
    console.error("Error in /paid:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Create payment link (PayTabs)
router.post("/paytabs/create/:consultationId", async (req, res) => {
  try {
    const consultation = await Consultation.findById(
      req.params.consultationId
    ).populate("doctorId");
    if (!consultation || !consultation.doctorId) {
      return res
        .status(404)
        .json({ message: "Consultation or doctor not found" });
    }

    const doctor = consultation.doctorId;
    const amount = doctor.consultationFees;

    const paymentRequest = {
      profile_id: process.env.PAYTABS_ID,
      tran_type: "sale",
      tran_class: "ecom",
      cart_id: `cons_${consultation._id}`,
      cart_currency: "USD",
      cart_amount: amount,
      cart_description: `Consultation with Dr. ${doctor.name} ${doctor.lastName}`,
      callback: "https://your-backend.com/api/consultations/paytabs/callback",
      return: "https://your-frontend.com/payment-success",
      customer_details: {
        name: "Test Patient",
        email: "test@example.com",
        phone: "96171123456",
        street1: "Beirut Street",
        city: "Beirut",
        state: "Beirut",
        country: "LB",
        zip: "0000",
      },
    };

    const response = await axios.post(
      "https://secure.paytabs.com/payment/request",
      paymentRequest,
      {
        headers: {
          "Content-Type": "application/json",
          authorization: process.env.PAYTABS_KEY,
        },
      }
    );

    res.json({ payment_url: response.data.redirect_url });
  } catch (err) {
    console.error("PayTabs error:", err.message);
    res.status(500).json({ message: "Payment initialization failed" });
  }
});

// Payment callback (PayTabs server-to-server)
router.post("/paytabs/callback", async (req, res) => {
  try {
    const { cart_id, tran_ref, payment_result } = req.body;
    const consultationId = cart_id.split("_")[1];

    const consultation = await Consultation.findById(consultationId).populate(
      "doctorId"
    );
    if (!consultation || !consultation.doctorId) {
      return res.status(404).send("Consultation or doctor not found");
    }

    if (payment_result.response_status !== "A") {
      return res.status(400).send("Payment not successful");
    }

    const doctor = consultation.doctorId;
    const fullAmount = doctor.consultationFees;
    const platformCut = fullAmount * 0.2;
    const paidToDoctor = fullAmount - platformCut;

    consultation.status = "paid";
    consultation.paymentDetails = {
      transactionRef: tran_ref,
      amountPaid: fullAmount,
      platformCut,
      paidToDoctor,
    };

    await consultation.save();
    res.status(200).send("Payment paid and consultation updated");
  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
