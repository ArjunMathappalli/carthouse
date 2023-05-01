const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({

  name:{
    type:String,
    required:true
  },
  image:{
    type:Array,
    required:true
  },
  category:{
    type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
        required:true
  },
  description:{
    type:String,
    required:true
    
  },
  status:{
    type:Boolean,
    required:false,
    default:true
  },
  stock:{
    type:Number,
    required:true
  },
  price:{
    type:Number,
    required:true
  },
  review: [
    {
      userName: { type: String },
      message: { type: String },
    },
  ],
})

module.exports = mongoose.model('Product',productSchema);