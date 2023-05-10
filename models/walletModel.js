const mongoose = require('mongoose')

const walletModel = new mongoose.Schema({
    status:{
        type:String,
        require:true
    },
    amount:{
        type:Number,
        require:true
    },
    date:{
        type:Date
        
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
});

const walletData = mongoose.model('walletData',walletModel);
module.exports = walletData