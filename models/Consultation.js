const mongoose = require('mongoose');
const { Schema } = mongoose;

const consultationSchema = new Schema({
  status: {
    type: String,
    enum: ["requested", "confirmed", "canceled", "complete"],
    required: true,
    default: "requested",
  },
  duration: {
    type: Number,
    required: false,
  },
  isEmergency: {
    type: Boolean,
    default: false,
  },
  // patientId: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Patient',
  //   required: true
  // },
  // doctorId: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Doctor',
  //   required: true
  // }
}, { timestamps: true });


const Consultation = mongoose.model('Consultation', consultationSchema);
module.exports = Consultation;
