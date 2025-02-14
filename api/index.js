// api/index.js
const app = require('./app');  // Import the Express app from app.js
const serverless = require('serverless-http');  // Import serverless-http

module.exports.handler = serverless(app);  // Wrap your Express app in serverless function
