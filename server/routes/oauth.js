const express = require('express');
const passport = require('passport');
const { googleAuthCallback, googleCredentialLogin, linkGoogleAccount, unlinkGoogleAccount, getOAuthStatus } = require('../controllers/oauth');
const auth = require('../middleware/auth');

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.post('/google', googleCredentialLogin);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  googleAuthCallback
);

// Link/Unlink OAuth for authenticated users
router.post('/link-google', auth, linkGoogleAccount);
router.post('/unlink-google', auth, unlinkGoogleAccount);

// Get OAuth account linking status
router.get('/status', auth, getOAuthStatus);

module.exports = router;
