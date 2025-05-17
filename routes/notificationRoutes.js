const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const messaging = require("../config/firebaseConfig.js");

router.get("/:id", async (req, res) => {
  const receiverId = req.params.id;
  try {
    const doctor = await Doctor.findById(receiverId);
    const patient = await Patient.findById(receiverId);

    if (!doctor && !patient) {
      return res.status(404).json({ message: "User not found" });
    }

    if (doctor) {
      let notifications = await Notification.find({
        _id: { $in: doctor.notificationsRecieved },
      }).populate("receiver");

      if (!notifications.length) {
        return res
          .status(404)
          .json({ message: "No notifications found for this doctor" });
      }

      notifications = notifications.reverse(); // Reverse here

      return res.status(200).json(notifications);
    }

    if (patient) {
      let notifications = await Notification.find({
        _id: { $in: patient.notificationsRecieved },
      }).populate("receiver");

      if (!notifications.length) {
        return res
          .status(404)
          .json({ message: "No notifications found for this patient" });
      }

      notifications = notifications.reverse(); // Reverse here

      return res.status(200).json(notifications);
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/", async (req, res) => {
  try {
    const { title, content, receiver, receiverModel } = req.body;

    if (!title || !content || !receiver || !receiverModel) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create a new notification
    const newNotification = new Notification({
      title,
      content,
      receiver,
      receiverModel,
    });

    await newNotification.save();
    if (receiverModel === "Patient") {
      const patient = await Patient.findById(receiver);
      if (patient) {
        patient.notificationsRecieved.push(newNotification._id);
        await patient.save();
      }
    } else if (receiverModel === "Doctor") {
      const doctor = await Doctor.findById(receiver);
      if (doctor) {
        doctor.notificationsRecieved.push(newNotification._id);
        await doctor.save();
      }
    } else {
      return res.status(400).json({ message: "Invalid receiver model" });
    }

    // Respond with success message
    res
      .status(201)
      .json({ message: "Notification sent", notification: newNotification });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/send-notification", async (req, res) => {
  const { message, currentUserId, otherUserId } = req.body;

  console.log("Message:", message);
  console.log("Current User ID:", currentUserId);
  console.log("Other User ID:", otherUserId);

  try {
    let recipient;

    
    recipient = await Doctor.findById(otherUserId);
    console.log("Recipient found (Doctor):", recipient);

    
    if (!recipient) {
      recipient = await Patient.findById(otherUserId);
      console.log("Recipient found (Patient):", recipient);
    }

    
    if (!recipient || !recipient.fcmToken) {
      console.error("FCM token not found for recipient");
      return res.status(400).send("FCM token not found for recipient");
    }

    const fcmToken = recipient.fcmToken;
    console.log("FCM Token:", fcmToken);

    
    let sender;
    if (recipient instanceof Patient) {
      sender = await Doctor.findById(currentUserId); 
    } else if (recipient instanceof Doctor) {
      sender = await Patient.findById(currentUserId); 
    }

    // If sender details are missing, return an error
    if (!sender || !sender.name || !sender.lastName) {
      console.error("Sender details not found");
      return res.status(400).send("Sender details not found");
    }

    console.log("Sender Name:", sender.name, sender.lastName);

    // Prepare the notification payload
    const payload = {
      notification: {
        title: "New Message",
        body: `${sender.name} ${sender.lastName}: ${message}`, 
      },
      token: fcmToken,
    };
    console.log("Payload:", payload);

    console.log("Sending the notification...");
    const response = await messaging?.send(payload);
    console.log("Notification sent successfully:", response);

    res.status(200).json({ message: "Notification sent", response });
  } catch (error) {
    console.error("Error in send-notification:", error.message);
    res
      .status(500)
      .json({ error: "Failed to send notification " + error.message });
  }
});



module.exports = router;
