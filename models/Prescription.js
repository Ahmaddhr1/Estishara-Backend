const mongoose = require("mongoose");
const { Schema } = mongoose;

const prescriptionSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
    },
    doctor:{
        type: Schema.Types.ObjectId,
        ref: "Doctor",
    },
    medicationName: String,
    strength: String,
    form: String,
    direction: String,
    quantity: String,
    diagnosis: String,
  },
  {
    timestamps: true,
  }
);

const Prescription = mongoose.model("Prescription", prescriptionSchema);
module.exports = Prescription;
