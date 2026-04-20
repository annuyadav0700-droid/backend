const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
const admin = require("firebase-admin");

// 🔥 Firebase setup
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

/* ================= UPLOAD FOLDER ================= */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

app.post("/upload", upload.array("files"), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.json({ success: false });
    }

    console.log("Uploaded file:", req.files[0].filename);

    res.json({
      success: true,
      filename: req.files[0].filename,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.json({ success: false });
  }
});

/* ================= RAZORPAY ================= */
const razorpay = new Razorpay({
  key_id: "rzp_test_SZLF8MfqEd0ec7",
  key_secret: "z658WQUfO9Wwu8jX6LSq0IV0",
});

/* ================= CREATE ORDER ================= */
app.post("/create-order", async (req, res) => {
  try {
    const { pages, copies, printType } = req.body;

    if (!pages || !copies) {
      return res.status(400).json({ error: "Pages or copies missing" });
    }

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
app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      fileName,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", "z658WQUfO9Wwu8jX6LSq0IV0")
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    // ✅ Generate OTP
    const code =
      "A4" +
      new Date().getHours() +
      new Date().getMinutes() +
      Math.floor(100 + Math.random() * 900);

    const orderId = Date.now().toString();

    // ✅ Save in Firebase
    await db.collection("orders").doc(orderId).set({
      code: code,
      file: fileName || "no-file",
      status: "pending",
      createdAt: new Date(),
    });

    console.log("PAYMENT VERIFIED:", code);

    res.json({ success: true, code, orderId });
  } catch (err) {
    console.error("VERIFY PAYMENT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= VERIFY ORDER (KIOSK) ================= */
app.post("/verify-order", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ valid: false, message: "Code is required" });
    }

    // 🔍 Query by code field (KioskApp only sends the code, not orderId)
    const snapshot = await db
      .collection("orders")
      .where("code", "==", String(code))
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({ valid: false, message: "Invalid or already used code" });
    }

    const orderDoc = snapshot.docs[0];
    const data = orderDoc.data();

    if (!data.file || data.file === "no-file") {
      return res.json({ valid: false, message: "No file attached to this order" });
    }

    // ✅ Mark as verified so kiosk-printer agent picks it up
    await orderDoc.ref.update({ status: "verified" });

    console.log("✅ OTP VERIFIED for file:", data.file);

    res.json({
      valid: true,
      fileUrl: `https://a4stationbackend.onrender.com/uploads/${data.file}`,
    });
  } catch (err) {
    console.error("VERIFY ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= TEST ================= */
app.get("/test", async (req, res) => {
  try {
    await db.collection("test").add({
      name: "working",
      time: new Date(),
    });

    res.send("Firebase working ✅");
  } catch (error) {
    res.status(500).send("Firebase error ❌");
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));