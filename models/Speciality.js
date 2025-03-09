const mongoose = require('mongoose');
const { Schema } = mongoose;

const specialitySchema = new Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  description: { 
    type: String 
  }
}, { timestamps: true });

const Speciality = mongoose.model('Speciality', specialitySchema);
module.exports = Speciality;
