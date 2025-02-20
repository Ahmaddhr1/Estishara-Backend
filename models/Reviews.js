// models/Review.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  rating: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    validate: { min: 0, max: 5 }
  },
  comment: { 
    type: DataTypes.TEXT,
    allowNull: true 
  },

  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Doctors', 
      key: 'id'
    }
  },

  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Patients', 
      key: 'id'
    }
  }
}, {
  timestamps: true
});

module.exports = Review;
