const mongoose = require("mongoose");
const { Schema } = mongoose;

const patientSchema = new Schema(
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
      minlength: 8,
    },
    age: {
      type: Number,
      default:-1
    },
    phoneNumber: {
      type: Number,
      unique: true,
    },
    nbOfEmergencyLeft: {
      type: Number,
      default: 3, // Default to 3 if not provided
    },
    weight: {
      type: Number,
      default:-1
    },
    height: {
      type: Number,
      default:-1
    },
    smooking: {
      type: Boolean,
      default: false, // Default to false if not provided
    },
    alergic: {
      type: Boolean,
      default: false, // Default to false if not provided
    },
    alcohol: {
      type: Boolean,
      default: false, // Default to false if not provided
    },
    profilePic: {
      type: String,
      default: "", // Default to empty string if not provided
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-","Select Blood Type"],
      default:"Select Blood Type"
    },
    alergicType: {
      type: String,
      default: "", // Default to empty string if not provided
    },
    chronicDisease: {
      type: Boolean,
      default: false, // Default to false if not provided
    },
    gender: {
      type: String,
      enum: ["Male", "Female","Select Gender"],
      default:"Select Gender"
    },
    medicationType: {
      type: String,
      default: "", // Default to empty string if not provided
    },
    chroniceDiseaseDetails: {
      type: String,
      default: "", // Default to empty string if not provided
    },
    takeMedication: {
      type: Boolean,
      default: false, // Default to empty string if not provided
    },
    requestedConsultations: {
      type: [Schema.Types.ObjectId],
      ref: "Consultation",
      default: [],
    },
    reviewsDone: {
      type: [Schema.Types.ObjectId],
      ref: "Review",
      default: [],
    },
  },
  { timestamps: true }
);

// Export the model
const Patient = mongoose.model("Patient", patientSchema);
module.exports = Patient;
