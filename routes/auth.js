// routes/auth.js
const express = require("express");
const router = express.Router();
const { generateToken } = require("../utils/auth");
const User = require("../models/User");
const { protect } = require("../utils/auth");

// @desc    Register user
// @route   POST /register
// @access  Public
// routes/auth.js
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    //  Define the Allowed Whitelist from .env
    const allowedReviewers = [
      process.env.SECOND_REVIEWER,
      process.env.THIRD_REVIEWER,
      process.env.FOURTH_REVIEWER,
      process.env.FIFTH_REVIEWER,
      process.env.SIXTH_REVIEWER,
    ].map((e) => e?.toLowerCase().trim());

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    //  Check if the email is allowed
    let assignedRole = "";

    if (email.toLowerCase().trim() === adminEmail) {
      assignedRole = "admin";
    } else if (allowedReviewers.includes(email.toLowerCase().trim())) {
      assignedRole = "reviewer";
    } else {
      // Reject anyone not in the list
      return res.status(403).json({
        success: false,
        error: "Access Denied. Only invited reviewers and administrators can register."
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: "User already exists" });
    }

    // Create the user with the strictly assigned role
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole, // Role is forced based on whitelist, not req.body
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// @desc    Login user
// @route   POST /login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email and password",
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("DEBUG: Email not found in DB:", email);
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    console.log("DEBUG: Password match result:", isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Create token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @desc    Get all reviewers
// @route   GET /api/users/reviewers
// @access  Private/Admin
router.get("/reviewers", protect(), async (req, res) => {
  try {
    // Only fetch users who have the 'reviewer' role
    const reviewers = await User.find({ role: "reviewer" }).select("name email _id");
    res.json({ success: true, data: reviewers });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// @desc    Get current user
// @route   GET /me
// @access  Private
router.get("/me", protect(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
