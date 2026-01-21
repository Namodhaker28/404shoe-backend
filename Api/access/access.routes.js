const express = require("express");
const Router = express.Router();
const accessController = require("./access.controller");
const Authentication  = require("../../middlewares/authetication");

const controller = new accessController()

Router.post("/signup", controller.createUser);
Router.post("/signin", controller.login);
Router.get("/me", Authentication, controller.getLoggedInUser);
Router.get("/refresh", controller.refresh);
Router.get("/logout", controller.logout);
Router.get("/users/all", controller.getAllUsers);
Router.get("/users/:id", controller.getSingleUser);
Router.delete("/users/:id", Authentication, controller.deleteUser);
Router.put("/users/:id", controller.updateUser);

Router.put('/wishlist',  Authentication, controller.addToWishlist)
Router.get('/wishlist',  Authentication, controller.getWishlist)

// Legacy address endpoint (backward compatibility)
Router.post("/address", Authentication, controller.addAddress)

// New address management endpoints
Router.post("/addresses", Authentication, controller.addNewAddress)
Router.get("/addresses", Authentication, controller.getUserAddresses)
Router.get("/addresses/:id", Authentication, controller.getAddressById)
Router.put("/addresses/:id", Authentication, controller.updateAddress)
Router.delete("/addresses/:id", Authentication, controller.deleteAddress)
Router.put("/addresses/:id/set-default", Authentication, controller.setDefaultAddress)

module.exports = Router
