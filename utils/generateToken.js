const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const generateToken = (userId) => {
  const secretKey = process.env.JWT_SECRET || "defaultSecret";
  const uniqueAddition = uuidv4();

  return jwt.sign({ id: userId + "-" + uniqueAddition }, secretKey);
};

module.exports = generateToken;
