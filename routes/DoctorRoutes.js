const express = require('express');
const router = express.Router();

router.get('/',(req,res) => {
    res.send('Hello from the Doctor route');
})

router.post('/register',(req,res) => {
    const {email,password,phoneNumber,name} = req.body;
})


module.exports = router;