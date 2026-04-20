const express = require('express');
const { chatWithBot } = require('../controllers/chat');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Rate limiter for chat endpoint
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: { message: 'Too many chat requests, please try again later.' }
});

// Input validation middleware
const chatValidation = [
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message must be less than 2000 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  }
];

// Accepts both authenticated and unauthenticated users
router.post('/', chatLimiter, chatValidation, optionalAuth, chatWithBot);

module.exports = router; 