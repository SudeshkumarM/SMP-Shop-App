// Vercel Serverless Function entrypoint for SMP Express Backend
const app = require('../backend/server');
const connectDB = require('../backend/config/db');

// Vercel serverless handler with MongoDB connection
module.exports = async (req, res) => {
  // Connect to MongoDB before handling request
  try {
    await connectDB();
  } catch (error) {
    console.error(
      '[Vercel Serverless] MongoDB connection failed:',
      error.name || 'Error',
      error.code || 'unknown'
    );
    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please try again.'
    });
  }
  
  // Handle request with Express app
  return app(req, res);
};
