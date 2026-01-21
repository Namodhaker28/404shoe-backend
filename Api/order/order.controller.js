const Order = require("./orderModal");
const Product = require("../product/ProductModal");
const asyncHandler = require("express-async-handler");
const { verifyPayment, checkUSDTBalance } = require("../../utils/blockchain");
const validateMongoDbId = require("../../utils/validateMongodbId");

class OrderController {
  /**
   * Create a new order
   * POST /api/orders
   */
  createOrder = asyncHandler(async (req, res) => {
    try {
      const { walletAddress, products, shippingAddress, addressId } = req.body;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: "Wallet address is required",
        });
      }

      if (!products || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Products are required",
        });
      }

      // Calculate total and validate products
      let totalUSDT = 0;
      const orderItems = [];

      for (const item of products) {
        if (!item.productId) {
          return res.status(400).json({
            success: false,
            message: "Product ID is required for all items",
          });
        }

        const product = await Product.findById(item.productId);
        
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product ${item.productId} not found`,
          });
        }

        // console.log("product", product);
        
        // Get product name
        const productName = product.title || product.name || product.slug || "Product";

        if (product.status !== "Active") {
          return res.status(400).json({
            success: false,
            message: `Product ${productName} is not available`,
          });
        }


        // Validate price
        const priceUSDT = parseFloat(product.price);
        if (isNaN(priceUSDT) || priceUSDT <= 0) {
          return res.status(400).json({
            success: false,
            message: `Product ${productName} has invalid price`,
          });
        }

        // Parse sizes from available_sizes if sizes array is empty
        let productSizes = product.sizes || [];
        if (productSizes.length === 0 && product.available_sizes) {
          // Parse pipe-separated sizes string (e.g., "8 | 8.5 | 9")
          const sizeStrings = product.available_sizes.includes(item.size.toString()) ? true : false;
          if (!sizeStrings) {
            return res.status(400).json({
              success: false,
              message: `Size ${item.size} not available for ${productName}`,
            });
          }
        }

        // Validate count
        const count = parseInt(item.count);
        if (isNaN(count) || count <= 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid quantity for ${productName}`,
          });
        }

        // Debug: Log product details

        // console.log("Processing product:", {
        //   productId: item.productId,
        //   productTitle: productName,
        //   priceUSDT: priceUSDT,
        //   count: count,
        //   requestedSize: item.size,
        // });

        // Calculate item total
        const itemTotal = priceUSDT * count;
        if (isNaN(itemTotal)) {
          return res.status(400).json({
            success: false,
            message: `Failed to calculate total for ${productName}`,
          });
        }
        
        totalUSDT += itemTotal;

        orderItems.push({
          product: product._id,
          count: count,
          size: item.size,
          color: item.color || "",
          priceUSDT: priceUSDT,
        });
      }

      // Validate totalUSDT before creating order
      if (isNaN(totalUSDT) || totalUSDT <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid order total: ${totalUSDT}`,
        });
      }

      // Create order
      const newOrder = await Order.create({
        walletAddress: walletAddress.toLowerCase(),
        products: orderItems,
        totalUSDT: parseFloat(totalUSDT.toFixed(2)), // Ensure it's a valid number with 2 decimals
        shippingAddress: shippingAddress || "",
        addressId: addressId || null,
        paymentStatus: "pending",
        orderStatus: "Pending",
      });

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        order: newOrder,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create order",
      });
    }
  });

  /**
   * Get orders by wallet address
   * GET /api/orders/:wallet
   */
  getOrdersByWallet = asyncHandler(async (req, res) => {
    try {
      const { wallet } = req.params;

      if (!wallet) {
        return res.status(400).json({
          success: false,
          message: "Wallet address is required",
        });
      }

      const orders = await Order.find({
        walletAddress: wallet.toLowerCase(),
      })
        .populate("products.product")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        orders,
        count: orders.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch orders",
      });
    }
  });

  /**
   * Get order by ID
   * GET /api/orders/id/:id
   */
  getOrderById = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      validateMongoDbId(id);

      const order = await Order.findById(id).populate("products.product");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      res.json({
        success: true,
        order,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch order",
      });
    }
  });

  /**
   * Update order status
   * PUT /api/orders/:id/status
   */
  updateOrderStatus = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { orderStatus } = req.body;

      validateMongoDbId(id);

      const validStatuses = [
        "Pending",
        "Paid",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ];

      if (!validStatuses.includes(orderStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid order status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const order = await Order.findByIdAndUpdate(
        id,
        { orderStatus },
        { new: true }
      ).populate("products.product");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      res.json({
        success: true,
        message: "Order status updated successfully",
        order,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update order status",
      });
    }
  });

  /**
   * Get all orders (Admin only)
   * GET /api/orders
   */
  getAllOrders = asyncHandler(async (req, res) => {
    try {
      const { status, paymentStatus, limit = 50, page = 1 } = req.query;

      const query = {};
      if (status) query.orderStatus = status;
      if (paymentStatus) query.paymentStatus = paymentStatus;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const orders = await Order.find(query)
        .populate("products.product")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Order.countDocuments(query);

      res.json({
        success: true,
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch orders",
      });
    }
  });

  /**
   * Verify payment and update order
   * POST /api/orders/verify-payment
   */
  verifyPaymentAndUpdateOrder = asyncHandler(async (req, res) => {
    try {
      const { txHash, orderId } = req.body;

      if (!txHash || !orderId) {
        return res.status(400).json({
          success: false,
          message: "Transaction hash and order ID are required",
        });
      }

      // Find order
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if already verified
      if (order.paymentVerified && order.paymentStatus === "paid") {
        return res.json({
          success: true,
          message: "Payment already verified",
          order,
        });
      }

      // Verify transaction on blockchain
      const verification = await verifyPayment(
        txHash,
        order.totalUSDT.toString(),
        order.walletAddress
      );

      if (!verification.success) {
        return res.status(400).json({
          success: false,
          message: verification.error || "Payment verification failed",
          details: verification,
        });
      }

      // Update order with payment details
      order.txHash = txHash;
      order.paymentStatus = "paid";
      order.paymentVerified = true;
      order.verifiedAt = new Date();
      
      // Update order status to Processing if it was Pending
      if (order.orderStatus === "Pending") {
        order.orderStatus = "Processing";
      }

      await order.save();

      // Update product stock
      for (const item of order.products) {
        const product = await Product.findById(item.product);
        if (product) {
          const sizeIndex = product.sizes.findIndex(
            (s) => s.size === item.size
          );
          if (sizeIndex !== -1 && product.sizes[sizeIndex].stock >= item.count) {
            product.sizes[sizeIndex].stock -= item.count;
            product.sold += item.count;
            await product.save();
          }
        }
      }

      res.json({
        success: true,
        message: "Payment verified successfully",
        order,
        verification,
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to verify payment",
      });
    }
  });

  /**
   * Check USDT balance before checkout
   * POST /api/orders/check-balance
   */
  checkBalance = asyncHandler(async (req, res) => {
    try {
      const { walletAddress, amount } = req.body;

      if (!walletAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: "Wallet address and amount are required",
        });
      }

      const balanceCheck = await checkUSDTBalance(walletAddress, amount);

      res.json({
        success: balanceCheck.success,
        ...balanceCheck,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to check balance",
      });
    }
  });
}

module.exports = new OrderController();
