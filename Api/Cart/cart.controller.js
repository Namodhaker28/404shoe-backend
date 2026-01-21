const CartModal = require("./cartModal");
const Product = require("../product/ProductModal");
const asyncHandler = require("express-async-handler");
const OrderModal = require("../order/orderModal");
const uniqid = require("uniqid");
const User = require("../access/UserModal");
const { CustomError } = require("../../utils/customError");

require("dotenv").config();

class cartController {
  addToCart = asyncHandler(async (req, res) => {
    const user = await req.user;
    const cart = req.body;

    try {
      // Validate product exists and get price
      const product = await Product.findById(cart.product).select("price").exec();
      if (!product) {
        throw new CustomError(404, "Product not found");
      }

      // Get or create cart
      let existCart = await CartModal.findOne({ orderBy: user._id });
      
      // Check if product already exists in cart
      if (existCart) {
        const isProductExist = existCart.products.some((item) => item.product.toString() === cart.product);
        if (isProductExist) {
          throw new CustomError(400, "Product already in cart");
        }
      }

      // Set cart item price
      cart.price = product.price;

      if (existCart) {
        // Update existing cart
        existCart.products.push(cart);
        existCart.cartTotal = existCart.cartTotal + cart.price * cart.count;
        const newCart = await CartModal.findOneAndUpdate(
          { orderBy: user._id },
          existCart,
          { new: true }
        )
          .populate("orderBy")
          .populate("products.product")
          .exec();
        
        // Update user cart array
        if (!user.cart.includes(cart.product)) {
          user.cart.push(cart.product);
          await User.findByIdAndUpdate(user._id, { cart: user.cart });
        }
        
        res.status(200).json(newCart);
      } else {
        // Create new cart
        const products = [cart];
        const cartTotal = cart.price * cart.count;
        const newCart = await new CartModal({
          products,
          cartTotal,
          orderBy: user._id,
        })
          .save()
          .then(cart => CartModal.findById(cart._id).populate("orderBy").populate("products.product").exec());
        
        // Update user cart array
        user.cart.push(cart.product);
        await User.findByIdAndUpdate(user._id, { cart: user.cart });
        
        res.status(201).json(newCart);
      }
    } catch (error) {
      // Re-throw CustomError as-is, wrap other errors
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error.message || "Failed to add product to cart");
    }
  });

  removeFromCart = asyncHandler(async (req, res) => {
    const user = await req.user;
    const { id } = req.params;
    
    try {
      const existCart = await CartModal.findOne({ orderBy: user._id });
      
      if (!existCart) {
        throw new CustomError(404, "Cart not found");
      }

      // Find the product in cart to get its price
      const cartItem = existCart.products.find((item) => item.product.toString() === id);
      if (!cartItem) {
        throw new CustomError(404, "Product not found in cart");
      }

      // Calculate new total
      const itemTotal = cartItem.price * cartItem.count;
      existCart.cartTotal = Math.max(0, existCart.cartTotal - itemTotal);

      // Remove product from cart
      existCart.products = existCart.products.filter((product) => product.product.toString() !== id);

      // Update cart
      const newCart = await CartModal.findByIdAndUpdate(
        existCart._id,
        existCart,
        { new: true }
      )
        .populate("orderBy")
        .populate("products.product")
        .exec();

      // Update user cart array
      const updatedCart = user.cart.filter((cartId) => cartId.toString() !== id);
      await User.findByIdAndUpdate(user._id, { cart: updatedCart });

      // Get updated user
      const updatedUser = await User.findById(user._id);

      res.status(200).json({ newCart: newCart, updatedUser: updatedUser });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error.message || "Failed to remove product from cart");
    }
  });

  getUserCart = asyncHandler(async (req, res) => {
    const user = await req.user;
    try {
      const cart = await CartModal.findOne({ orderBy: user._id })
        .populate("products.product")
        .populate("orderBy")
        .exec();
      
      // Return empty cart structure if no cart exists
      if (!cart) {
        return res.status(200).json({
          products: [],
          cartTotal: 0,
          orderBy: user._id
        });
      }
      
      res.status(200).json(cart);
    } catch (error) {
      console.log(error);
      throw new CustomError(500, error.message || "Failed to fetch cart");
    }
  });

  createOrder = asyncHandler(async (req, res) => {
    const { paymentType } = req.body;
    const user = await req.user;

    try {
      if (paymentType !== "COD") throw new Error("We are accepting only COD");

      let orderCart = await CartModal.findOne({ orderBy: user._id });

      let finalAmount = 0;
      orderCart.products.map((product) => {
        finalAmount = finalAmount + product.price;
      });

      let newOrder = await new OrderModal({
        products: orderCart.products,
        paymentIntent: {
          id: uniqid(),
          method: paymentType,
          amount: finalAmount,
          status: "Cash on Delivery",
          created: Date.now(),
          currency: "usd",
        },
        orderBy: user._id,
        orderStatus: "Cash on Delivery",
      }).save();

      let update = orderCart.products.map((item) => {
        return {
          updateOne: {
            filter: { _id: item.product._id },
            update: { $inc: { quantity: -item.count, sold: +item.count } },
          },
        };
      });
      const updated = await Product.bulkWrite(update, {});
      res.json({ message: "success", order: newOrder });
    } catch (error) {
      throw new Error(error);
    }
  });

  getOrder = asyncHandler(async (req, res) => {
    const user = await req.user;

    try {
      const userOrders = await OrderModal.findOne({ orderBy: user._id });
      res.json(userOrders);
    } catch (error) {}
  });

  updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
      const updateOrderStatus = await OrderModal.findByIdAndUpdate(
        id,
        {
          orderStatus: status,
          paymentIntent: {
            status: status,
          },
        },
        { new: true }
      );
      res.json(updateOrderStatus);
    } catch (error) {
      throw new Error(error);
    }
  });
}

module.exports = cartController;
