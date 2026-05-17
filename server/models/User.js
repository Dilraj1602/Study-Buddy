const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  token: { type: String },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  resetPasswordCode: { type: String }, // Stores hashed OTP
  resetPasswordExpires: { type: Date },
  resetPasswordAttempts: { type: Number, default: 0 },
  signupOtp: { type: String }, // Stores hashed OTP
  signupOtpExpires: { type: Date },
  signupOtpAttempts: { type: Number, default: 0 },
  isEmailVerified: { type: Boolean, default: false },

  // OAuth Provider Information
  oauthProvider: { type: String }, // 'google', 'github', 'facebook'
  oauthId: { type: String },
  profilePicture: { type: String },
  oauthAccessToken: { type: String }, // Encrypted
  oauthRefreshToken: { type: String }, // Encrypted
  linkedAccounts: [{
    provider: String,
    providerId: String,
    linkedAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ oauthProvider: 1, oauthId: 1 });

module.exports = mongoose.model('User', userSchema); 
