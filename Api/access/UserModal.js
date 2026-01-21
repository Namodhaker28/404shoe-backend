const mongoose = require("mongoose"); // Erase if already required
const { ObjectId } = require('mongodb');

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema(
  {
    // Wallet address as primary identifier for crypto users
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: false,
      unique: false,
      index: true,
    },
    email: {
      type: String,
      required: false,
      unique: false,
      sparse: true,
    },
    mobile: {
      type: String,
      required: false,
      unique: false,
      sparse: true,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    refreshToken: {
      type: String,
    },
    cart: {
      type: Array,
      default: [],
    },
    address: {
      type: String,
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    // Track if user is crypto-only (wallet only) or traditional (email/password)
    isCryptoUser: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for wallet address lookups
userSchema.index({ walletAddress: 1 });

//Export the model
module.exports = mongoose.model("User", userSchema);
