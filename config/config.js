const multer = require('multer')
const path = require('path')


const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
      cb(null,path.join(__dirname,'../public/productImages'));
    },
    filename:(req,file,cb)=> {
      const name = Date.now()+'-'+file.originalname;
      cb(null,name);
    }
  });
  
  const upload = multer({storage:storage});


  const mongoose = require('mongoose')
  require('dotenv').config()
  function mongooseConnecton(){
    mongoose.set('strictQuery',true)
    mongoose.connect(process.env.MONGOOSE_CONNECTION)
  }
  module.exports = {
    mongooseConnecton,
    upload
  }