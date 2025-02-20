// models/Doctor.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const Doctor = sequelize.define('Doctor', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true 
  },
  phoneNumber: {
    type: DataTypes.INTEGER, 
    allowNull: false, 
    unique: true 
  },
  age: { 
    type: DataTypes.INTEGER 
  },
  specialityId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Specialities',
      key: 'id'
    }
  },
  availability: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
  respondTime: { 
    type: DataTypes.INTEGER 
  },
  documents: { 
    type: DataTypes.ARRAY(DataTypes.STRING)
  },
  consultationFees: { 
    type: DataTypes.INTEGER 
  },
  rating: { 
    type: DataTypes.ENUM('0', '1', '2', '3', '4', '5') 
  },
  workingAt: { 
    type: DataTypes.STRING 
  },
  education: { 
    type: DataTypes.STRING 
  },
  isEmergencyAvailable: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  treated: { 
    type: DataTypes.STRING 
  },
  service: { 
    type: DataTypes.STRING 
  },
  reviews: { 
    type: DataTypes.ARRAY(DataTypes.UUID)
  },
  experience: { 
    type: DataTypes.INTEGER 
  },
  pendingConsultation: { 
    type: DataTypes.ARRAY(DataTypes.UUID), 
    defaultValue: [] ,
    references: {
      model: 'Consultations',
      key: 'id'
    }
  },
  inConsultation: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  isPendingDoctor: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
  profilePic: { 
    type: DataTypes.STRING 
  }
}, {
  timestamps: true
});

module.exports = Doctor;
