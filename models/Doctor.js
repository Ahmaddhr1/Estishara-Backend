const mongoose = require("mongoose");
const { Schema } = mongoose;

const doctorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    lastName: {
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
    phoneNumber: {
      type: Number,
      unique: true,
    },
    age: {
      type: Number,
      required: true,
      default: -1, // Default to 30 if not provided
    },
    availability: {
      type: Boolean,
      default: true, // Default to true
    },
    respondTime: {
      type: Number,
      required: true,
      min: 0,
      default: 1, // Default to 0 if not provided
    },
    documents: {
      type: [String],
      default: [], // Default to an empty array if no documents are provided
    },
    consultationFees: {
      type: Number,
      required: true,
      min: 20,
      max: 100,
      default: 20,
    },
    recommendedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Patient" }],
    workingAt: {
      type: String,
      required: true,
      default: "Not Assigned", // Default if no working place is provided
    },
    education: {
      type: String,
      required: true,
      default: "Not Provided", // Default if no education details are provided
    },
    isEmergencyAvailable: {
      type: Boolean,
      default: false, // Default to false if not provided
    },
    treated: {
      type: String,
      required: true,
      default: "Not Specified", // Default value if not provided
    },
    service: {
      type: String,
      required: true,
      default: "General Service", // Default if no service is specified
    },
    experience: {
      type: Number,
      required: true,
      min: -1,
      default: -1,
    },
    inConsultation: {
      type: Boolean,
      default: false, // Default to false if not provided
    },
    isPendingDoctor: {
      type: Boolean,
      default: true,
    },
    profilePic: {
      type: String,
      default: "", // Default to empty string if no profile picture is provided
    },

    // Relationships
    specialityId: {
      type: Schema.Types.ObjectId,
      ref: "Speciality",
      required: false,
      default: null, // Default to null if not provided
    },
    pendingConsultations: {
      type: [Schema.Types.ObjectId],
      ref: "Consultation",
      default: [],
    },
    notificationsRecieved: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],
    acceptedConsultations: {
      type: [Schema.Types.ObjectId],
      ref: "Consultation",
      default: [],
    },
    specialityDetails: {
      type: String,
      default: "",
    },
    languageSpeak: {
      type: [String],
      default: [],
    },
    ongoingConsultation: {
      type: Schema.Types.ObjectId,
      ref: "Consultation",
      default: null,
    },
    historyConsultations: {
      type: [Schema.Types.ObjectId],
      ref: "Consultation",
      default: [],
    },
    fcmToken: {
      type: String,
      default:"",
    },
  },
  { timestamps: true }
);

// Export the model
const Doctor = mongoose.model("Doctor", doctorSchema);
module.exports = Doctor;
