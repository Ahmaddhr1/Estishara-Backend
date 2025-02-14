const express = require('express');
const app = express();


app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.get('/users', async (req, res) => {
    try {
      const users = await User.findAll();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


// Your routes and middleware
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
