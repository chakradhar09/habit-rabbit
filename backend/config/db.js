const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB connected', {
      host: conn.connection.host
    });
  } catch (error) {
    logger.error('Database connection error', {
      error: error.message,
      stack: error.stack
    });

    process.exit(1);
  }
};

module.exports = connectDB;
