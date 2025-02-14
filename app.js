const express = require("express");
const User = require("./models/User");

const app = express();

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/users", async (req, res) => {
  try {
    const user = await User.create({
      name: "John Doe",
      email: "johndoe@example.com",
      age: 30,
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll();
    console.log(users.length);
    res.json("Usersss");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen("3000", (req, res) => {
  console.log("Server is running on port 3000");
});
