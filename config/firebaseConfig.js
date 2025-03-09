const admin = require("firebase-admin");
const serviceAccount = require("./estishara-6d1e0-firebase-adminsdk-fbsvc-4eafc9b4b9.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;