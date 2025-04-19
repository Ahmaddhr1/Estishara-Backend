const express = require("express");
const dotenv = require("dotenv");
const Consultation = require("../models/Consultation");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const authenticateToken = require("../utils/middleware");
const PayTabs = require('paytabs_pt2');
dotenv.config();

const router = express.Router();


const profileID = process.env.PAYTABS_ID; 
const serverKey = process.env.PAYTABS_KEY;
const region = "GLOBAL";
PayTabs.setConfig(profileID, serverKey, region);

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

// Accept consultation (doctor confirms, waiting for payment)
router.put("/accept/:consultationId", async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

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
router.put("/paid/:consultationId", async (req, res) => {
  try {
    const { consultationId } = req.params;
    const doctorId = req.user.id;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    const doctor = await Doctor.findById(consultation.doctorId);
    const patient = await Patient.findById(consultation.patientId);

    if (!doctor || !patient) {
      return res.status(404).json({ message: "Doctor or patient not found" });
    }

    const currentRespondTime = doctor.respondTime;
    consultation.respondTime = currentRespondTime;
    consultation.status = "paid";

    doctor.respondTime = currentRespondTime + 1;

    doctor.acceptedConsultations.push(consultation._id);
    doctor.pendingConsultations = doctor.pendingConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );

    patient.requestedConsultations = patient.requestedConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );

    patient.historyConsultations.push(consultation._id);

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
    const consultation = await Consultation.findById(req.params.consultationId)
      .populate("doctorId")
      .populate("patientId");

    if (!consultation) {
      return res
        .status(404)
        .json({ message: "Consultation, doctor, or patient not found" });
    }

    const doctor = consultation.doctorId;
    const amount = doctor.consultationFees;

    const patient = consultation.patientId;

    const paymentRequest = {
      tran_type: "sale",
      tran_class: "ecom",
      cart_id: `cons_${consultation._id}`,
      cart_currency: "USD",
      cart_amount: amount,
      cart_description: `Consultation with Dr. ${doctor.name} ${doctor.lastName}`,
      callback: "https://estishara-backend.vercel.app/api/consultation/paytabs/callback",
      return: "https://estishara-backend.vercel.app/payment-success",
      customer_details: {
        name: `${patient.name} ${patient.lastName}`,
        email: patient.email,
        phone: patient.phoneNumber.toString(),
      },
      billing_address: {
        first_name: patient.name,
        last_name: patient.lastName,
        email: patient.email,
        phone: patient.phoneNumber.toString(),
        street1: "N/A",
        city: "N/A",
        state: "N/A",
        zip: "00000",
        country: "LB",
      },
      hide_shipping: true,
      hide_billing: true,
    };

    // Use PayTabs to create the payment link
    const response = await PayTabs.createPayment(paymentRequest);
    const paymentUrl = response.redirect_url;

    res.json({ payment_url: paymentUrl });
  } catch (err) {
    console.error("PayTabs error:", err.response ? err.response.data : err.message);
    res.status(500).json({ message: "Payment initialization failed" });
  }
});

// Payment callback (PayTabs server-to-server)
router.post("/paytabs/callback", async (req, res) => {
  try {
    const { cart_id, tran_ref, payment_result } = req.body;
    const consultationId = cart_id.split("_")[1];

    const consultation = await Consultation.findById(consultationId).populate("doctorId");
    if (!consultation || !consultation.doctorId) {
      return res.status(404).send("Consultation or doctor not found");
    }

    const doctor = consultation.doctorId;
    const patient = await Patient.findById(consultation.patientId);
    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    if (payment_result.response_status !== "A") {
      return res.status(400).send("Payment not successful");
    }

    const fullAmount = doctor.consultationFees;
    const platformCut = fullAmount * 0.20;
    const paidToDoctor = fullAmount - platformCut;

    consultation.status = "paid";
    consultation.paymentDetails = {
      transactionRef: tran_ref,
      amountPaid: fullAmount,
      platformCut,
      paidToDoctor,
    };

    consultation.respondTime = doctor.respondTime;
    doctor.respondTime += 1;

    doctor.acceptedConsultations.push(consultation._id);
    doctor.pendingConsultations = doctor.pendingConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );

    patient.requestedConsultations = patient.requestedConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );
    patient.historyConsultations.push(consultation._id);

    await consultation.save();
    await doctor.save();
    await patient.save();

    res.status(200).send("Payment confirmed and consultation updated");
  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
