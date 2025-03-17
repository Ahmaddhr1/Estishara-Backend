
const nodemailer = require('nodemailer');
require('dotenv').config()

// Set up the transporter using App Password
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ahmaddaher0981@gmail.com',
    pass:  process.env.APP_PASS,
  },
});

module.exports = transporter;
