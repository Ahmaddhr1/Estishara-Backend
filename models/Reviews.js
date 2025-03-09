const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  rating: { 
    type: Number, 
    required: true,
    min: 0,
    max: 5
  },
  comment: { 
    type: String,
    required: false 
  },
  
  // Relationships
  // doctorId: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Doctor',
  //   required: true
  // },
  // patientId: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Patient',
  //   required: true
  // }
}, { timestamps: true });

// Export the model
const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
