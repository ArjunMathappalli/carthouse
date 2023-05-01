const product = require('../models/productModel');
const User = require('../models/userModel');
const Orders = require('../models/orderModel')
const Category = require('../models/categoryModel');
const mime = require("mime-types");

const showProduct = async(req,res,next)=> {
  try {
    if(req.session.admin_id){
      const productId = await product.find().populate('category')
      const categoryData = await Category.find()
      res.render('products',{ product:productId, category:categoryData })
    }
  } catch (error) {
    next(error.message)
  }
}

const newProduct = async(req,res,next)=> {
  try {
    if(req.session.admin_id){
      const categories = await Category.find()
      res.render('addProducts',{categories : categories})
    }
  } catch (error) {
    next(error.message)
  }
}


const addProduct = async(req,res,next)=> {
  try {
    const imagearray = [];
        for(file of req.files){
          const mimeType = mime.lookup(file.originalname)
          if (mimeType && mimeType.includes("image/")) {
            imagearray.push(file.filename)
          } else {
            res.render('addproduct',{message:"Enter Valid Image"})
          }
        }
        const Product = new product({
            name:req.body.name,
            price:req.body.price,
            description:req.body.description,
            image:imagearray,
            category:req.body.category,
            stock:req.body.stock,
        })
        const productData = await Product.save()
        if(productData){
            res.redirect('/admin/products')
        }else{
            res.render('addproduct',{message:"action failed"})
        }
  } catch (error) {
    console.log(error.message);
  }
}


const deleteProduct = async(req,res,next)=> {
  try {
    if(req.session.admin_id){
      const id = req.query.id;
      const productId = await product.deleteOne({_id:id})
      res.redirect('/admin/products')
    }
  } catch (error) {
    console.log(error.message);
    next(error.message)
  }
}

const editProduct = async(req,res,next)=> {
  try {
    if(req.session.admin_id){
      const id = req.query.id;
      const categories = await Category.find({})
      const productId = await product.findById({_id:id}).populate('category')
      res.render('editProduct',{ productId , categories})
    }
  } catch (error) {
    console.log(error.message);
    next(error.message)
  }
}

const updateProduct = async(req,res)=>{
  const id = req.query.id
          const productData = await product.findOne({_id:id}).populate("category")
          const categoryData = await Category.find({})
  if (req.body.product == "" ||req.body.image == '' || req.body.category== "" || req.body.description == '' ||req.body.stock == '' || req.body.price == '') {
          res.render('editproduct',{productdata:productData,categorydata:categoryData,message:"All Fields Are Required"})
  }else{

  try {
      if(req.files){
        for(file of req.files){
          productData.image.push(file.filename)
      }
      console.log(productData.image)
      
      }
      console.log("hwhwdhd");
      
          
          await product.updateOne({_id:id},{$set:{
              name:req.body.product,
              category:req.body.category,
              image:productData.image,
              description:req.body.description,
              stock:req.body.stock,
              price:req.body.price,
      }})
      
  
  res.redirect('/admin/products')
 
  } catch (error) {
      console.log(error.message);
  }
}
}

const productControl = async (req, res) => {
  try {
      const id = req.query.id

      const productStatus = await product.findOne({ _id: id })

      if (productStatus.status) {

          await product.updateOne({ _id: id }, { $set: { status: false } })
          // req.session.user_id = null
      } else {
          await product.updateOne({ _id: id }, { $set: { status: true } })

      }
      res.redirect('/admin/products')

  } catch (error) {
      console.log(error.message);
  }
}

const productDetails = async(req,res,next)=> {
    const user = req.session.user_id
    const productId = req.query.id;
    const session = req.session.user_id;
    const productInfo = await product.findOne({_id:productId}).populate('category')
  try {
    
      
      const userData = await User.findOne({})
    
    const order = await Orders.findOne({
      userId: session,
      "product.productId": productId,
    });
    const hasPurchasedProduct = !!order;
    res.render('singleProduct',{user :userData , productDetails : productInfo,hasPurchasedProduct })
    
  } catch (error) {
    next(error.message)
    res.render("404", { errorMessage: "An error occurred." });
  }
}

const addReview = async (req, res) => {
  try {
    const session = req.session.user_id;
    console.log(session._id+"nnnnnnnnnnnnnnnnnnnnnnnnnnn")
    const name = req.body.name;
    const review = req.body.message;
    const productId = req.query.id;
    if (!session) {
      res.redirect("/login");
      message = "Login with your account to access this page";
    }
    const user = await User.findById({ _id: session._id });
    const order = await Orders.findOne({
      userId: session,
      "product.productId": productId,
    });

    if (!order) {
      return res.status(200).json({
        message:
          "You can't review this product,purchase this product and make review",
      });
    } else {
      console.log(productId);
      const products = await product.findById({ _id: productId });

      if (!products.reviews) {
        products.reviews = [];
      }

      product.findOneAndUpdate(
        { _id: productId },
        {
          $push: {
            review: {
              userName: name,
              message: review,
            },
          },
        },
        { new: true }
      )
        .then((updatedProduct) => {
          console.log("Product updated:", updatedProduct);
        })
        .catch((err) => {
          console.error("Error updating product:", err);
        });

      res.redirect("/singleProduct?id=" + productId);
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  showProduct,
  newProduct,
  addProduct,
  deleteProduct,
  editProduct,
  updateProduct,
  productControl,
  productDetails,
  addReview
}