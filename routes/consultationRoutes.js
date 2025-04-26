const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");
const Consultation = require("../models/Consultation");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const authenticateToken = require("../utils/middleware");
const router = express.Router();
dotenv.config();

const profileID = process.env.PAYTABS_ID;
const serverKey = process.env.PAYTABS_KEY;

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

router.delete("/cons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findById(id)
      .populate("doctorId")
      .populate("patientId");
    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found!" });
    }
    console.log(consultation.patientId._id)
    // const reqUserId = req.user?.id;
    // if (reqUserId !== consultation.doctorId._id) {
    //   return res.status(403).json({
    //     error: "Forbidden: You are not authorizedd!",
    //   });
    // }

    // await Patient.findByIdAndUpdate(consultation.patientId._id, {
    //   $pull: { requestedConsultations: consultation._id },
    // });

    // await Doctor.findByIdAndUpdate(consultation.doctorId._id, {
    //   $pull: { pendingConsultations: consultation._id },
    // });
    // return res.status(200).json({ message: "Consultation cancelled!" });
  } catch (e) {
    res.status(500).json({
      error:
        e.message || "Error fetching accepted consultations for the doctor.",
    });
  }
});

router.post("/paytabs/create/:consultationId", async (req, res) => {
  try {
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

    const paymentRequest = {
      profile_id: profileID,
      tran_type: "sale",
      tran_class: "ecom",
      cart_id: `cons_${consultation._id}`,
      cart_currency: "USD",
      cart_amount: amount,
      cart_description: `Consultation with Dr. ${doctor.name} ${doctor.lastName}`,
      callback:
        "https://estishara-backend.vercel.app/api/consultation/paytabs/callback",
      return: "https://estishara-backend.vercel.app/",
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

    // Make the PayTabs API request to create the payment link
    const response = await axios.post(
      "https://secure-global.paytabs.com/payment/request",
      paymentRequest,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `${serverKey}`,
        },
      }
    );

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
    console.log("Received callback:", req.body);
    const { cart_id, tran_ref, payment_result } = req.body;
    const consultationId = cart_id.split("_")[1];

    const consultation = await Consultation.findById(consultationId).populate(
      "doctorId"
    );
    if (!consultation || !consultation.doctorId) {
      return res
        .status(404)
        .json({ error: "Consultation or doctor not found" });
    }

    const doctor = consultation.doctorId;
    const patient = await Patient.findById(consultation.patientId);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    if (payment_result.response_status !== "A") {
      return res.status(400).json({ error: "Payment not successful" });
    }

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

    const notification = new Notification({
      title: "Payment Sucessful",
      content: `Mr.${patient.name} ${patient.lastName} has paid for your consultation.Please start it now!`,
      receiverModel: "Doctor",
      receiver: doctor._id,
    });

    await notification.save();

    res
      .status(200)
      .json({ message: "Payment confirmed and consultation updated" });
  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
