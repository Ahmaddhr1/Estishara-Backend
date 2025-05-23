const mongoose = require("mongoose");
const { Schema } = mongoose;

const specialitySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    logo: {
      type: String,
      required: true,
    },
    doctors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Doctor",
      },
    ],
  },
  { timestamps: true }
);

const Speciality = mongoose.model("Speciality", specialitySchema);
module.exports = Speciality;
