//require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const { success, error } = require("consola");
const dbConnection = require("./config/db.js");
const PORT = process.env.PORT || 5000;

// Create Express app
const app = express();

// Middleware
//app.use(cors());
app.use(
  cors({
    origin: "http://localhost:3000", // Your frontend URL
    credentials: true,
  })
);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
dbConnection()

// Route files
const journals = require('./controllers/journalController');
const auth = require("./routes/auth");

// Mount routers
app.use("/", journals);
app.use("/", auth);

// Error handling middleware
app.use((err, req, res, next) => {
    //console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Server Error'
    });
});

const server = app.listen(PORT, () => {
  if (!PORT) {
    error({ message: `Application fail to run`, badge: true });
  } else {
    success({
      message: `Application is running on port ${PORT}`,
      badge: true,
    });
  }
});


// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});