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
router.put(
  "/accept/:consultationId",
  /*authenticateToken ,*/ async (req, res) => {
    try {
      const { consultationId } = req.params;
      // const doctorId = req.user?.id;

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
  }
);

// Finalize payment (confirmed by doctor)
router.put(
  "/paid/:consultationId",
  /*authenticateToken ,*/ async (req, res) => {
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

      const doctor = await Doctor.findById(consultation.doctorId);
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
  }
);

// Create payment link (PayTabs)
router.post("/paytabs/create/:consultationId", async (req, res) => {
  try {
    // Fetch the consultation, doctor, and patient details
    const consultation = await Consultation.findById(req.params.consultationId)
      .populate({
        path: "doctorId",
        select: "name lastName consultationFees",
      })
      .populate({
        path: "patientId",
        select: "name lastName email phoneNumber",
      });

    if (!consultation) {
      return res
        .status(404)
        .json({ message: "Consultation, doctor, or patient not found" });
    }

    const doctor = consultation.doctorId;
    const amount = doctor.consultationFees;

    const patient = consultation.patientId;

    // Prepare the payment request body for PayTabs API
    const paymentRequest = {
      profile_id: process.env.PAYTABS_ID,
      tran_type: "sale",
      tran_class: "ecom",
      cart_id: `cons_${consultation._id}`,
      cart_currency: "USD",
      cart_amount: amount,
      cart_description: `Consultation with Dr. ${doctor.name} ${doctor.lastName}`,
      callback: "https://estishara-backend.vercel.app/api/consultation/paytabs/callback",
      return: "https://estishara-backend.vercel.app/payment-success",
      
      // Customer details (only essential info)
      customer_details: {
        name: `${patient.name} ${patient.lastName}`,
        email: patient.email,
        phone: patient.phoneNumber.toString(),
      },
    
      // Minimal billing address (required by PayTabs but can be empty)
      billing_address: {
        first_name: patient.name,
        last_name: patient.lastName,
        email: patient.email,
        phone: patient.phoneNumber.toString(),
        street1: "N/A",
        city: "N/A",
        state: "N/A",
        zip: "00000",
        country: "LB" // PayTabs often requires country code
      },
    
      // Hide shipping completely
      hide_shipping: true,
      hide_billing: true, // If available in PayTabs API
      
      // Alternative if above not available
      show_shipping: "no",
      show_billing: "no"
    };
    // Make the PayTabs API request to create the payment link
    const response = await axios.post(
      "https://www.paytabs.com/payment/api/create",
      paymentRequest,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `${process.env.PAYTABS_KEY}`, // Ensure PayTabs Key is correct
        },
      }
    );

    

    // Extract the payment URL and send it to the frontend
    const paymentUrl = response.data.redirect_url;
    res.json({ payment_url: paymentUrl });
  } catch (err) {
    console.error(
      "PayTabs error:",
      err.response ? err.response.data : err.message
    );
    res.status(500).json({ message: "Payment initialization failed" });
  }
});

// Payment callback (PayTabs server-to-server)
router.post("/paytabs/callback", async (req, res) => {
  try {
    console.log("Route hittteddddddddddddddd")
    const { cart_id, tran_ref, payment_result } = req.body;
    console.log(cart_id, tran_ref, payment_result);
    const consultationId = cart_id.split("_")[1]; // Extract consultation ID from cart_id

    // Step 1: Fetch the consultation, doctor, and patient details
    const consultation = await Consultation.findById(consultationId).populate("doctorId");
    if (!consultation || !consultation.doctorId) {
      return res.status(404).send("Consultation or doctor not found");
    }

    const doctor = consultation.doctorId;
    const patient = await Patient.findById(consultation.patientId);
    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    // Step 2: Check if the payment was successful
    if (payment_result.response_status !== "A") {
      return res.status(400).send("Payment not successful");
    }

    // Step 3: Calculate the platform cut (20%) and doctor's payout (80%)
    const fullAmount = doctor.consultationFees;
    const platformCut = fullAmount * 0.20; // 20% for the platform
    const paidToDoctor = fullAmount - platformCut; // 80% to the doctor

    // Step 4: Update consultation status and payment details
    consultation.status = "paid";
    consultation.paymentDetails = {
      transactionRef: tran_ref,
      amountPaid: fullAmount,
      platformCut,
      paidToDoctor,
    };

    // Step 5: Update doctor and patient records
    const currentRespondTime = doctor.respondTime;
    consultation.respondTime = currentRespondTime; // Store the current respond time in the consultation
    doctor.respondTime = currentRespondTime + 1; // Increment the doctor’s respond time by 1

    // Move consultation to acceptedConsultations for doctor and historyConsultations for patient
    doctor.acceptedConsultations.push(consultation._id);
    doctor.pendingConsultations = doctor.pendingConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );

    patient.requestedConsultations = patient.requestedConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );
    patient.historyConsultations.push(consultation._id);

    // Step 6: Save updated consultation, doctor, and patient records
    await consultation.save();
    await doctor.save();
    await patient.save();

    // Step 7: Send success response
    res.status(200).send("Payment confirmed and consultation updated");

  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
