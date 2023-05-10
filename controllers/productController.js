const product = require("../models/productModel");
const User = require("../models/userModel");
const Orders = require("../models/orderModel");
const Category = require("../models/categoryModel");
const mime = require("mime-types");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: "dfglclpfl",
  api_key: "523998454773474",
  api_secret: "_VL9oukciM1FTRw2b0x_uAHjFgA",
});

const showProduct = async (req, res, next) => {
  try {
    if (req.session.admin_id) {
      const productId = await product.find().populate("category");
      const categoryData = await Category.find();
      res.render("products", { product: productId, category: categoryData });
    }
  } catch (error) {
    next(error.message);
  }
};

const newProduct = async (req, res, next) => {
  try {
    if (req.session.admin_id) {
      const categories = await Category.find();
      res.render("addProducts", { categories: categories });
    }
  } catch (error) {
    next(error.message);
  }
};

const addProduct = async (req, res, next) => {
  try {
    const imagearray = [];
    for (file of req.files) {
      const mimeType = mime.lookup(file.originalname);
      if (mimeType && mimeType.includes("image/")) {
        const result = await cloudinary.uploader.upload(file.path);
        imagearray.push(result.secure_url);
      } else {
        res.redirect("addproduct", { message: "Enter Valid Image" });
      }
    }
    const categoryfind = await Category.find({ _id: req.body.category });
    let categoryName = categoryfind[0].name;
    console.log(categoryfind);
    console.log(categoryName, "asdfggh");
    const Product = new product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      image: imagearray,
      category: req.body.category,
      catName: categoryName,
      stock: req.body.stock,
    });

    const productData = await Product.save();
    if (productData) {
      res.redirect("/admin/products");
    } else {
      res.redirect("addproduct", { message: "action failed" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    if (req.session.admin_id) {
      const id = req.query.id;
      const productId = await product.deleteOne({ _id: id });
      res.redirect("/admin/products");
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

const editProduct = async (req, res, next) => {
  try {
    if (req.session.admin_id) {
      const id = req.query.id;
      const categories = await Category.find({});
      const productId = await product
        .findById({ _id: id })
        .populate("category");
      res.render("editProduct", { productId, categories });
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

const updateProduct = async (req, res) => {
  const id = req.query.id;
  const productData = await product.findOne({ _id: id }).populate("category");
  const categoryData = await Category.find({});
  if (
    req.body.product == "" ||
    req.body.image == "" ||
    req.body.category == "" ||
    req.body.description == "" ||
    req.body.stock == "" ||
    req.body.price == ""
  ) {
    res.redirect("editproduct", {
      productdata: productData,
      categorydata: categoryData,
      message: "All Fields Are Required",
    });
  } else {
    try {
      if (req.files) {
        for (file of req.files) {
          productData.image.push(file.filename);
        }
      }

      await product.updateOne(
        { _id: id },
        {
          $set: {
            name: req.body.product,
            category: req.body.category,
            image: productData.image,
            description: req.body.description,
            stock: req.body.stock,
            price: req.body.price,
          },
        }
      );

      res.redirect("/admin/products");
    } catch (error) {
      console.log(error.message);
    }
  }
};

const productControl = async (req, res) => {
  try {
    const id = req.query.id;

    const productStatus = await product.findOne({ _id: id });

    if (productStatus.status) {
      await product.updateOne({ _id: id }, { $set: { status: false } });
      // req.session.user_id = null
    } else {
      await product.updateOne({ _id: id }, { $set: { status: true } });
    }
    res.redirect("/admin/products");
  } catch (error) {
    console.log(error.message);
  }
};

const productDetails = async (req, res, next) => {
  const user = req.session.user_id;
  const productId = req.query.id;
  const session = req.session.user_id._id;
  console.log(session);
  const productInfo = await product
    .findOne({ _id: productId })
    .populate("review.userId")
    .populate("category");
  try {
    const reviewData = productInfo.review;
    const reviewList = [];
    // Loop through each review
    for (let i = 0; i < reviewData.length; i++) {
      const review = reviewData[i];
      if (review.userId._id) {
        const isEditable = review.userId._id.toString() === session.toString();
        const reviewItem = {
          review: review.review,
          isEditable: isEditable,
        };
        reviewList.push(reviewItem);
      }
    }
    const userData = await User.findOne({ _id: user });
    const order = await Orders.findOne({
      userId: session,
      "product.productId": productId,
    });
    const hasPurchasedProduct = !!order;
    res.render("singleProduct", {
      user: userData,
      productDetails: productInfo,
      hasPurchasedProduct,
      reviewList,
    });
  } catch (error) {
    next(error.message);
    res.render("404", { errorMessage: "An error occurred." });
  }
};

const addReview = async (req, res) => {
  try {
    const session = req.session.user_id;
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
      const products = await product.findById({ _id: productId });

      if (!products.reviews) {
        products.reviews = [];
      }

      product
        .findOneAndUpdate(
          { _id: productId },
          {
            $push: { review: { userId: session, review: review } },
          },
          { new: true }
        )
        .then((updatedProduct) => {})
        .catch((err) => {
          console.error("Error updating product:", err);
        });

      res.redirect("/singleProduct?id=" + productId);
    }
  } catch (error) {
    console.log(error);
  }
};

const editReview = async (req, res) => {
  try {
    const productId = req.query.id;
    const index = req.query.index;
    const products = await product.findById({ _id: productId });
    const review = products.review[index];
    res.render("Editreview", {
      products,
      review,
      session: req.session.user_id._id,
    });
  } catch (error) {
    console.log(error);
  }
};

const updatedReview = async (req, res) => {
  try {
    const productId = req.body.id;
    const reviewIndex = req.body.index;
    const reviewData = {
      review: req.body.message,
    };
    const updatedProduct = await product.findOneAndUpdate(
      {
        _id: productId,
        "review._id": reviewIndex,
      },
      {
        $set: {
          "review.$.review": reviewData.review,
        },
      },
      {
        new: true,
      }
    );

    if (updatedProduct) {
      res.redirect("/singleProduct?id=" + productId);
    } else {
      res.status(404).send("Product not found");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteReview = async (req, res) => {
  try {
    const productId = req.query.id;
    const index = req.query.index;
    const deleteReview = await product.updateOne(
      { _id: productId },
      { $unset: { [`review.${index}`]: "" } }
    );
    await product.updateOne({ _id: productId }, { $pull: { review: null } });
    res.redirect("/singleProduct?id=" + productId);
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
  addReview,
  updatedReview,
  editReview,
  deleteReview,
};
