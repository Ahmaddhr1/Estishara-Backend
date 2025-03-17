const mongoose = require("mongoose");
const { Schema } = mongoose;

const doctorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    phoneNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    age: {
      type: Number,
      required: true,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    respondTime: {
      type: Number,
      required: true,
      min: 0,
    },
    documents: {
      type: [String],
      default: [],
    },
    consultationFees: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    rating: {
      type: String,
      enum: ["0", "1", "2", "3", "4", "5"],
    },
    workingAt: {
      type: String,
      required: true,
    },
    education: {
      type: String,
      required: true,
    },
    isEmergencyAvailable: {
      type: Boolean,
      default: false,
    },
    treated: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    inConsultation: {
      type: Boolean,
      default: false,
    },
    isPendingDoctor: {
      type: Boolean,
      default: true,
    },
    profilePic: {
      type: String,
    },

    // Relationships
    specialityId: {
      type: Schema.Types.ObjectId,
      ref: "Speciality",
      required: false,
    },
    // reviews: {
    //   type: [Schema.Types.ObjectId],
    //   ref: 'Review',
    //   default: []
    // },
    // pendingConsultations: {
    //   type: [Schema.Types.ObjectId],
    //   ref: 'Consultation',
    //   default: []
    // }
  },
  { timestamps: true }
);

// Export the model
const Doctor = mongoose.model("Doctor", doctorSchema);
module.exports = Doctor;
