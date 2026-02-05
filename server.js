
const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Razorpay instance
const razorpay = new Razorpay({
  key_id: "rzp_live_S86JCGSl30lgly", // Render + Frontend me same key
  key_secret: "Mnv0K6snW6SHkCxtjRhq03CF"
});

// Health check
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Create order route
app.post("/create-order", async (req, res) => {
  try {
    const { pages, copies, printType } = req.body;

    // Price logic
    const BW_PRICE = 5;
    const COLOR_PRICE = 10;
    const pricePerPage = printType === "color" ? COLOR_PRICE : BW_PRICE;

    // Total amount
    const totalAmount = Number(pages) * Number(copies) * pricePerPage;

    console.log("Pages:", pages);
    console.log("Copies:", copies);
    console.log("Print type:", printType);
    console.log("FINAL AMOUNT ₹:", totalAmount);

    const options = {
      amount: totalAmount * 100, // Razorpay expects paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    console.log("Sending to Razorpay (paise):", options.amount);

    const order = await razorpay.orders.create(options);

    res.json(order); // frontend will get order_id and amount

  } catch (err) {
    console.log("Error creating order:", err);
    res.status(500).send("Error creating order");
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
