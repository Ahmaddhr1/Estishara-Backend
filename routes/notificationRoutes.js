const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification"); 


router.get("/:id", async(req,res)=> {
    
})
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

    res.status(201).json({ message: "Notification sent", notification: newNotification });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports =router