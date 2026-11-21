// Vercel Serverless Function entrypoint for SMP Express Backend
const app = require('../backend/server');

// Vercel serverless handler
module.exports = (req, res) => {
  app(req, res);
};
