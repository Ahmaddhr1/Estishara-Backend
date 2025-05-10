const mongoose = require("mongoose");
const { Schema } = mongoose;

const consultationSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["requested", "accepted", "paid", "ongoing"],
      required: true,
      default: "requested",
    },
    duration: {
      type: Number,
      default: 0,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    paymentDetails: {
      transactionRef: String,
      amountPaid: Number,
      platformCut: Number,
      paidToDoctor: Number,
      payoutStatus: {
        type: String,
        enum: ["pending", "sent"],
        default: "pending",
      },
      payoutDate: Date,
    },
  },
  { timestamps: true }
);

const Consultation = mongoose.model("Consultation", consultationSchema);
module.exports = Consultation;
