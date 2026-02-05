const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// Test route
app.get("/", (req, res) => {
  res.send("A4station Backend running 🚀");
});


// HELPER 6 DIGIT CODE
function generateOrderCode() {
  return Math,floor(100000+Math.random()
* 900000).toString();
}


// 🔹 CREATE ORDER API
app.post("/create-order", async (req, res) => {
  try{
    const {pages, copies, printType} = req.body;
    let pricePerPage;
    if (printType === "color") {
      pricePerPage = 10;
    } else if (printType ==="bw") {
       pricePerPage = 5;
      } else {
        pricePerPage =5;
      }
    const total = Number (pages)*Number (copies) * pricePerPage;
    console.log("PRINT TYPE:",printType);
    console.log("PAGES:",pages);
    console.log("COPIES:", copies);
    console.log("PRICE PER PAGE:", pricePerPage);
    console.log("TOTAL ₹:", total);
    const options = {
      amount: total*100,
      currency :"INR",
      receipt : "receipt_"+Date.now(),
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating order");
  }

  });
  
   
    


// 🔹 VERIFY PAYMENT API
app.post("/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const orderCode = generateOrderCode();

      res.json({ success: true, 
        message: "Payment verified ✅",
      orderCode:orderCode,
     });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature ❌" });
    } 
  } catch (error) {
    console.log("Verification Error:", error);
    res.status(500).json({ success: false });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
