var admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://estishara-6d1e0-default-rtdb.firebaseio.com",
});

const messaging = admin.messaging();

module.exports = messaging;
