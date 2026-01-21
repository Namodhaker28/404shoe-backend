const express = require("express");
const orderController = require("./order.controller");
// const { authMiddleware } = require("../../middlewares/authetication");

const router = express.Router();

// Create new order
router.post("/orders", orderController.createOrder);

// Get all orders (Admin - add auth middleware later)
router.get("/orders", orderController.getAllOrders);

// Get orders by wallet address
router.get("/orders/:wallet", orderController.getOrdersByWallet);

// Get order by ID
router.get("/orders/id/:id", orderController.getOrderById);

// Update order status
router.put("/orders/:id/status", orderController.updateOrderStatus);

// Verify payment
router.post("/orders/verify-payment", orderController.verifyPaymentAndUpdateOrder);

// Check USDT balance
router.post("/orders/check-balance", orderController.checkBalance);

module.exports = router;
