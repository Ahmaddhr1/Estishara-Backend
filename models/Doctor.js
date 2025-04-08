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
      default: 20, // Default to 50 if not provided
    },
    rating: {
      type: String,
      enum: ["0", "1", "2", "3", "4", "5"],
      default: "0", // Default to "0" if no rating is provided
    },
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
      default: true, // Default to true when doctor is pending
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

    // Optional arrays for reviews and consultations
    reviews: {
      type: [Schema.Types.ObjectId],
      ref: "Review",
      default: [], // Default to empty array if no reviews are provided
    },
    pendingConsultations: {
      type: [Schema.Types.ObjectId],
      ref: "Consultation",
      default: [], 
    },
  },
  { timestamps: true }
);

// Export the model
const Doctor = mongoose.model("Doctor", doctorSchema);
module.exports = Doctor;
