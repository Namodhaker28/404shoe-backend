const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var orderSchema = new mongoose.Schema({
  // Wallet address of the customer
  walletAddress: {
    type: String,
    required: true,
    index: true,
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      count: Number,
      color: String,
      size: {
        type: mongoose.Schema.Types.Mixed, // Accept both String and Number (e.g., "S", "M", "L" or 8, 9.5)
      },
      priceUSDT: Number,
    },
  ],
  // Total amount in USDT
  totalUSDT: {
    type: Number,
    required: true,
  },
  // Blockchain transaction hash
  txHash: {
    type: String,
    default: null,
    index: true,
  },
  // Payment status
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  // Order status flow: Pending → Paid → Processing → Shipped → Delivered
  orderStatus: {
    type: String,
    default: "Pending",
    enum: [
      "Pending",
      "Paid",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ],
  },
  // Legacy support - orderBy can be wallet address or user ID
  orderBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  // Shipping information
  shippingAddress: {
    type: String,
    default: "",
  },
  // Reference to saved address (if used)
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    default: null,
  },
  // Payment verification details
  paymentVerified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
},
{ timestamps: true });

// Index for faster queries
orderSchema.index({ walletAddress: 1, createdAt: -1 });
orderSchema.index({ txHash: 1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1 });

//Export the model
module.exports = mongoose.model("Order", orderSchema);
