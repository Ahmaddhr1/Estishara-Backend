const mongoose = require("mongoose");
const { Schema } = mongoose;

const feedbackSchema = new Schema(
  {
    feedback: String,
    stars: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
    },
    doctor: {
      type: mongoose.Types.ObjectId,
      ref: "Doctor",
    },
    patient: {
      type: mongoose.Types.ObjectId,
      ref: "Patient",
    },
    isReport:{
        type:Boolean,
        default:false
    }
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
