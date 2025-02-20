// models/Consultation.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Consultation = sequelize.define('Consultation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Patients', 
      key: 'id'
    }
  },
  doctorId: {
    type: DataTypes.UUID, 
    allowNull: false,
    references: {
      model: 'Doctors', 
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('requested', 'confirmed', 'canceled', 'complete'),
    allowNull: false,
    defaultValue: 'requested'
  },
  duration: {
    type: DataTypes.INTEGER, 
    allowNull: true
  },
  isEmergency: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
});

module.exports = Consultation;
