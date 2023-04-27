// TO CONNECT DATABASE //
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session')
const app = express();
const path = require('path');
const nocache = require('nocache');
const config = require('./config/config')
require('dotenv').config();
config.mongooseConnecton()
const PORT = process.env.PORT;


app.use(express.static(path.join(__dirname,'public')));
app.use(express.static(path.join(__dirname,'assets')));

app.use(express.json())

// FOR CACHE STORAGE //required
app.use(nocache());


app.use(express.urlencoded({ extended:true }))
app.use(express.json());


app.use(session({
  secret:"secretKey",
  saveUninitialized: true,
  resave: false,
  cookie:{
    maxAge:1000*60*24*10
  }
}));


app.set('view engine', 'ejs');
app.set("views", "./views/user");

// FOR USER ROUTES //
const userRoute = require('./routes/userRoute')
app.use('/',userRoute);


// FOR ADMIN ROUTES //
const adminRoute = require('./routes/adminRoute');
const { appendFile } = require('fs/promises');
app.use('/admin',adminRoute);

///////404////////
app.use(function (req, res, next) {
  res.status(404).render("404");
});

//razorpay
const Razorpay = require('razorpay');
var instance = new Razorpay({
  key_id:"YOUR_KEY_ID ",
  key_secret:"YOUR_KEY_SECRECT"
})


// FOR CONNECTING TO THE SERVER //

app.listen(PORT,()=>{
  console.log("SERVER STARTED");
});