const userSchema = require("./UserModal");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
var jwt = require("jsonwebtoken");
const { generateRefreshToken, generateAccessToken } = require("../../utils/genrateToken");
const { CustomError } = require("../../utils/customError");
require("dotenv").config();

class AccessController {
  createUser = asyncHandler(async (req, res, next) => {
    const { email, password, mobile, name } = req.body;

    if (!email || !password || !mobile || !name) {
      return next(new CustomError(400, "Bad request: missing required fields"));
    }

    try {
      const existingUser = await userSchema.findOne({ email });
      if (existingUser) {
        return next(new CustomError(409, "User already exists"));
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new userSchema({
        ...req.body,
        password: hashedPassword,
      });

     const savedUser = await newUser.save();
      res.status(201).json({statusCode : 201, message: "Signup successful",accessToken: generateAccessToken(savedUser._id), });
    } catch (error) {
      console.log(error.message);
      return next(new CustomError(400, error.message));
    }
  });

  login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new CustomError(400, "Invalid Credentials"));
    }

    const user = await userSchema.findOne({ email });
    if (!user) {
      return next(new CustomError(404, "User not registered, sign up first!"));
    }

    const isPwdMatch = await bcrypt.compare(password, user.password);
    if (!isPwdMatch) {
      return next(new CustomError(401, "Invalid Credentials"));
    }

    const refreshToken = generateRefreshToken(user._id);
    const updatedUser = await userSchema.findByIdAndUpdate(
      user._id,
      { refreshToken },
      { new: true }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Signed in successfully",
      user: updatedUser,
      accessToken: generateAccessToken(user._id),
    });
  });

  getLoggedInUser = asyncHandler(async (req, res, next) => {
    const user = await req.user;
    res.status(200).json(user);
  });

  refresh = asyncHandler(async (req, res, next) => {
    if (!req.cookies?.refreshToken) {
      return next(new CustomError(400, "No cookies"));
    }

    const refreshToken = req.cookies.refreshToken;
    const user = await userSchema.findOne({ refreshToken });
    if (!user) {
      return next(new CustomError(404, "User not found with this refresh token"));
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_KEY);
    if (decoded.id != user._id) {
      return next(new CustomError(401, "Token mismatch"));
    }

    res.status(200).json({ accessToken: generateAccessToken(user._id) });
  });

  logout = asyncHandler(async (req, res, next) => {
    if (!req.cookies?.refreshToken) {
      return next(new CustomError(400, "No cookies"));
    }

    const refreshToken = req.cookies.refreshToken;
    const user = await userSchema.findOne({ refreshToken });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });

    if (user) {
      await userSchema.findOneAndUpdate(refreshToken, { refreshToken: "" });
    }

    res.status(200).json({ message: "Logout successful" });
  });

  updateUser = asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const updatedUser = await userSchema.findByIdAndUpdate(id, req.body, { new: true });

    if (updatedUser) {
      res.status(200).json({ message: "Update successful", updatedUser });
    } else {
      return next(new CustomError(404, "User not exists"));
    }
  });

  getAllUsers = asyncHandler(async (req, res, next) => {
    const allUsers = await userSchema.find();
    res.json(allUsers);
  });

  getSingleUser = asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const user = await userSchema.findById(id);
    if (user) {
      res.json(user);
    } else {
      return next(new CustomError(404, `User ${id} not found`));
    }
  });

  deleteUser = asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const user = await userSchema.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully", data: user });
  });

  addAddress = asyncHandler(async (req, res, next) => {
    const { _id } = await req.user;
    const updatedUser = await userSchema.findByIdAndUpdate(
      _id,
      { address: req.body.address },
      { new: true }
    );
    res.json(updatedUser);
  });

  addToWishlist = asyncHandler(async (req, res, next) => {
    let user = await req.user;
    const { prodId } = req.body;

    const isAdded = user.wishlist.find((id) => id.toString() === prodId);
    if (isAdded) {
      user = await userSchema.findOneAndUpdate(
        user._id,
        { $pull: { wishlist: prodId } },
        { new: true }
      );
    } else {
      user = await userSchema.findOneAndUpdate(
        user._id,
        { $push: { wishlist: prodId } },
        { new: true }
      );
    }
    res.json(user);
  });

  getWishlist = asyncHandler(async (req, res, next) => {
    const user = await req.user;
    const populatedUser = await userSchema.findById(user._id).populate("wishlist").exec();
    res.json(populatedUser.wishlist);
  });
}

module.exports = AccessController;
