const bcrypt = require('bcrypt');
const randomstring = require('randomstring');
const Admin = require('../models/adminModel');
const order = require('../models/orderModel')
const userData = require('../models/userModel')
const Banner = require('../models/bannerModel')
require('dotenv').config()
const categoryData = require('../models/categoryModel');
const categoryModel = require('../models/categoryModel');
const loadLogin = async(req,res)=> {

  try {
    
    res.render('adminLogin');

  } catch (error) {
    console.log(error.message);
  }

}

const loadDashboard = async(req,res,next)=>{
  try {
    const sales = await order.find({status:'Delivered'}).count()
    const customers = await userData.find({}).count()
    const online = await order.find({paymentType: 'ONLINE'}).count()
    const cod = await order.find({paymentType:'COD'}).count()
    const wallet = await order.find({paymentType:'WALLET'}).count()
    const categorydata = await categoryData.find({})
    const ord = await order.find().populate({
      path: 'product.productId',
            populate: {
                path: 'category',
                model: categoryModel
            }
    })
    

    const categoryCount = {};
    ord.forEach(order => {
      order.product.forEach(product => {
        const category = product.productId.category.name;
        if(category in categoryCount) {
          categoryCount[category] += 1;
        }
        else{
          categoryCount[category] = 1;
        }
        console.log(order.product)
      });
    });

    const sortedCategoryCount = Object.entries(categoryCount).sort((a,b) => b[1] - a[1]);
    const numbersOnly = sortedCategoryCount.map(innerArray => innerArray[1]);
    const categoryNames = sortedCategoryCount.map((categoryCount) => {
      return categoryCount[0];
    });


    const revenueOfTheWeekly = await order.aggregate([
      {
          $match: {
              date: {
                  $gte: new Date(new Date().setDate(new Date().getDate() - 7))
              }, status: {
                  $eq: "Delivered"
              }
          }
      },
      {
          $group: {
              _id: null,
              Revenue: { $sum: "$total" }
          }
      }
  ])
  const weeklyRevenue = revenueOfTheWeekly.map((item) => {
      return item.Revenue;
  })




  const weeklySales = await order.aggregate([
    {
      $match: {
        date: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 7))
        },
        status: {
          $eq: "Delivered"
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%d-%m-%Y",
            date: "$date"
          }
        },
        sales: {
          $sum: "$total"
        }
      }
    },
    {
      $sort: {
        _id: 1
      }
    }
  ]);
  console.log(weeklySales);
  const date = weeklySales.map((item) => {
      return item._id;
  });
  const saless = weeklySales.map((item) => {
      return item.sales;
  });
    res.render('dashboard', {
      salesCount: sales,
      userCount: customers,
      revenueOfTheWeek: weeklyRevenue,
      upi: online, cash: cod, wallet:wallet,
      wsales: weeklySales,
      date: date,
      sales: saless,
      categoryName: categoryNames,
      catogorySaleCount:numbersOnly
  });
  } catch (error) {
    console.log(error.message);
    next(error.message)
  }
}

const verifyLogin = async(req,res)=>{
  try {
    
    const admEmail = process.env.ADMIN_EMAIL
    const admPass = process.env.ADMIN_PASS
    const email =req.body.email;
    const password = req.body.password;

    if(admEmail == email && admPass == password) {
      req.session.admin_id = admEmail;
      res.redirect('/admin/dashboard');
    }
    else{
      res.render('adminLogin', {message:"email and password is incorrect!"})
    }

  } catch (error) {
    console.log(error.message);
    next(error.message)
  }
}
const loadOrders = async(req,res,next)=> {
  try {
    
    const orderData = await order.find({}).sort({date:-1})
    .populate('product.productId').populate('userId')

    

    res.render('orders',{order:orderData})

  } catch (error) {
    next(error.message)
  }
}

const updateStatus = async(req,res,next)=> {
  try {
    const ordId = req.body.orderId;
    const status = req.body.newStatus;
    const update = await order.updateOne({_id:ordId},{$set:{status:status}})
    res.json(update)
  } catch (error) {
    next(error.message)
  }
}

const logOut = async(req,res,next)=>{
  try {
    req.session.admin_id = "";
    res.redirect('/admin');
  } catch (error) {
    console.log(error.message);
  }
}

const orderDetails = async(req,res)=>{
  try {
    const id = req.params.id
    const orderdata = await order.findOne({_id:id}).populate('product.productId').populate('userId')
    res.render('orderDetails',{order:orderdata})
  } catch (error) {
    console.log(error.message);
  }
}
//load sale
const Sales = async(req,res)=>{
  try {
    res.render('sales')
  } catch (error) {
    console.log(error.message);
  }

}
//load sales report
const salesReport = async(req,res,next)=> {
  try {
    
    const currentDate = new Date(req.body.to)
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate()+1)
    if(req.body.from.trim() == '' || req.body.to.trim() == ''){
      res.render('sales', {message: 'All fields are required'})
    }
    else {
      const salesData = await order.find({
        status:'Delivered',
        date:{$gte: new Date(req.body.from),
        $lte: new Date(newDate)}
      }).populate('product.productId').populate('userId')
     

      res.render('salesReport', {sales:salesData})
    }

  } catch (error) {
    next(error.message)
  }
}

const showBanner = async(req,res,next)=>  {
  try {
    const bannerInfo = await Banner.find({})
    if(req.session.admin_id){
      res.render('banner',{ banner: bannerInfo })
    }
  } catch (error) {
    next(error.message)
  }
}

const addBanner = async(req,res,next)=> {
  try {
    if(req.session.admin_id){
      res.render('addBanner')
    }
    else{
      res.redirect('/banner')
    }
  } catch (error) {
    next(error.message)
  }
}

const newBanner = async(req,res,next)=> {
  try {
    const addBannerData = new Banner({
      name: req.body.name,
      description: req.body.description,
      image: req.file.filename,
    });
    const bannerData = await addBannerData.save()
    if(bannerData){
      const banners = await Banner.find()
      res.render('banner',{ banner:banners })
    }
    else{
      console.log('Operation Failed');
    }
  } catch (error) {
    next(error.message)
  }
}
const loadeditBanner = async(req,res,next)=>{
  try {
    const id = req.query.id
    const bannerdata = await Banner.findOne({_id:id})
    console.log(bannerdata);
    res.render('editBanner',{banner:bannerdata})
  } catch (error) {
    console.log(error.message);
  }
}
const updatebanner = async(req,res)=>{
  try {
    const id = req.query.id
    
    const update = await Banner.updateOne({_id:id},{$set:{
      category:req.body.category,
      description:req.body.description,
      image:req.file.filename

    }})
    // fetch the updated banner data
    const bannerdata = await Banner.find({})

    res.render('banner',{banner:bannerdata})
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = {
  loadLogin,
  loadDashboard,
  verifyLogin,
  loadOrders,
  updateStatus,
  logOut,
  orderDetails,
  Sales,
  salesReport,
  showBanner,
  addBanner,
  newBanner,
  loadeditBanner,
  updatebanner

}

