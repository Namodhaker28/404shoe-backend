const CartModal = require("./cartModal");
const Product = require("../product/ProductModal");
const asyncHandler = require("express-async-handler");
const OrderModal = require("../order/orderModal");
const uniqid = require("uniqid");
const User = require("../access/UserModal");

require("dotenv").config();

class cartController {
  addToCart = asyncHandler(async (req, res) => {
    const user = await req.user;
    const cart = req.body;

    try {
      let products = [];
      const existCart = await CartModal.findOne({ orderBy: user._id });

      let price = await Product.findById({ _id: cart.product })
        .select("price")
        .exec();
      cart.price = price.price;

      if (existCart) {
        existCart.products.push(cart);
        existCart.cartTotal = existCart.cartTotal + cart.price * cart.count;
        const newCart = await CartModal.findOneAndUpdate(
          { orderBy: user._id },
          existCart,
          { new: true }
        );
        res.json(newCart);
      } else {
        products.push(cart);
        let cartTotal = cart.price * cart.count;
        const newCart = await new CartModal({
          products,
          cartTotal,
          orderBy: user._id,
        }).save();
        res.json(newCart);
      }

      user.cart.push(cart.product);
      await User.findByIdAndUpdate(user._id, user);
    } catch (error) {
      throw new Error(error);
    }
  });

  removeFromCart = asyncHandler(async (req, res) => {
    const user = await req.user;
    const { id } = req.params;
    const existCart = await CartModal.findOne({ orderBy: user._id });

    let price = await Product.findById({ _id: id }).select("price").exec();
    existCart.cartTotal = existCart.cartTotal - price.price;

    existCart.products = existCart.products.filter(
      (product) => product.product != id
    );

    const newCart = await CartModal.findByIdAndUpdate(
      existCart._id,
      existCart,
      {
        new: true,
      }
    );

    const updatedCart = user.cart.filter((cart) => cart !== id);
    user.cart = updatedCart;

    await User.findByIdAndUpdate(user._id, user);
    res.status(200).json({ newCart: newCart, updatedUser: user });
  });

  getUserCart = asyncHandler(async (req, res) => {
    const user = await req.user;
    try {
      const cart = await CartModal.findOne({ orderBy: user._id })
        .populate("products.product")
        .exec();
      // console.log("cartt", cart);
      res.json(cart);
    } catch (error) {
      throw new Error(error);
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
