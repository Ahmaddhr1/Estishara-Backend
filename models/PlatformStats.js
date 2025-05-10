const mongoose = require("mongoose");

const platformStatsSchema = new mongoose.Schema(
  {
    totalPlatformCut: {
      type: Number,
      default: 0,
    },
    totalTransactions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformStats", platformStatsSchema);
