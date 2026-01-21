const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // Use scraped `name` as title
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    // USDT price (BEP-20)
    priceUSDT: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    brand: {
      type: String,
      required: true,
      index: true,
    },

    // Total available quantity
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },

    // Size-based stock (better for sneakers)
    sizes: [
      {
        size: {
          type: String, // Nike sizes come as "M | L | XL"
          required: true,
        },
        stock: {
          type: Number,
          default: 0,
        },
      },
    ],

    sold: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    images: [
      {
        public_id: String,
        url: {
          type: String,
          required: true,
        },
      },
    ],

    color: [String],

    tags: [String],

    availability: {
      type: String,
      enum: ["InStock", "OutOfStock"],
      default: "InStock",
    },

    ratings: [
      {
        star: { type: Number, min: 1, max: 5 },
        comment: String,
        postedby: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    totalrating: {
      type: Number,
      default: 0,
    },

    // For scraper safety (VERY IMPORTANT)
    uniq_id: {
      type: String,
      unique: true,
      index: true,
    },

    scraped_at: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
