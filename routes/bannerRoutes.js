const express = require("express");
const router = express.Router();
const Banner = require("../models/Banner");
const authenticateToken = require("../utils/middleware");


router.get("/", async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ createdAt: -1 });
    if (!banners.length) {
      return res.status(404).json({ message: "Banners not found" });
    }
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  POST create banner (admin only)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: You are not authorized to create banners" });
    }

    const { img } = req.body;

    if (!img) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const newBanner = new Banner({ img });
    const savedBanner = await newBanner.save();
    res.status(201).json(savedBanner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  DELETE banner by ID (admin only)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: You are not authorized to delete banners" });
    }

    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.json({ message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;