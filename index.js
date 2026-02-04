require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function generateOrderCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🟢 Create Order API
app.post("/create-order", async (req, res) => {
  try {
  

  
    const {amount} = req.body;
    if(!amount){
      return
      res.status(400).json({success:false,message:"Amount required"});
    }
    const options ={
    amount: req.body.amount*100,
    currency: "INR",
    receipt: "receipt_" + Date.now(),
  };
  const order = await razorpay.orders.create(options);
  const orderCode = generateOrderCode(); 

    res.json({
      success:true,
      orderId: order.id,
    amount: order.amount,orderCode,
  });
  } catch (err){
    console.log(err);
    res.status(500).json({success:false});
  }
});

// 🟢 Verify Payment API
app.post("/verify-payment", (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    const orderCode = generateOrderCode();
    res.json({ success: true, orderCode });
  } else {
    res.json({ success: false });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));