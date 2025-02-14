require('dotenv').config(); 
const { Sequelize } = require('sequelize');

// Use Neon database connection URL from .env
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true, // Required for Neon
      rejectUnauthorized: false,
    },
  },
  logging: false, // Disable logging for clean output
});

// Test the connection
sequelize.authenticate()
  .then(() => console.log('✅ Connected to Neon PostgreSQL!'))
  .catch(err => console.error('❌ Connection Error:', err));

module.exports = sequelize;
