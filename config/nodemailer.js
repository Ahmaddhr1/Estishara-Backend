const nodemailer = require("nodemailer");
require("dotenv").config();


// const gmailTransporter = nodemailer.createTransport({
//   service: "gmail",
//   host:"smtp.gmail.com",
//   port:456,
//   auth: {
//     user: "ahmaddaher0981@gmail.com",
//     pass: process.env.APP_PASS,
//   },
// });

// const transporter = nodemailer.createTransport({
//   host:'mail.openjavascript.info',
//   port:456,
//   secure:true,
//   auth:{
//     user:'test@openjavascript,info',
//     pass:"NodeMailer123!"
//   }
// })


// const outlookTransporter = nodemailer.createTransport({
//   service: "smtp.office365.com",
//   auth: {
//     user: "ahmaddaher07@hotmail.com",
//     pass: "zluzmoiuuiduvfyj",
//   },
// });


// const transporter = nodemailer.createTransport({
//   host: process.env.MAILTRAP_HOST,
//   port: process.env.MAILTRAP_PORT,
//   auth: {
//     user: process.env.MAILTRAP_USER,
//     pass: process.env.MAILTRAP_PASS,
//   },
// });

// const apikey="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"
// const url="https://api.brevo.com/v3/smtp/email"

// const transporter = nodemailer.createTransport({
//   host: 'smtp-relay.brevo.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: 'ahmaddaher0981@gmail.com', 
//     pass: 'HLGUK1M3SJRva42X', 
//   },
// });

// Export both as named exports
module.exports = {transporter};
