const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let orders = {}; // memory database

// 🔹 CREATE ORDER AFTER PAYMENT
app.post("/create-order", (req, res) => {
  const { totalAmount, paidAmount } = req.body;

  if (paidAmount >= totalAmount) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    orders[code] = {
      paid: true,
      printed: false,
    };

    res.json({ orderCode: code });
  } else {
    res.status(400).json({ message: "Payment incomplete" });
  }
});

// 🔹 VERIFY ORDER FOR PRINTING
app.post("/verify-order", (req, res) => {
  const { code } = req.body;

  if (!orders[code]) return res.json({ status: "INVALID" });

  if (orders[code].printed) return res.json({ status: "USED" });

  orders[code].printed = true;
  res.json({ status: "OK" });
});

app.listen(5000, () => console.log("Server running on port 5000"));
