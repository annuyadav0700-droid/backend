const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const multer= require("multer");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());

//=====upload folder====
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null,"uploads/"),
  filename: (req, file,cb) =>cb(null,
    Date.now() + "_" + file.originalname
  ),
});
const upload = multer({storage});
app.post("/upload",upload.array("files"),
(req, res) => {
  console.log("FILES RECEIVED:", req.files);
  res.json ({success:true});
});

// 🔑 Razorpay instance
const razorpay = new Razorpay({
  key_id: "rzp_test_SEWq0s9qENRJ4Z", // ← apni TEST key
  key_secret: "dT6yr2cD8mdSbCqBQBHEqN0w", // ← apna secret
});

console.log("Razorpay initialized");

// 🟢 Health check
app.get("/", (req, res) => {
  res.send("Backend running");
});

// 🟢 CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body);

    const { pages, copies, printType } = req.body;

    if (!pages || !copies) {
      return res.status(400).json({ error: "Pages or copies missing" });
    }

    const price = printType === "color" ? 10 : 5;
    const amount = pages * copies * price * 100; // paise

    console.log("FINAL AMOUNT (paise):", amount);

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    console.log("ORDER CREATED:", order.id);

    res.json(order);
  } catch (err) {
    console.error("🔥 CREATE ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🟢 VERIFY PAYMENT
app.post("/verify-payment", (req, res) => {
  try {
    console.log("VERIFY BODY:", req.body);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", "dT6yr2cD8mdSbCqBQBHEqN0w") // same secret yaha bhi
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const code = Math.floor(100000 + Math.random() * 900000);
      console.log("PAYMENT VERIFIED, CODE:", code);
      res.json({ success: true, code });
    } else {
      console.log("SIGNATURE MISMATCH");
      res.status(400).json({ success: false });
    }
  } catch (err) {
    console.error("🔥 VERIFY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// ====== VERIFY ORDER CODE (for kiosk screen) ======
app.post("/verify-order", (req, res) => {
  try {
    const { code } = req.body;
    console.log("Received order code:", code); // terminal log

    // Example: valid codes (ya db me save codes / Razorpay generated codes se compare)
    const validCodes = [123456, 654321, 111111]; // test codes
    if (validCodes.includes(Number(code))) {
      console.log("Order valid, proceed to print");

      // ===== Print command placeholder =====
      console.log("🔹 PRINT COMMAND TRIGGERED");

      res.json({ valid: true });
    } else {
      console.log("Invalid order code");
      res.json({ valid: false });
    }
  } catch (err) {
    console.error("🔥 VERIFY ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🟢 START SERVER
app.listen(5000, () => console.log("🚀 Server running on port 5000"));
