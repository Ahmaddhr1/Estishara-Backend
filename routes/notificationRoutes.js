const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

router.get("/:id", async (req, res) => {
  const receiverId = req.params.id;

  try {
    const notifications = await Notification.find({
      receiver: receiverId,
    }).populate("receiver");

    if (!notifications.length) {
      return res
        .status(404)
        .json({ message: "No notifications found for this user" });
    }

    res.status(200).json(notifications);
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

    const newNotification = new Notification({
      title,
      content,
      receiver,
      receiverModel,
    });

    await newNotification.save();

    res
      .status(201)
      .json({ message: "Notification sent", notification: newNotification });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
