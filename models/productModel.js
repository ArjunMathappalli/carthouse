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
  catName:{
    type:String,
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
      userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        reqired:true
      },
      review: { type: String },
    },
  ],
})

module.exports = mongoose.model('Product',productSchema);