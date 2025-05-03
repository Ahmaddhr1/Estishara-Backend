const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");

router.get("/:id", async (req, res) => {
  const receiverId = req.params.id;
  try {
    const doctor = await Doctor.findById(receiverId);
    const patient = await Patient.findById(receiverId);

    if (!doctor && !patient) {
      return res.status(404).json({ message: "User not found" });
    }

  
    if (doctor) {
      const notifications = await Notification.find({
        _id: { $in: doctor.notificationsRecieved },
      }).populate("receiver");

      if (!notifications.length) {
        return res.status(404).json({ message: "No notifications found for this doctor" });
      }

      return res.status(200).json(notifications);
    }

    if (patient) {
      const notifications = await Notification.find({
        _id: { $in: patient.notificationsRecieved },
      }).populate("receiver");

      if (!notifications.length) {
        return res.status(404).json({ message: "No notifications found for this patient" });
      }

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
    res.status(201).json({ message: "Notification sent", notification: newNotification });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
