const express = require("express");
const router = express.Router();
const Order = require("../models/Order");


// ✅ 1. Create Order
router.post("/create", async (req, res) => {
  try {
    const { userId, products, totalAmount } = req.body;

    const newOrder = new Order({
      userId,
      products,
      totalAmount
    });

    await newOrder.save();
    res.status(201).json({ message: "Order placed successfully", newOrder });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ 2. Get Order History by User
router.get("/history/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate("products.productId");

    res.status(200).json(orders);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ 3. Cancel Order
router.put("/cancel/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "Delivered") {
      return res.status(400).json({ message: "Cannot cancel delivered order" });
    }

    order.status = "Cancelled";
    await order.save();

    res.status(200).json({ message: "Order cancelled successfully", order });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ 4. Update Order Status (Admin)
router.put("/update-status/:orderId", async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order status updated", order });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;