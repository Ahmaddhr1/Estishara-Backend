
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  age: { type: DataTypes.INTEGER },
});

// Sync model with Neon PostgreSQL
sequelize.sync()
  .then(() => console.log('✅ User table created'))
  .catch(err => console.error('❌ Sync error:', err));

module.exports = User;
