const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const accessRouter = require('./Api/access/access.routes');
const productRouter = require('./Api/product/product.routes');
const cartRouter = require('./Api/Cart/cart.routes');
const orderRouter = require('./Api/order/order.routes');
const { errorHandler, notFound } = require("./middlewares/errorHandlers");
var cors = require("cors");
const errorMiddleware = require("./middlewares/customErrorHandler");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const app = express();


app.use(cookieParser());
app.use(cors());

// Rate limiting for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limiting for payment verification
const paymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 payment verification requests per minute
  message: "Too many payment verification requests, please try again later.",
});

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));



const port = process.env.PORT;
const db_uri = process.env.DB_URI;

const myRouter = express.Router();
app.use('/api/v1',myRouter)
myRouter.get("/", (req, res) => {
  res.send(`<h1>Welcome to 404-shop <> made with ♥️ by DevChef </h1> `);
});


app.use('/api/v1', accessRouter, productRouter, cartRouter, orderRouter);
// app.use('/api/v1',productRouter)

// app.use(errorHandler)
app.use(notFound)
app.use(errorMiddleware);




mongoose
  .connect(db_uri)
  .then(() => {
    console.log("mongodb connection successful");
  })
  .catch((err) => console.log("mongodb connectione error: " + err));

app.listen(port, () => {
  console.log("app listening on port ", port);
});


