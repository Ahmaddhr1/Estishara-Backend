const mongoose = require('mongoose');
const { Schema } = mongoose;

const consultationSchema = new Schema({
  status: {
    type: String,
    enum: ["requested", "accepted","paid"],
    required: true,
    default: "requested",
  },
  duration: {
    type: Number,
    required: true,
    default: 60,
  },
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  respondTime:{
    type:Number,
  },
}, { timestamps: true });


const Consultation = mongoose.model('Consultation', consultationSchema);
module.exports = Consultation;
