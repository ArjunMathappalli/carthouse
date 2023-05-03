const User = require("../models/userModel");
const product = require("../models/productModel");
const category = require("../models/categoryModel");
const Banner = require("../models/bannerModel");
const couponData = require("../models/couponModel");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const session = require("express-session");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { default: mongoose } = require("mongoose");
const AccessToken = require("twilio/lib/jwt/AccessToken");
const accountsid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountsid, authToken);
const orderData = require("../models/orderModel");
const productModel = require("../models/productModel");
const { log } = require("console");
const { countDocuments } = require("../models/userModel");

var instance = new Razorpay({
  key_id: process.env.YOUR_KEY_ID,
  key_secret: process.env.YOUR_KEY_SECRECT,
});

const loadSignup = async (req, res, next) => {
  try {
    res.render("signup");
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

const loadLogin = async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
};

const loadHome = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      const id = req.session.user_id._id;
      const userInfo = await User.findOne({ _id: id });
      const productData = await product.find({});
      const bannerData = await Banner.find({});
      res.render("homePage", {
        user: userInfo,
        productInfo: productData,
        BannerData: bannerData,
      });
    } else {
      const productData = await product.find({});
      const bannerData = await Banner.find({});
      const userInfo = await User.findOne({});
      res.render("homePage", {
        productInfo: productData,
        BannerData: bannerData,
      });
    }
  } catch (error) {
    next(error.message);
  }
};

const verifyLogin = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    if (req.body.email.trim() == "" || req.body.password.trim() == "") {
      res.render("login", { message: "field cant be empty" });
    } else {
      const userCheck = await User.findOne({ email: email });
      if (userCheck) {
        if (userCheck.status == false) {
          res.render("login", {
            message: "Your account is blocked. Please contact support.",
          });
        } else {
          const passwordMatch = await bcrypt.compare(
            password,
            userCheck.password
          );
          if (passwordMatch) {
            req.session.user_id = userCheck;
            res.redirect("/");
          } else {
            res.render("login", { message: "Invalid email or password" });
          }
        }
      } else {
        res.render("login", { message: "Invalid email or password" });
      }
    }
  } catch (error) {
    next(error.message);
  }
};

const insertUser = async (req, res, next) => {
  const mobile = req.body.mno;
  try {
    // check if email, mobile, and username already exist
    const userWithEmail = await User.findOne({ email: req.body.email });
    const userWithMobile = await User.findOne({ mobile: req.body.mno });
    const userWithUsername = await User.findOne({ name: req.body.name });

    if (userWithEmail) {
      return res.render("signup", { message: "Email already exists." });
    }

    if (userWithMobile) {
      return res.render("signup", { message: "Mobile number already exists." });
    }

    if (userWithUsername) {
      return res.render("signup", { message: "Username already exists." });
    }

    // if email, mobile, and username are all unique, proceed with OTP verification
    const verifiedResponse = await client.verify.v2
      .services("VA3c7f4bd18a69a3ce8dab9c744459c60a")
      .verifications.create({
        to: `+91${mobile}`,
        channel: `sms`,
      });
    req.session.userData = req.body;
    res.render("otp");
  } catch (error) {
    next(error.message);
  }
};

const otpVerify = async (req, res, next) => {
  const otp = req.body.otp;
  try {
    const info = req.session.userData;
    const verifiedResponse = await client.verify.v2
      .services("VA3c7f4bd18a69a3ce8dab9c744459c60a")
      .verificationChecks.create({
        to: `+91${info.mno}`,
        code: otp,
      });
    if (verifiedResponse.status === "approved") {
      const passwordHash = await bcrypt.hash(info.password, 10); // hash the password with bcrypt
      const newUserData = new User({
        name: info.name,
        email: info.email,
        mobile: info.mno,
        password: passwordHash, // use the hashed password
      });
      const userData = await newUserData.save();
      const user = await User.findOne({ name: info.name });
      if (userData) {
        req.session.user_id = user;
        res.redirect("/");
      } else {
        res.render("otp", { message: "Entered Otp is Incorrect" });
      }
    }
  } catch (error) {
    next(error.message);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    res.render("resetPassword");
  } catch (error) {
    next(error.message);
  }
};

const sendReset = async (req, res) => {
  try {
    console.log(req.body);
    if (!req.body.mno) {
      throw new Error("Mobile number is not defined");
    }

    const existingNumber = await User.findOne({ mobile: req.body.mno });

    if (existingNumber) {
      console.log("ok");
      req.session.phone = req.body.mno;

      res.render("changePassword");
      client.verify.v2
        .services("VA3c7f4bd18a69a3ce8dab9c744459c60a")
        .verifications.create({ to: `+91${req.body.mno}`, channel: "sms" })
        .then((verification) => {
          console.log(req.body.mno);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      console.log("ji");
      res.render("resetPassword", { msg: "This Number is Not Registered" });
    }
  } catch (error) {
    console.log(error);
  }
};

const verifyReset = async (req, res) => {
  const { otp, password } = req.body;
  const phone = req.session.phone;
  console.log("otp:", otp);
  console.log("phone:", phone);

  try {
    const verification_check = await client.verify.v2
      .services("VA3c7f4bd18a69a3ce8dab9c744459c60a")
      .verificationChecks.create({ to: `+91${phone}`, code: otp });

    if (verification_check.status === "approved") {
      const passwordMatch = await bcrypt.hash(password, 10);
      await User.updateOne(
        { mobile: phone },
        { $set: { password: passwordMatch } }
      );

      req.session.otpcorrect = true;
      res.redirect("/login");
      msg = "Verfied Succesfully,Login with account";
    } else {
      res.render("changePassword", { msg: "Incorrect Otp" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while verifying OTP.");
  }
};

const showUser = async (req, res, next) => {
  try {
    if (req.session.admin_id) {
      const userInfo = await User.find({});
      res.render("user", { user: userInfo });
    } else {
      console.log("Not Working");
    }
  } catch (error) {
    next(error.message);
  }
};

const userActive = async (req, res) => {
  try {
    const id = req.query.id;

    const userstatus = await User.findOne({ _id: id });
    if (userstatus.status) {
      await User.updateOne({ _id: id }, { $set: { status: false } });
      req.session.user_id = null;
    } else {
      await User.updateOne({ _id: id }, { $set: { status: true } });
    }
    res.redirect("/admin/userPage");
  } catch (error) {
    console.log(error.message);
  }
};

const loadWishlist = async (req, res, next) => {
  try {
    const productData = await product
      .findOne({ status: true })
      .populate("category");
    const categoryData = await category.find({});

    const user = req.session.user_id;
    const userData = await User.findOne({ _id: user._id }).populate(
      "wishlist.product"
    );
    console.log(productData);
    res.render("wishlist", {
      user: userData,
      category: categoryData,
      product: productData,
    });
  } catch (error) {
    next(error.message);
  }
};

const addWishlist = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      const user = req.session.user_id;
      const proId = req.body.productId;
      const data = await User.findOne({
        _id: user._id,
        "wishlist.product": proId,
      });

      if (data) {
        res.json({ success: false });
      } else {
        const insert = await User.updateOne(
          { _id: user._id },
          { $push: { wishlist: { product: proId } } }
        );
        if (insert) {
          res.json({ success: true });
        }
      }
    } else {
      res.render("login", { message: "please login to your account" });
    }
  } catch (error) {
    next(error.message);
  }
};

const deleteWishlist = async (req, res, next) => {
  try {
    const user = req.session.user_id;
    const proId = req.body.productId;
    const data = await User.updateOne(
      { _id: user._id },
      { $pull: { wishlist: { product: proId } } }
    );

    if (data) {
      res.json({ success: true });
    }
  } catch (error) {
    next(error.message);
  }
};

const addTocart = async (req, res, next) => {
  try {
    const user = req.session.user_id;
    console.log(user);
    const proId = req.body.productId;
    console.log(proId);
    const price = req.body.productPrice;
    console.log(price);

    const data = await User.findOne({ _id: user._id, "cart.product": proId });
    console.log(data);
    if (data) {
      res.json({ success: false });
    } else {
      const insert = await User.updateOne(
        { _id: user._id },
        {
          $push: {
            cart: { product: proId, quantity: 1, productTotalPrice: price },
          },
        }
      );
      if (insert) {
        const deleted = await User.updateOne(
          { _id: user._id },
          { $pull: { wishlist: { product: proId } } }
        );
        if (deleted) {
          res.json({ success: true });

          const cart = await User.findOne({ _id: user._id });
          let sum = 0;
          for (let i = 0; i < cart.cart.length; i++) {
            sum = sum + cart.cart[i].productTotalPrice;
          }
          await User.updateOne(
            { _id: user._id },
            { $set: { cartTotalPrice: sum } }
          );
          res.json({ success: true, sum });
        }
      }
    }
  } catch (error) {
    next(error.message);
  }
};

const loadCart = async (req, res, next) => {
  try {
    const productData = await product
      .findOne({ status: true })
      .populate("category");
    const categoryData = await category.find({});

    const user = req.session.user_id;
    const userData = await User.findOne({ _id: user._id }).populate(
      "cart.product"
    );

    res.render("cart", {
      user: userData,
      product: productData,
      category: categoryData,
    });
  } catch (error) {
    next(error.message);
  }
};

const adjustQuantity = async (req, res, next) => {
  try {
    const user = req.session.user_id;
    const proId = req.body.productId;
    const QuantityCount = req.body.QuantityCount;
    const proPrice = req.body.proPrice;

    const productData = await product.findOne({ _id: proId, status: true });
    const stock = productData.stock;

    const adjustQuantity = await User.updateOne(
      { _id: user._id, "cart.product": proId },
      { $inc: { "cart.$.quantity": QuantityCount } }
    );
    const quantity = await User.findOne(
      { _id: user._id, "cart.product": proId },
      { _id: 0, "cart.quantity.$": 1 }
    );
    const qty = quantity.cart[0].quantity;
    const prodSinglePrice = proPrice * qty;

    await User.updateOne(
      { _id: user._id, "cart.product": proId },
      { $set: { "cart.$.productTotalPrice": prodSinglePrice } }
    );
    const cart = await User.findOne({ _id: user._id });

    let sum = 0;
    for (let i = 0; i < cart.cart.length; i++) {
      sum = sum + cart.cart[i].productTotalPrice;
    }

    const update = await User.updateOne(
      { _id: user._id },
      { $set: { cartTotalPrice: sum } }
    );
    res.json({ success: true, prodSinglePrice, sum });
  } catch (error) {
    next(error.message);
  }
};

const deleteCart = async (req, res, next) => {
  try {
    const user = req.session.user_id;
    const proId = req.body.productId;

    const data = await User.updateOne(
      { _id: user._id },
      { $pull: { cart: { product: proId } } }
    );
    if (data) {
      const cart = await User.findOne({ _id: user._id });
      let sum = 0;
      for (let i = 0; i < cart.cart.length; i++) {
        sum = sum + cart.cart[i].productTotalPrice;
      }

      await User.updateOne(
        { _id: user._id },
        { $set: { cartTotalPrice: sum } }
      );
      res.json({ success: true });
    }
  } catch (error) {
    next(error.message);
  }
};

const loadProfile = async (req, res, next) => {
  try {
    const user = req.session.user_id;
    const userData = await User.findOne({ _id: user._id });
    const productData = await product
      .find({ status: true })
      .populate("category");
    const categoryData = await category.find({ status: true });

    res.render("userProfile", {
      user: userData,
      category: categoryData,
      product: productData,
    });
  } catch (error) {
    next(error.message);
  }
};

const viewAddress = async (req, res, next) => {
  try {
    const user = req.session.user_id;
    const categoryData = await category.find({ status: true });
    const userData = await User.findOne({ _id: user._id });
    res.render("viewAddress", { user: userData, category: categoryData });
  } catch (error) {
    next(error.message);
  }
};

const loadAddAddress = async (req, res, next) => {
  try {
    const user = req.session.user_id;
    const categoryData = await category.find({ status: true });
    const userData = await User.findOne({ _id: user._id });
    res.render("addAddress", { user: userData, category: categoryData });
  } catch (error) {
    next(error.message);
  }
};
const addAddress = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      const user = req.session.user_id;
      if (
        req.body.Name.trim() == "" ||
        req.body.Housename.trim() == "" ||
        req.body.Street.trim() == "" ||
        req.body.District.trim() == "" ||
        req.body.State.trim() == "" ||
        req.body.Pincode.trim() == "" ||
        req.body.Country.trim() == "" ||
        req.body.Phone.trim() == ""
      ) {
        const categoryData = await category.find({ status: true });
        const userData = await User.findOne({ _id: user._id });
        res.render("addAddress", {
          message: "All Fields are required!",
          user: userData,
          category: categoryData,
        });
      } else {
        const data = await User.updateOne(
          { _id: user._id },
          {
            $push: {
              address: {
                name: req.body.Name,
                housename: req.body.Housename,
                street: req.body.Street,
                district: req.body.District,
                state: req.body.State,
                pincode: req.body.Pincode,
                country: req.body.Country,
                phone: req.body.phone,
              },
            },
          }
        );
        res.redirect("/viewAddress");
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    next(error.message);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    if (
      req.body.Name.trim() == "" ||
      req.body.Housename.trim() == "" ||
      req.body.Street.trim() == "" ||
      req.body.District.trim() == "" ||
      req.body.State.trim() == "" ||
      req.body.Pincode == "" ||
      req.body.Country.trim() == "" ||
      req.body.Phone == ""
    ) {
      const categoryData = await category.find({ status: true });
      const user = req.session.user_id;
      const userData = await User.findOne({ _id: user._id });
      res.render("viewAddress", {
        message: "Fields are empty",
        user: userData,
        category: categoryData,
      });
    } else {
      const user = req.session.user_id;
      const id = req.params.id;
      const data = await User.updateOne(
        { _id: user._id, "address._id": id },
        {
          $set: {
            "address.$": {
              name: req.body.Name,
              housename: req.body.Housename,
              street: req.body.Street,
              district: req.body.District,
              state: req.body.State,
              pincode: req.body.Pincode,
              country: req.body.Country,
              phone: req.body.Phone,
            },
          },
        }
      );
      res.redirect("/viewAddress");
    }
  } catch (error) {
    next(error.message);
  }
};

const removeAddress = async (req, res, next) => {
  try {
    const addId = req.body.addressId;
    const user = req.session.user_id;

    const data = await User.updateOne(
      { _id: user._id },
      { $pull: { address: { _id: addId } } }
    );
    if (data) {
      res.json({ success: true });
    }
  } catch (error) {
    next(error.message);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const data = req.body;
    const oldPass = data.oldPassword;
    const userData = await User.findOne({ _id: data.userId });
    if (userData) {
      const compare = await bcrypt.compare(oldPass, userData.password);
      if (compare) {
        if (data.newPassword == data.confirmPassword) {
          const hash = await bcrypt.hash(data.newPassword, 10);
          const update = await User.updateOne(
            { _id: data.userId },
            { $set: { password: hash } }
          );

          res.json({ success: true });
        } else {
          res, json({ different: true });
        }
      } else {
        res.json({ notmatch: true });
      }
    }
  } catch (error) {
    next(error.message);
  }
};

const modalAdAddress = async (req, res, next) => {
  try {
    const data = req.body;
    const oldPass = data.oldPassword;
    const userData = await User.findOne({ _id: data.userId });
    if (req.session.user_id) {
      const user = req.session.user_id;
      const update = await User.updateOne(
        { _id: user._id },
        {
          $push: {
            address: {
              name: req.body.name,
              housename: req.body.Housename,
              street: req.body.Street,
              district: req.body.District,
              state: req.body.State,
              pincode: req.body.Pincode,
              country: req.body.Country,
              phone: req.body.Phone,
            },
          },
        }
      );

      res.json({ success: true });
    }
  } catch (error) {
    next(error.message);
  }
};

const editProfile = async (req, res, next) => {
  try {
    if (req.body.Name.trim() == "" || req.body.email.trim() == "") {
      const categoryData = await category.find({ status: true });
      const user = req.session.user_id;
      const userData = await User.findOne({ _id: user._id });
      res.render("userProfile", {
        message: "Field are empty",
        user: userData,
        category: categoryData,
      });
    } else {
      if (req.session.user_id) {
        const user = req.session.user_id;
        const data = await User.updateOne(
          { _id: user._id },
          {
            $set: {
              name: req.body.Name,
              email: req.body.email,
            },
          }
        );
        res.redirect("/profile");
      } else {
        res.redirect("/login");
      }
    }
  } catch (error) {
    res.render("404");
  }
};

const loadCheckout = async (req, res) => {
  try {
    if (req.session.user_id) {
      const user = req.session.user_id;
      const userdata = await User.findOne({ _id: user._id }).populate(
        "cart.product"
      );
      const productdata = await product
        .find({ status: true })
        .populate("category");
      const categorydata = await category.find({});
      const coupon = await couponData.find({ $nor: [{ userUsed: user._id }] });
      console.log(coupon);
      if (userdata.cart[0] == null) {
        res.render("allProducts", {
          user: userdata,
          Product: productdata,
          category: categorydata,
          Coupon: coupon,
        });
      } else {
        res.render("checkout", {
          user: userdata,
          category: categorydata,
          Coupon: coupon,
        });
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadOrderSuccess = async (req, res) => {
  try {
    const user = req.session.user_id;
    const userdata = await User.findOne({ _id: user._id });
    const categorydata = await category.find({});
    const product = [];
    const orderdata = req.body;

    if (!Array.isArray(orderdata.productId)) {
      orderdata.productId = [orderdata.productId];
    }
    if (!Array.isArray(orderdata.quantity)) {
      orderdata.quantity = [orderdata.quantity];
    }
    if (!Array.isArray(orderdata.singleTotal)) {
      orderdata.singleTotal = [orderdata.singleTotal];
    }
    if (!Array.isArray(orderdata.singlePrice)) {
      orderdata.singlePrice = [orderdata.singlePrice];
    }

    for (let i = 0; i < orderdata.productId.length; i++) {
      let productId = orderdata.productId[i];
      let quantity = orderdata.quantity[i];
      let singleTotal = orderdata.singleTotal[i];
      let singlePrice = orderdata.singlePrice[i];
      product.push({
        productId: productId,
        quantity: quantity,
        singleTotal: singleTotal,
        singlePrice: singlePrice,
      });
    }

    if (req.body.paymentType == "COD") {
      const status = req.body.paymentType == "COD" ? "confirmed" : "pending";
      console.log(req.body.discount1+"lllllllllllllllllllllllllllllllllll")
      const total = req.body.total - req.body.discount1;

      const order = new orderData({
        userId: req.body.userId,
        deliveryAddress: req.body.address,
        product: product,
        total: total,
        paymentType: req.body.paymentType,
        orderId: `order_Id_${uuidv4()}`,
        status: status,
        discount: req.body.discount1,
        coupon: req.body.code,
        date: Date.now(),
      });
      const productdata = await order.save();
      if (productdata) {
        const deleteCart = await User.updateOne(
          { _id: user._id },
          {
            $pull: { cart: { product: { $in: orderdata.productId } } },
            $set: { cartTotalPrice: 0 },
          }
        );
        for (let i = 0; i < product.length; i++) {
          const productStock = await productModel.findById(
            product[i].productId
          );
          productStock.stock -= product[i].quantity;
          await productStock.save();
        }
        const coupon = await couponData.updateOne(
          { code: req.body.code },
          { $push: { userUsed: req.body.userId } }
        );
        console.log(coupon);

        res.json({ success: true });
      }
    } else if (req.body.paymentType == "ONLINE") {
      const total = req.body.total - req.body.discount1;
      console.log(total);
      const order = new orderData({
        userId: req.body.userId,
        deliveryAddress: req.body.address,
        product: product,
        total: total,
        paymentType: req.body.paymentType,
        orderId: `order_Id_${uuidv4()}`,
        status: "Payment failed",
        discount: req.body.discount1,
        coupon: req.body.code,
        date: Date.now(),
      });
      const productdata = await order.save();
      if (productdata) {
        const coupon = await couponData.updateOne(
          { code: req.body.code },
          { $push: { userUsed: req.body.userId } }
        );

        const latestOrder = await orderData.findOne({}).sort({ date: -1 });
        console.log(latestOrder, "eiuer");

        if (latestOrder) {
          let options = {
            amount: total * 100,
            currency: "INR",
            receipt: "" + latestOrder._id,
          };

          instance.orders.create(options, function (err, order) {
            if (err) {
              console.log("Error creating Razorpay order:", err);
              res.status(500).send("Error creating Razorpay order");
            } else {
              console.log("Razorpay order created successfully:", order);
              res.json({ viewRazorpay: true, order });
            }
          });
        }
      }
    } else if (req.body.paymentType == "WALLET") {
      const data = await User.findOne({ _id: user._id });

      if (req.body.total > data.wallet) {
        res.json({ inSufficient: true });
      } else {
        const total = req.body.total - req.body.discount1;
        const order = new orderData({
          userId: req.body.userId,
          deliveryAddress: req.body.address,
          product: product,
          total: total,
          paymentType: req.body.paymentType,
          orderId: `order_Id_${uuidv4()}`,
          status: "processing",
          discount: req.body.discount1,
          coupon: req.body.code,
          date: Date.now(),
        });
        const productdata = await order.save();
        if (productdata) {
          const deleteCart = await User.updateOne(
            { _id: user._id },
            {
              $pull: { cart: { product: { $in: orderdata.productId } } },
              $set: { cartTotalPrice: 0 },
            }
          );
          for (let i = 0; i < product.length; i++) {
            const productStock = await productModel.findById(
              product[i].productId
            );
            productStock.stock -= product[i].quantity;
            await productStock.save();
          }
          const coupon = await couponData.updateOne(
            { code: req.body.code },
            { $push: { userUsed: req.body.userId } }
          );
          console.log(coupon);
          const wallet = await User.updateOne(
            { _id: user._id },
            { $inc: { wallet: -req.body.total } }
          );
          res.json({ success: true });
        }
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const verifPpayment = async (req, res) => {
  try {
    const details = req.body;
    let hmac = crypto.createHmac("sha256", process.env.YOUR_KEY_SECRECT);
    hmac.update(
      details.payment.razorpay_order_id +
        "|" +
        details.payment.razorpay_payment_id
    );
    hmac = hmac.digest("hex");
    console.log(hmac);
    if (hmac == details.payment.razorpay_signature) {
      const latestOrder = await orderData.findOne({}).sort({ date: -1 }).lean();
      const change = await orderData.updateOne(
        { _id: latestOrder._id },
        { $set: { status: "confirmed" } }
      );
      console.log("here it is");
      // console.log(change);
      res.json({ status: true });
    } else {
      console.log("Fail");
      res.json({ failed: true });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const ordersuccess = async (req, res) => {
  try {
    const user = req.session.user_id;
    const userdata = await User.findOne({ _id: user._id });
    const categorydata = await category.find({});
    const coupondata = await couponData.findOne({});
    console.log(couponData);
    const orderdata = await orderData
      .findOne({ userId: user._id })
      .sort({ date: -1 })
      .populate("product.productId")
      .lean();
    console.log(orderdata, "orderdata");
    //stock deletion and cart clear of Online order
    if (orderdata.paymentType === "ONLINE") {
      for (let i = 0; i < orderdata.product.length; i++) {
        const deleteCart = await User.updateOne(
          { _id: user._id },
          {
            $pull: {
              cart: { product: { $in: orderdata.product[i].productId } },
            },
            $set: { cartTotalPrice: 0 },
          }
        );
        console.log(deleteCart, "jhjjhjh");
        const productStock = await product.findById(
          orderdata.product[i].productId
        );
        console.log(productStock);
        productStock.stock -= orderdata.product[i].quantity;
        await productStock.save();
      }
    }

    res.render("orderSuccess", {
      user: userdata,
      category: categorydata,
      order: orderdata,
    });
  } catch (error) {
    console.log(error.message);
    // res.render("404", { errorMessage: "An error occurred." });
  }
};

const viewOrders = async (req, res) => {
  try {
    const user = req.session.user_id;
    const categoryData = await category.find({});
    const userData = await User.findOne({ _id: user._id });
    const orderdata = await orderData
      .find({ userId: user._id })
      .sort({ date: -1 })
      .populate("product.productId");

    res.render("orderList", {
      user: userData,
      category: categoryData,
      order: orderdata,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const cancelOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const ordId = req.body.orderId;
    const status = "cancelled";

    const cancell = await orderData.updateOne(
      { _id: ordId },
      { $set: { status: status } }
    );

    if (cancell) {
      const orderdata = await orderData.findOne({ _id: ordId });

      if (
        orderdata.paymentType === "ONLINE" ||
        orderdata.paymentType === "WALLET"
      ) {
        const refund = await User.updateOne(
          { _id: orderdata.userId },
          { $inc: { wallet: orderdata.total } }
        );
      }

      for (let i = 0; i < orderdata.product.length; i++) {
        const data = await product.updateOne(
          { _id: orderdata.product[i].productId },
          { $inc: { stock: orderdata.product[i].quantity } }
        );
      }
      res.json({ success: true });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const returnOrder = async (req, res, next) => {
  try {
    const id = req.body.orderId;
    const status = "Return requested";
    const Return = await orderData.updateOne(
      { _id: id },
      { $set: { status: status } }
    );
    if (Return) {
      const orderdata = await orderData.findOne({ _id: id });
      if (
        orderdata.paymentType === "COD" ||
        orderdata.paymentType === "ONLINE" ||
        orderdata.paymentType === "WALLET"
      ) {
        const refund = await User.updateOne(
          { _id: orderdata.userId },
          { $inc: { wallet: orderdata.total } }
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error.message);
  }
};

const orderDetails = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = req.session.user_id;
    const categoryData = await category.find({});
    const userData = await User.findOne({ _id: user._id });
    const orderdata = await orderData
      .findOne({ _id: id })
      .populate("product.productId")
      .populate("orderId");

    res.render("orderDetails", {
      catgeory: categoryData,
      order: orderdata,
      user: userData,
    });
  } catch (error) {
    next(error.message);
  }
};
//allproduct
const allProducts = async (req, res) => {
  try {
    let page = 1;
    if (req.query.page) {
      page = req.body.page;
    }
    const limit = 12;
    const productdata = await product
      .find({ status: true })
      .populate("category")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const productcount = await product.find({}).countDocuments();
    let procount = Math.ceil(productcount / limit);
    const categorydata = await category.find({ status: true });

    if (req.session.user_id) {
      const user = req.session.user_id;
      const userdata = await User.findOne({ _id: user._id });
      res.render("allProducts", {
        Product: productdata,
        user: userdata,
        productCount: procount,
        category: categorydata,
      });
    } else {
      const userdata = await User.findOne({});
      res.render("allProducts", {
        Product: productdata,
        productCount: procount,
        category: categorydata,
        user: userdata,
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};
//category wise filtering
const categoryFilter = async (req, res) => {
  try {
    const id = req.params.id;
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 12;
    const productdata = await product
      .find({ category: id, status: true })
      .populate("category")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const productcount = await product.find({}).countDocuments();
    let procount = Math.ceil(productcount / limit);
    const categorydata = await category.find({ status: true });
    if (req.session.user_id) {
      const user = req.session.user_id;
      const userdata = await User.findOne({ _id: user._id });
      res.render("categories", {
        Product: productdata,
        user: userdata,
        productCount: procount,
        category: categorydata,
      });
    } else {
      res.render("categories", {
        Product: productdata,
        productCount: procount,
        category: categorydata,
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

// const priceLow = async(req,res,next)=>{
//   try {
//     const num = parseInt(req.query.value)
//     const productdata = await product.find({status:true}).sort({price:num})
//     const categorydata = await category.find({status:true})

//     if(req.session.user_id){
//       const user = req.session.user_id
//       const userdata = await User.findOne({_id:user})
//       res.render('allproducts',{
//         Product:productdata,
//         user:userdata,
//         category:categorydata
//       })
//     }else{
//       res.render('allProducts',{
//       Product:productdata,
//       category:categorydata,
//       })
//     }

//   } catch (error) {
//     console.log(error.message);
//   }
// }
// const price = async(req,res,next)=>{
//   try {
//     const low = parseInt(req.query.low)
//     const high = parseInt(req.query.high)
//     const categorydata = await category.find({status:true})
//     if(req.session.user_id){
//       const user = req.session.user_id
//       const userdata = await User.findOne({_id:user})
//       if(typeof req.query.high ==='undefined'){
//         const productdata = await product.find({$and:[{ price:{ $gte:low}}],status:true })
//         res.render('allProducts',{
//           Product:productdata,
//           user:userdata,
//           category:categorydata
//         })
//       }
//       else{
//         const productdata = await product.find({$and:[{price:{$gte:low}},{price:{$lt:high}}],status:true})
//         res.render('allProducts',{
//           Product:productdata,
//           user:userdata,
//           category:categorydata
//         })
//       }
//     }
//     else{
//       if(typeof req.query.high === null){
//         const productdata = await product.find({$and:[{price:{$gte:low}},{price:{$lt:high}}],status:true})
//         res.render('allProducts',{
//           Product:productdata,
//           category:categorydata
//         })
//       }
//       else{
//         const productdata = await product.find({$and:[{price:{$gte:low}},{price:{$lt:high}}],status:true})
//         res.render('allProducts',{
//           Product:productdata,
//           category:categorydata
//         })
//       }
//     }
//   } catch (error) {
//     console.log(error.message);
//   }
// }
// const search = async(req,res)=>{
//   try {
//     const user = req.session.user_id
//     const input = req.body.search
//     const result = new RegExp(input,'i')
//     const categorydata = await category.find({status:true})
//     const bannerdata = await Banner.find({})

//     let page = 1;
//     if(req.query.page){
//       page = req.query.page
//     }
//     const limit = 12
//     const productdata = await product.find({name: result,status:true}).populate('category')
//          .limit(limit * 1)
//          .skip((page-1)* limit)
//          .exec()
//     const productcount = await product.find({}).countDocuments()
//     let procount = Math.ceil(productcount/limit)

//     if(req.session.user_id){
//       const userdata = await User.findOne({ _id: user})
//       res.render('allProducts', {
//           user: userdata,
//           Product: productdata,
//           productCount: procount,
//           category: categorydata,
//           banner: bannerdata,

//       })
//   } else {
//       res.render('allProducts', {
//           Product: productdata,
//           category: categorydata,
//           productCount: procount,
//           banner: bannerdata,
//       })
//   }
//   } catch (error) {
//     console.log(error.message);
//   }
// }

const userlogOut = async (req, res, next) => {
  try {
    req.session.destroy();
    res.redirect("/login");
  } catch (error) {
    console.log(error.message);
  }
};

//filter Product
//filter Product
const filterProduct = async (req, res) => {
  try {
    let producte;
    let products = [];
    let Categorys;
    let Data = [];
    let Datas = [];

    const { categorys, search, filterprice, sort } = req.body;
    console.log(search, "123435445646757868");
    const sortOption = sort === "priceHighToLow" ? { price: -1 } : { price: 1 };
    if (!search) {
      if (filterprice != 0) {
        if (filterprice.length == 2) {
          producte = await product
            .find({
              status: true,
              $and: [
                { price: { $lte: Number(filterprice[1]) } },
                { price: { $gte: Number(filterprice[0]) } },
              ],
            })
            .populate("category")
            .sort(sortOption);
        } else {
          producte = await product
            .find({
              status: true,
              $and: [{ price: { $gte: Number(filterprice[0]) } }],
            })
            .populate("category");
        }
      } else {
        producte = await product.find({ status: true }).populate("category");
      }
    } else {
      if (filterprice != 0) {
        if (filterprice.length == 2) {
          console.log("searchhhhhhhhhhhhh");
          producte = await product
            .find({
              status: true,
              $and: [
                { price: { $lte: Number(filterprice[1]) } },
                { price: { $gte: Number(filterprice[0]) } },
                {
                  $or: [
                    {
                      name: {
                        $regex: "." + search + ".",
                        $options: "i",
                      },
                    },
                  ],
                },
              ],
            })
            .populate("category")
            .sort(sortOption);
        } else {
          producte = await product
            .find({
              status: true,
              $and: [
                { price: { $gte: Number(filterprice[0]) } },
                {
                  $or: [
                    {
                      name: {
                        $regex: "." + search + ".",
                        $options: "i",
                      },
                    },
                  ],
                },
              ],
            })
            .populate("category")
            .sort(sortOption);
        }
      } else {
        producte = await product
          .find({
            status: true,
            $or: [{ name: { $regex: "." + search + ".", $options: "i" } }],
          })
          .populate("category");
      }
    }
    console.log(producte);
    Categorys = categorys.filter((value) => {
      return value !== null;
    });

    if (Categorys[0]) {
      Categorys.forEach((element, i) => {
        products[i] = producte.filter((value) => {
          return value.category.name == element;
        });
      });
      console.log(producte);

      products.forEach((value, i) => {
        Data[i] = value.filter((v) => {
          return v;
        });
      });

      Datas.forEach((value, i) => {
        Data[i] = value;
      });
    } else {
      Data[0] = producte;
    }
    console.log(Data);
    res.json({ Data });
  } catch (error) {
    console.log(error.message);
  }
};

// remove coupon
const removecoupon = async (req, res) => {
  try {
    const user = req.session.user_id;
    const couponId = req.body.couponId;

    const data = await User.updateOne(
      { _id: user._id },
      { $pull: { coupons: { _id: couponId } } }
    );

    if (data) {
      const updatedUser = await User.findOne({ _id: user._id });
      res.json({ success: true, coupons: updatedUser.coupons });
    }
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  loadSignup,
  loadLogin,
  insertUser,
  otpVerify,
  loadHome,
  verifyLogin,
  showUser,
  userActive,
  resetPassword,
  sendReset,
  verifyReset,
  loadWishlist,
  addWishlist,
  deleteWishlist,
  loadCart,
  addTocart,
  adjustQuantity,
  deleteCart,
  loadProfile,
  viewAddress,
  loadAddAddress,
  addAddress,
  updateAddress,
  editProfile,
  removeAddress,
  changePassword,
  loadCheckout,
  loadOrderSuccess,
  ordersuccess,
  modalAdAddress,
  cancelOrder,
  orderDetails,
  returnOrder,
  viewOrders,
  verifPpayment,
  allProducts,
  categoryFilter,
  // priceLow,
  // price,
  // search,
  userlogOut,
  filterProduct,
  removecoupon,
};
