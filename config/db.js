const mongoose = require("mongoose");
const { success, error } = require("consola");

require("dotenv").config();

const dbConnection = async () => {
  try {
    await mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      success({ message: "Database Connected", badge: true });
    })
    .catch(() => {
      error({ message: "Connection to database failed", badge: true });
    });
  } catch (error) {
    console.log(error);
    
  }
};

module.exports = dbConnection;
