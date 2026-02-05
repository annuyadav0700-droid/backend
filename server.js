// ===== IMPORTS =====
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

// ===== APP INIT =====
const app = express();
app.use(express.json());
app.use(cors()); // Allow frontend requests

// ===== RAZORPAY INSTANCE =====
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Render ENV variable
  key_secret: process.env.RAZORPAY_KEY_SECRET // Render ENV variable
});

// ===== CREATE ORDER =====
app.post("/create-order", async (req, res) => {
  try {
    console.log("Create-order body:", req.body);

    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount missing" });
    }

    const options = {
      amount: amount * 100, // backend multiply, frontend sends rupees
      currency: "INR",
      receipt: "receipt_" + Date.now()
    };

    const order = await razorpay.orders.create(options);
    console.log("Order created:", order);

    res.json(order); // send order back to frontend

  } catch (err) {
    console.log("CREATE ORDER ERROR:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

// ===== VERIFY PAYMENT =====
app.post("/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: "Signature mismatch" });
    }
  } catch (err) {
    console.log("VERIFY PAYMENT ERROR:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// ===== SERVER START =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
