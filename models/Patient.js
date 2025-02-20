// models/Patient.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Patient = sequelize.define('Patient', {
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
  age: { 
    type: DataTypes.INTEGER 
  },
  phoneNumber: {
    type: DataTypes.INTEGER, 
    allowNull: false, 
    unique: true 
  },
  nbOfEmergencyLeft: { 
    type: DataTypes.INTEGER,
    defaultValue: 0 
  },
  weight: { 
    type: DataTypes.DOUBLE 
  },
  height: { 
    type: DataTypes.INTEGER 
  },
  smooking: { 
    type: DataTypes.BOOLEAN,
    defaultValue: false 
  },
  alergic: { 
    type: DataTypes.BOOLEAN,
    defaultValue: false 
  },
  alcohol: { 
    type: DataTypes.BOOLEAN,
    defaultValue: false 
  },
  profilePic: { 
    type: DataTypes.STRING 
  },
  requestedConsultations:{
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    references: {
      model: 'Consultations',
      key: 'id'
    }
  }
}, {
  timestamps: true
});

module.exports = Patient;
