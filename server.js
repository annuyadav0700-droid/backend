const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());

/* ================= UPLOAD FOLDER ================= */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

app.post("/upload", upload.array("files"), (req, res) => {
  console.log("FILES RECEIVED:", req.files);
  res.json({ success: true, files: req.files.map(f => f.filename) });
});

/* ================= RAZORPAY ================= */
const razorpay = new Razorpay({
  key_id: "rzp_test_SEWq0s9qENRJ4Z", // apni key
  key_secret: "dT6yr2cD8mdSbCqBQBHEqN0w", // apna secret
});

console.log("Razorpay initialized");

/* ================= CREATE ORDER ================= */
app.post("/create-order", async (req, res) => {
  try {
    const { pages, copies, printType } = req.body;
    if (!pages || !copies) return res.status(400).json({ error: "Pages or copies missing" });

    const price = printType === "color" ? 10 : 5;
    const amount = pages * copies * price * 100; // paise

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= VERIFY PAYMENT ================= */
app.post("/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fileName } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", "dT6yr2cD8mdSbCqBQBHEqN0w")
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {

      // Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000);

      // Read existing codes
      let codes = [];
      if (fs.existsSync("codes.json")) codes = JSON.parse(fs.readFileSync("codes.json"));

      codes.push({ code, file: fileName }); // save OTP + filename
      fs.writeFileSync("codes.json", JSON.stringify(codes, null, 2));

      console.log("PAYMENT VERIFIED, OTP GENERATED:", code);
      console.log("Stored codes:", codes);

      res.json({ success: true, code });
    } else {
      console.log("SIGNATURE MISMATCH");
      res.status(400).json({ success: false });
    }
  } catch (err) {
    console.error("VERIFY PAYMENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= VERIFY ORDER (KIOSK) ================= */
app.post("/verify-order", (req, res) => {
  try {
    const { code } = req.body;

    let codes = [];
    if (fs.existsSync("codes.json")) codes = JSON.parse(fs.readFileSync("codes.json"));

    const order = codes.find(c => c.code === Number(code));

    if (order) {
      // Remove used OTP
      codes = codes.filter(c => c.code !== Number(code));
      fs.writeFileSync("codes.json", JSON.stringify(codes, null, 2));

      console.log("OTP VERIFIED, file ready to print:", order.file);

      res.json({
        valid: true,
        fileUrl: `https://a4stationbackend.onrender.com/uploads/${order.file}`
      });
    } else {
      console.log("INVALID OTP");
      res.json({ valid: false });
    }
  } catch (err) {
    console.error("VERIFY ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
