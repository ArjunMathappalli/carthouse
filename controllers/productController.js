const product = require('../models/productModel');
const Category = require('../models/categoryModel');

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
            imagearray.push(file.filename)
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

const productDetails = async(req,res)=> {
    
    const productId = req.query.id;
    const productInfo = await product.findOne({_id:productId}).populate('category')
  try {

    res.render('singleProduct',{ productDetails : productInfo })
    
  } catch (error) {
    next(error.message)
  }
}



module.exports = {
  showProduct,
  newProduct,
  addProduct,
  deleteProduct,
  editProduct,
  updateProduct,
  productControl,
  productDetails
}