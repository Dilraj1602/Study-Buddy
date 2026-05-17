const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token for OAuth user
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const cookieOptions = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const upsertGoogleUser = async ({ googleId, email, firstName, lastName, profilePicture }) => {
  let user = await User.findOne({ oauthId: googleId, oauthProvider: 'google' });
  if (user) return user;

  user = await User.findOne({ email });
  if (user) {
    user.oauthProvider = 'google';
    user.oauthId = googleId;
    user.profilePicture = profilePicture || user.profilePicture;
    user.isEmailVerified = true;

    const alreadyLinked = user.linkedAccounts.some(
      acc => acc.provider === 'google' && acc.providerId === googleId
    );
    if (!alreadyLinked) {
      user.linkedAccounts.push({ provider: 'google', providerId: googleId });
    }

    await user.save();
    return user;
  }

  return User.create({
    firstName,
    lastName,
    email,
    oauthProvider: 'google',
    oauthId: googleId,
    profilePicture,
    isEmailVerified: true,
    linkedAccounts: [{ provider: 'google', providerId: googleId }],
  });
};

exports.googleCredentialLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (!response.ok) {
      return res.status(401).json({ message: 'Invalid Google credential' });
    }

    const profile = await response.json();
    const allowedClientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.REACT_APP_GOOGLE_CLIENT_ID,
    ].filter(Boolean);

    if (allowedClientIds.length && !allowedClientIds.includes(profile.aud)) {
      return res.status(401).json({ message: 'Google credential audience mismatch' });
    }

    if (!profile.email || profile.email_verified !== 'true') {
      return res.status(401).json({ message: 'Google email is not verified' });
    }

    const user = await upsertGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      firstName: profile.given_name || profile.name?.split(' ')[0] || '',
      lastName: profile.family_name || profile.name?.split(' ').slice(1).join(' ') || '',
      profilePicture: profile.picture || '',
    });

    const authToken = generateToken(user._id);
    res.cookie('token', authToken, cookieOptions);

    const username = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    res.json({
      success: true,
      user: {
        id: user._id,
        username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Google credential login error:', error);
    res.status(500).json({ message: 'Google login failed' });
  }
};

exports.googleAuthCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Google authentication failed' });
    }

    // Generate JWT token
    const token = generateToken(req.user._id);

    // Set HTTP-only cookie with token
    res.cookie('token', token, cookieOptions);

    // Redirect to frontend dashboard with token as query param (fallback for SPA)
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendURL}/dashboard?token=${token}&auth=success`);
  } catch (error) {
    console.error('Google auth callback error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendURL}/login?auth=failed`);
  }
};

exports.linkGoogleAccount = async (req, res) => {
  try {
    // This endpoint is called by authenticated users who want to link Google to their existing account
    const userId = req.user; // From auth middleware

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // In practice, this would be called after Google OAuth flow
    // The frontend would send the Google profile data
    const { googleId, accessToken, refreshToken, profilePicture } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        oauthProvider: 'google',
        oauthId: googleId,
        oauthAccessToken: accessToken,
        oauthRefreshToken: refreshToken,
        profilePicture: profilePicture || user.profilePicture,
        isEmailVerified: true,
        $addToSet: {
          linkedAccounts: {
            provider: 'google',
            providerId: googleId,
          }
        }
      },
      { new: true }
    ).select('-password -oauthAccessToken -oauthRefreshToken');

    res.json({ message: 'Google account linked successfully', user });
  } catch (error) {
    console.error('Link Google account error:', error);
    res.status(500).json({ message: 'Failed to link Google account' });
  }
};

exports.unlinkGoogleAccount = async (req, res) => {
  try {
    const userId = req.user; // From auth middleware

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(userId);

    // Check if user has another authentication method (password or other OAuth)
    if (!user.password && (!user.linkedAccounts || user.linkedAccounts.length <= 1)) {
      return res.status(400).json({
        message: 'Cannot unlink Google account. You must have another authentication method.'
      });
    }

    // Remove Google OAuth
    user.oauthProvider = null;
    user.oauthId = null;
    user.oauthAccessToken = null;
    user.oauthRefreshToken = null;
    user.linkedAccounts = user.linkedAccounts.filter(acc => acc.provider !== 'google');

    await user.save();

    res.json({ message: 'Google account unlinked successfully' });
  } catch (error) {
    console.error('Unlink Google account error:', error);
    res.status(500).json({ message: 'Failed to unlink Google account' });
  }
};

exports.getOAuthStatus = async (req, res) => {
  try {
    const userId = req.user;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(userId).select('oauthProvider linkedAccounts email');

    res.json({
      hasGoogle: !!user.oauthProvider || user.linkedAccounts.some(acc => acc.provider === 'google'),
      linkedAccounts: user.linkedAccounts,
      email: user.email,
    });
  } catch (error) {
    console.error('Get OAuth status error:', error);
    res.status(500).json({ message: 'Failed to get OAuth status' });
  }
};
