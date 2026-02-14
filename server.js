const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // serve uploaded files

/* ================= UPLOAD FOLDER ================= */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});
const upload = multer({ storage });

app.post("/upload", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No files uploaded" });
  }
  console.log("FILES RECEIVED:", req.files.map(f => f.filename));
  res.json({ success: true, uploadedFiles: req.files.map(f => f.filename) });
});

/* ================= RAZORPAY ================= */
const razorpay = new Razorpay({
  key_id: "rzp_test_SEWq0s9qENRJ4Z", // apni key
  key_secret: "dT6yr2cD8mdSbCqBQBHEqN0w", // apna secret
});
console.log("Razorpay initialized");

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => res.send("Backend running"));

/* ================= CREATE ORDER ================= */
app.post("/create-order", async (req, res) => {
  try {
    const { pages, copies, printType } = req.body;
    if (!pages || !copies) return res.status(400).json({ error: "Pages or copies missing" });

    const price = printType === "color" ? 10 : 5;
    const amount = pages * copies * price * 100;

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
      if (!fileName) return res.status(400).json({ success: false, message: "FileName missing" });

      const code = Math.floor(100000 + Math.random() * 900000);

      let codes = [];
      if (fs.existsSync("codes.json")) codes = JSON.parse(fs.readFileSync("codes.json"));

      codes.push({ code: code, file: fileName });
      fs.writeFileSync("codes.json", JSON.stringify(codes, null, 2));

      console.log("Payment verified. Generated Code:", code);
      console.log("All stored codes:", codes);

      res.json({ success: true, code });
    } else {
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

    console.log("Entered Code:", code);
    console.log("Stored Codes:", codes);

    const order = codes.find(c => c.code === Number(code));
    if (order) {
      codes = codes.filter(c => c.code !== Number(code));
      fs.writeFileSync("codes.json", JSON.stringify(codes, null, 2));

      console.log("Valid code. Printing triggered. File:", order.file);
      res.json({
        valid: true,
        fileUrl: `https://a4stationbackend.onrender.com/uploads/${order.file}`
      });
    } else {
      console.log("Invalid code");
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
