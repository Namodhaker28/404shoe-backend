const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var cartSchema = new mongoose.Schema({
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref : "Product"
      },
      count : Number,
      color:String,
      price:Number,
      size: {
        type: mongoose.Schema.Types.Mixed, // Accept both String and Number (e.g., "S", "M", "L" or 8, 9.5)
      }
    },
  ],
  cartTotal: {type:Number},
  orderBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref : "User"
  },
},
{timeseries:true},
);

//Export the model
module.exports = mongoose.model("Cart", cartSchema);
