var jwt = require("jsonwebtoken");
const userSchema = require("../Api/access/UserModal");
const AsyncHandler = require("express-async-handler");
const { CustomError } = require("../utils/customError");
require("dotenv").config();

const authentication = AsyncHandler(async (req, res, next) => {
  try {
    if (!req?.headers?.authorization?.startsWith("Bearer ")) {
      throw new CustomError(401, "No authorization token provided");
    }
    
    const token = req?.headers?.authorization?.split(" ")[1];
    if (!token) {
      throw new CustomError(401, "No token found in authorization header");
    }
    
    const tokenObj = jwt.verify(token, process.env.JWT_KEY);
    if (!tokenObj || !tokenObj.id) {
      throw new CustomError(401, "Invalid token");
    }
    
    const user = await userSchema.findById(tokenObj.id);
    if (!user) {
      throw new CustomError(401, "User not found");
    }
    
    req.user = user;
    next();
  } catch (error) {
    // If it's already a CustomError, re-throw it
    if (error instanceof CustomError) {
      throw error;
    }
    // Handle JWT errors
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      throw new CustomError(401, "Invalid or expired token");
    }
    // Default to unauthorized
    throw new CustomError(401, "Unauthorized Access");
  }
});

// const isAdmin = AsyncHandler(async (req, res, next) => {
//   try {
//     if (req.user.role !== "admin") throw new Error("You must be an admin");
//     next();
//   } catch (error) {
//     throw error;
//   }
// });

module.exports = authentication;
// module.exports = isAdmin;
