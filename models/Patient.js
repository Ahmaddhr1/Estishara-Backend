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
    },
    phoneNumber: {
      type: Number,
      unique: true,
    },
    nbOfEmergencyLeft: {
      type: Number,
      defaultValue: 3,
    },
    weight: {
      type: Number,
    },
    height: {
      type: Number,
    },
    smooking: {
      type: Boolean,
      default: false,
    },
    alergic: {
      type: Boolean,
      default: false,
    },
    alcohol: {
      type: Boolean,
      default: false,
    },
    profilePic: {
      type: String,
    },

    // Relationships
    // requestedConsultations: {
    //   type: [Schema.Types.ObjectId],
    //   ref: 'Consultation',
    //   default: []
    // },
    // reviewsDone:{
    //   type: [Schema.Types.ObjectId],
    //   ref: 'Review',
    //   default: []
    // }
  },
  { timestamps: true }
);

// Export the model
const Patient = mongoose.model("Patient", patientSchema);
module.exports = Patient;
