const nodemailer = require("nodemailer");
require("dotenv").config();

// Gmail transporter
// const gmailTransporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "ahmaddaher0981@gmail.com",
//     pass: process.env.APP_PASS, // Use env variable for safety
//   },
// });

// // Outlook transporter
// const outlookTransporter = nodemailer.createTransport({
//   host: "smtp.office365.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: "ahmaddaher07@hotmail.com",
//     pass: "zluzmoiuuiduvfyj",
//   },
// });

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

// Export both as named exports
module.exports =
  // gmailTransporter,
  // outlookTransporter,
  transporter;
