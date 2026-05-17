const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendPasswordResetEmail, sendSignupVerificationEmail } = require('../config/email');

exports.sendSignupOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP before storing
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Create or update temporary user document with hashed OTP
    let tempUser = existingUser;
    if (!tempUser) {
      tempUser = await User.create({
        email,
        signupOtp: hashedOtp,
        signupOtpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        signupOtpAttempts: 0,
        isEmailVerified: false
      });
    } else {
      tempUser.signupOtp = hashedOtp;
      tempUser.signupOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
      tempUser.signupOtpAttempts = 0;
      await tempUser.save();
    }

    // Send email with OTP
    const emailSent = await sendSignupVerificationEmail(email, otp);

    if (emailSent) {
      res.json({
        message: 'Verification code sent to your email',
        email,
        tempUserId: tempUser._id
      });
    } else {
      res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }
  } catch (err) {
    console.error('Send signup OTP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// New function to verify signup OTP
exports.verifySignupOtp = async (req, res) => {
  const { email, otp, tempUserId } = req.body;

  try {
    if (!email || !otp || !tempUserId) {
      return res.status(400).json({ message: 'Email, OTP, and temporary user ID are required' });
    }

    // Find the temporary user
    const tempUser = await User.findById(tempUserId);
    if (!tempUser) {
      return res.status(400).json({ message: 'Invalid verification request' });
    }

    // Check attempt counter to prevent brute force
    if (tempUser.signupOtpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    // Check if OTP is expired
    if (!tempUser.signupOtpExpires || tempUser.signupOtpExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Compare provided OTP with stored hash
    const otpMatch = await bcrypt.compare(otp, tempUser.signupOtp);
    if (!otpMatch) {
      // Increment failed attempts
      tempUser.signupOtpAttempts = (tempUser.signupOtpAttempts || 0) + 1;
      await tempUser.save();
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Mark email as verified
    tempUser.isEmailVerified = true;
    tempUser.signupOtp = undefined;
    tempUser.signupOtpExpires = undefined;
    tempUser.signupOtpAttempts = 0;
    await tempUser.save();

    res.json({
      message: 'Email verified successfully. You can now complete your registration.',
      email,
      tempUserId: tempUserId
    });
  } catch (err) {
    console.error('Verify signup OTP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Modified registration function to work with verified email
exports.register = async (req, res) => {
  const { firstName, lastName, email, password, tempUserId } = req.body;
  
  try {
    if (!firstName || !lastName || !email || !password || !tempUserId) {
      return res.status(400).json({ message: 'All fields required' });
    }

    // Find the verified temporary user
    const tempUser = await User.findById(tempUserId);
    if (!tempUser || !tempUser.isEmailVerified || tempUser.email !== email) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    // Check if email already exists in another account
    const existingUser = await User.findOne({ email, _id: { $ne: tempUserId } });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Hash password and update user
    const hash = await bcrypt.hash(password, 10);
    tempUser.firstName = firstName;
    tempUser.lastName = lastName;
    tempUser.password = hash;
    tempUser.isEmailVerified = true;
    await tempUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: tempUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const username = `${tempUser.firstName || ''} ${tempUser.lastName || ''}`.trim();
    const cookieOptions = {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };

    res.cookie('token', token, cookieOptions);
    res.json({
      user: {
        id: tempUser._id,
        username,
        email: tempUser.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.password) {
      return res.status(400).json({ message: 'Please continue with Google login for this account' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const username = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const cookieOptions = {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
    res.cookie('token', token, cookieOptions);
    res.json({ user: { id: user._id, username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out' });
};

exports.getCurrentUser = async (req, res) => {
  try {
    let token = req.cookies.token;
    // console.log('getCurrentUser - Cookie token:', !!token);
    // console.log('getCurrentUser - Authorization header:', req.headers.authorization);
    
    // Check Authorization header if no cookie
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      // console.log('getCurrentUser - Using Bearer token:', !!token);
    }
    
    if (!token) {
      // console.log('getCurrentUser - No token found');
      return res.json({ loggedIn: false });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      // console.log('getCurrentUser - Token decoded successfully, user ID:', decoded.id);
    } catch (err) {
      // console.log('Token verification failed in getCurrentUser:', err.message);
      return res.json({ loggedIn: false });
    }
    
    const user = await User.findById(decoded.id);
    // console.log('getCurrentUser - User found:', !!user);
    if (!user) {
      return res.json({ loggedIn: false });
    }
    
    // Construct username from firstName and lastName
    const username = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    // console.log('getCurrentUser - Authentication successful for:', username);
    res.json({ loggedIn: true, user: { id: user._id, username, email: user.email } });
  } catch (err) {
    // console.log('getCurrentUser error:', err.message);
    res.status(500).json({ loggedIn: false });
  }
}; 

exports.changePassword = async (req, res) => {
  // console.log('Change password endpoint hit');
  // console.log('Request body:', req.body);
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user; 
  // console.log('User details:', req.user);
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ message: 'New password must be at least 12 characters long' });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the current password' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google login. Set a password through reset password first.' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    // Return generic message whether user exists or not to prevent enumeration
    const genericResponse = {
      message: 'If an account with this email exists, a verification code has been sent.',
      email
    };

    if (!user) {
      return res.json(genericResponse);
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the verification code before storing
    const hashedCode = await bcrypt.hash(verificationCode, 10);

    // Store hashed verification code in user document with expiration
    user.resetPasswordCode = hashedCode;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.resetPasswordAttempts = 0; // Initialize attempt counter
    await user.save();

    // Send email with OTP
    const emailSent = await sendPasswordResetEmail(email, verificationCode);

    if (emailSent) {
      res.json(genericResponse);
    } else {
      res.json(genericResponse);
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP only (without password reset)
exports.verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  try {
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email });

    // Generic error message to prevent enumeration
    const genericError = { message: 'Invalid or expired verification code' };

    if (!user) {
      return res.status(400).json(genericError);
    }

    // Check attempt counter to prevent brute force
    if (user.resetPasswordAttempts >= 5) {
      return res.status(429).json({ message: 'Too many failed attempts. Please try again later.' });
    }

    // Check if code is expired
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json(genericError);
    }

    // Compare provided code with stored hash
    const codeMatch = await bcrypt.compare(code, user.resetPasswordCode);
    if (!codeMatch) {
      // Increment failed attempts
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save();
      return res.status(400).json(genericError);
    }

    // Reset attempt counter on successful verification
    user.resetPasswordAttempts = 0;
    await user.save();

    res.json({ message: 'Verification code is valid' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password with verified OTP
exports.verifyResetCode = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ message: 'New password must be at least 12 characters long' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check attempt counter to prevent brute force
    if (user.resetPasswordAttempts >= 5) {
      return res.status(429).json({ message: 'Too many failed attempts. Please try again later.' });
    }

    // Check if code is expired
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Compare provided code with stored hash
    const codeMatch = await bcrypt.compare(code, user.resetPasswordCode);
    if (!codeMatch) {
      // Increment failed attempts
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset fields
    user.password = hashedNewPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Verify reset code error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}; 
