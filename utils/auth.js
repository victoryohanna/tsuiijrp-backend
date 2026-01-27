// utils/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Generate JWT token
exports.generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Verify JWT token
exports.verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Middleware to protect routes
exports.protect = (roles = []) => {
  return (req, res, next) => {
    // Check both standard Authorization header AND x-auth-token
    let token = req.header("x-auth-token") || req.header("Authorization");

    // Handle "Bearer <token>" format
    if (token && token.startsWith("Bearer")) {
      token = token.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token, authorization denied",
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if user has required role
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to access this route",
        });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({
        success: false,
        error: "Token is not valid",
      });
    }
  };
};
