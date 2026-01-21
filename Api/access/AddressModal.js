const mongoose = require("mongoose");

/**
 * Address Schema for storing multiple shipping addresses per user
 */
const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Address label/name (e.g., "Home", "Work", "Office")
    label: {
      type: String,
      required: true,
      trim: true,
    },
    // Full name
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    // Phone number
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    // Street address line 1
    streetAddress: {
      type: String,
      required: true,
      trim: true,
    },
    // Street address line 2 (optional)
    streetAddress2: {
      type: String,
      trim: true,
      default: "",
    },
    // City
    city: {
      type: String,
      required: true,
      trim: true,
    },
    // State/Province
    state: {
      type: String,
      required: true,
      trim: true,
    },
    // Postal/ZIP code
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    // Country
    country: {
      type: String,
      required: true,
      trim: true,
      default: "United States",
    },
    // Set as default address
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Address type (home, work, other)
    type: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
  },
  { timestamps: true }
);

// Index for faster queries
addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ user: 1, createdAt: -1 });

// Ensure only one default address per user
addressSchema.pre("save", async function (next) {
  if (this.isDefault && this.isModified("isDefault")) {
    await mongoose.model("Address").updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model("Address", addressSchema);
