require("dotenv").config({ path: '../.env' }); 
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

sequelize
  .authenticate()
  .then(() => console.log("✅ Connected to Neon PostgreSQL!"))
  .catch((err) => console.error("❌ Connection Error:", err));

module.exports = sequelize;
