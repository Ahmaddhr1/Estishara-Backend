// models/Speciality.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Speciality = sequelize.define(
  "Speciality",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Speciality;
