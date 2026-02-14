const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

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

/* ================= FILE UPLOAD ================= */
app.post("/upload", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ success: false, message: "No files uploaded" });

  console.log("FILES RECEIVED:", req.files.map(f => f.filename));
  res.json({ success: true, uploadedFiles: req.files.map(f => f.filename) });
});

/* ================= VERIFY PAYMENT (TEST + REAL) ================= */
app.post("/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", "dT6yr2cD8mdSbCqBQBHEqN0w")
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {

      // Generate 6 digit code
      const code = Math.floor(100000 + Math.random() * 900000);

      // Read existing codes
      let codes = [];
      if (fs.existsSync("codes.json")) {
        codes = JSON.parse(fs.readFileSync("codes.json"));
      }

      // Save new code
      codes.push(code);
      fs.writeFileSync("codes.json", JSON.stringify(codes));

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

    if (fs.existsSync("codes.json")) {
      codes = JSON.parse(fs.readFileSync("codes.json"));
    }

    console.log("Entered Code:", code);
    console.log("Stored Codes:", codes);

    if (codes.includes(Number(code))) {

      // Remove used code
      codes = codes.filter(c => c !== Number(code));
      fs.writeFileSync("codes.json", JSON.stringify(codes));

      console.log("Valid code. Printing triggered.");

      res.json({ valid: true });

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
