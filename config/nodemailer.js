const nodemailer = require("nodemailer");
require("dotenv").config();

// Gmail transporter
const gmailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "ahmaddaher0981@gmail.com",
    pass: process.env.APP_PASS, // Use env variable for safety
  },
});

// Outlook transporter
const outlookTransporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: "ahmaddaher07@hotmail.com",
    pass: "cmfypirdkpihzdxs",
  },
  tls: {
    ciphers: "SSLv3",
  },
});

// Export both as named exports
module.exports = {
  gmailTransporter,
  outlookTransporter,
};
