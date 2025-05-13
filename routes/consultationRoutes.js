const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");
const Consultation = require("../models/Consultation");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const authenticateToken = require("../utils/middleware");
const messaging = require("../config/firebaseConfig");
const Notification = require("../models/Notification.js");
const PlatformStats = require("../models/PlatformStats.js");
const router = express.Router();
dotenv.config();

const profileID = process.env.PAYTABS_ID;
const serverKey = process.env.PAYTABS_KEY;

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

    const notification = new Notification({
      title: "Consultation Requested",
      content: `Mr.${patient.name} ${patient.lastName} has requested a consultation with you. Respond as soon as possible!`,
      receiverModel: "Doctor",
      receiver: doctor._id,
    });

    await notification.save();

    doctor.notificationsRecieved.push(notification._id);
    await doctor.save();

    const fcmToken = doctor?.fcmToken;

    const message = {
      notification: {
        title: notification.title,
        body: notification.content,
      },
      token: fcmToken,
    };
    const response = await messaging?.send(message);

    res
      .status(201)
      .json({ message: "Consultation created", consultation, response });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error creating consultation" + err.message });
  }
});

router.delete("/cons/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findById(id)
      .populate("doctorId")
      .populate("patientId");
    const patient = await Patient.findById(consultation.patientId);
    console.log(consultation.doctorId);
    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found!" });
    }
    const reqUserId = req.user?.id;
    if (reqUserId != consultation.doctorId) {
      return res.status(403).json({
        error: "Forbidden: You are not authorizedd!",
      });
    }

    if (
      consultation.status !== "requested" ||
      consultation.status !== "accepted"
    ) {
      return res.status(400).json({ message: "You can't cancel it!" });
    }

    await Patient.findByIdAndUpdate(consultation.patientId, {
      $pull: { requestedConsultations: consultation._id },
    });

    await Doctor.findByIdAndUpdate(consultation.doctorId, {
      $pull: { pendingConsultations: consultation._id },
    });

    const notification = new Notification({
      title: "Consultation Cancelled",
      content: `Dr.${consultation?.doctorId?.name} ${consultation?.doctorId?.lastName} has cancelled your consultation .Try Finding another doctor!`,
      receiverModel: "Patient",
      receiver: patient?._id,
    });

    await notification.save();
    patient.notificationsRecieved.push(notification._id);
    const fcmToken = patient?.fcmToken;

    const message = {
      notification: {
        title: notification.title,
        body: notification.content,
      },
      token: fcmToken,
    };
    await messaging?.send(message);
    return res.status(200).json({ message: "Consultation cancelled!" });
  } catch (e) {
    res.status(500).json({
      error:
        e.message || "Error fetching accepted consultations for the doctor.",
    });
  }
});

router.post("/paytabs/create/:consultationId",authenticateToken, async (req, res) => {
    try {
      const consultation = await Consultation.findById(
        req.params.consultationId
      )
        .populate({
          path: "doctorId",
          select: "name lastName consultationFees",
        })
        .populate({
          path: "patientId",
          select: "name lastName email phoneNumber",
        });

      if (req.user.id != consultation.patientId) {
        return res
          .status(401)
          .json({ message: "Forbidden, You cant pay for this consultation!" });
      }

      if (!consultation) {
        return res
          .status(404)
          .json({ message: "Consultation, doctor, or patient not found" });
      }
      if (consultation.status !== "accepted") {
        return res
          .status(404)
          .json({ message: "Consultation has not been accepted yet!" });
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
  }
);

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

    if (consultation.status === "paid") {
      return res.status(200).json({ message: "Payment already processed" });
    }

    consultation.status = "paid";
    consultation.paymentDetails = {
      transactionRef: tran_ref,
      amountPaid: fullAmount,
      platformCut,
      paidToDoctor,
      payoutStatus: "pending",
      payoutDate: null,
    };

    if (!doctor.acceptedConsultations.includes(consultation._id)) {
      doctor.acceptedConsultations.push(consultation._id);
    }

    doctor.pendingConsultations = doctor.pendingConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );

    patient.requestedConsultations = patient.requestedConsultations.filter(
      (id) => id.toString() !== consultation._id.toString()
    );

    if (!patient.acceptedConsultations.includes(consultation._id)) {
      patient.acceptedConsultations.push(consultation._id);
    }

    await consultation.save();
    await doctor.save();
    await patient.save();

    const platformStats = await PlatformStats.findOne();
    if (platformStats) {
      platformStats.totalPlatformCut += platformCut;
      platformStats.totalTransactions += 1;
      await platformStats.save();
    } else {
      await PlatformStats.create({
        totalPlatformCut: platformCut,
        totalTransactions: 1,
      });
    }

    const existingNotification = await Notification.findOne({
      consultationId: consultation._id,
      receiver: doctor._id,
    });

    if (!existingNotification) {
      const notification = new Notification({
        title: "Payment Successful",
        content: `Mr. ${patient.name} ${patient.lastName} has paid for your consultation. Please start it now!`,
        receiverModel: "Doctor",
        receiver: doctor._id,
        consultationId: consultation._id,
      });

      await notification.save();
      doctor.notificationsRecieved.push(notification._id);
      await doctor.save();
      const fcmToken = await doctor?.fcmToken;

      const message = {
        notification: {
          title: notification.title,
          body: notification.content,
        },
        token: fcmToken,
      };
      await messaging?.send(message);
    }

    res.status(200).json({
      message: "Payment confirmed, consultation updated and notification sent!",
    });
  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/consultation/payouts/pending", async (req, res) => {
  try {
    const consultationsToPay = await Consultation.find({
      status: "paid",
      "paymentDetails.payoutStatus": "pending",
    })
      .populate({
        path: "doctorId",
        select: "name lastName payoutAccountNumber preferredPayoutMethod",
      })
      .populate({
        path: "patientId",
        select: "name lastName",
      });
    res.status(200).json({ consultations: consultationsToPay });
  } catch (error) {
    console.error("Error fetching unpaid consultations:", error.message);
    res.status(500).json({ error: "Failed to fetch consultations" });
  }
});

router.put("/start/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findById(id)
      .populate("doctorId")
      .populate("patientId");

    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found!" });
    }

    // if (consultation.status !== "paid") {
    //   return res
    //     .status(401)
    //     .json({ message: "U cant start consultation ,Its not paid!" });
    // }

    const doctor = consultation.doctorId;
    const patient = consultation.patientId;

    if (doctor.ongoingConsultation) {
      return res.status(401).json({
        error: "You can't start a new consultation while you are in one!",
      });
    }

    await Doctor.updateOne(
      { _id: doctor._id },
      { $pull: { acceptedConsultations: consultation._id } }
    );

    await Patient.updateOne(
      { _id: patient._id },
      { $pull: { acceptedConsultations: consultation._id } }
    );

    doctor.ongoingConsultation = consultation._id;
    patient.ongoingConsultation = consultation._id;

    await doctor.save();
    await patient.save();

    consultation.status = "ongoing";
    await consultation.save();

    const fcmToken = patient?.fcmToken;
    const message = {
      notification: {
        title: "Consultation Started!",
        body: "You can ask and make call now!",
      },
      token: fcmToken,
    };
    await messaging?.send(message);

    return res
      .status(200)
      .json({ message: "Consultation started successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/end/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body;
    const consultation = await Consultation.findById(id)
      .populate("doctorId")
      .populate("patientId");

    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found!" });
    }
    consultation.duration = duration;
    await consultation.save();
    const doctor = consultation.doctorId;
    const patient = consultation.patientId;

    doctor.ongoingConsultation = null;
    patient.ongoingConsultation = null;

    doctor.historyConsultations.push(consultation._id);
    patient.historyConsultations.push(consultation._id);

    await doctor.save();
    await patient.save();

    return res.status(200).json({ message: "Ended Successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findById(id)
      .populate("doctorId")
      .populate("patientId");

    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found!" });
    }

    const doctor = consultation.doctorId;
    const patient = consultation.patientId;

    if (consultation.status !== "requested") {
      return res.status(400).json({
        error: "Consultation cannot be canceled, it was accepted!",
      });
    }

    await Doctor.updateOne(
      { _id: doctor._id },
      { $pull: { pendingConsultations: consultation._id } }
    );

    await Patient.updateOne(
      { _id: patient._id },
      { $pull: { requestedConsultations: consultation._id } }
    );

    const notification = new Notification({
      title: "Consultation Cancelled",
      content: `Mr.${patient.name} ${patient.lastName} has cancelled his consultation with you.`,
      receiverModel: "Doctor",
      receiver: doctor._id,
    });
    await notification.save();

    doctor.notificationsRecieved.push(notification?._id);
    const fcmToken = await doctor?.fcmToken;

    const message = {
      notification: {
        title: notification.title,
        body: notification.content,
      },
      token: fcmToken,
    };
    await messaging?.send(message);

    await Consultation.findByIdAndDelete(id);

    return res
      .status(200)
      .json({ message: "Consultation canceled and deleted successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/all", async (req, res) => {
  try {
    await Consultation.deleteMany({});
    await Notification.deleteMany({});

    await Doctor.updateMany(
      {},
      {
        $set: {
          ongoingConsultation: null,
          acceptedConsultations: [],
          pendingConsultations: [],
          historyConsultations: [],
          notificationsRecieved: [],
        },
      }
    );

    await Patient.updateMany(
      {},
      {
        $set: {
          ongoingConsultation: null,
          requestedConsultations: [],
          acceptedConsultations: [],
          historyConsultations: [],
          notificationsRecieved: [],
        },
      }
    );

    return res
      .status(200)
      .json({ message: "All consultations deleted successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
