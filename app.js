const express = require('express');
const app = express();


app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, world!');
});


// Your routes and middleware
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});


module.exports = app;  
