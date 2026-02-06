
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
    const  pages = Number(req.body.pages) ||1;
    const copies = Number(req.body.copies) ||1;
    const printType = req.body.printType ==="color"?"color":"bw";

    // Price logic
    
    const pricePerPage = printType === "color" ? 10 :5 ;

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

    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount
    }); // frontend will get order_id and amount

  } catch (err) {
    console.log("Error creating order:", err);
    res.status(500).send("Error creating order");
  }
});

//PAYMENT VERIFICATION
app.post("/verify-payment",(req, res) =>
{
  try{
    const {razorpay_order_id, razorpay_payment_id, razorpay_signature}
    = req.body;
    const body = razorpay_order_id + "|"
     razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false , message:"Invalid signature"});
    }
  } catch (error) {
    console.error ("Verify Error:", error)
    res.status(500).json({success: false});
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
