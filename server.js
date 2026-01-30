const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let orders = {};

// CREATE ORDER
app.post("/create-order", (req, res) => {
  const { totalAmount, paidAmount } = req.body;

  if (paidAmount >= totalAmount) {
    const code = Math.floor(100000 + Math.random() * 900000);

    orders[code] = {
      paid: true,
      time: new Date()
    };

    return res.json({ orderCode: code });
  } else {
    return res.status(400).json({ message: "Payment incomplete" });
  }
});

// VERIFY ORDER
app.get("/verify-order/:code", (req, res) => {
  const code = req.params.code;

  if (orders[code]) {
    res.json({ valid: true });
  } else {
    res.status(404).json({ valid: false });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});