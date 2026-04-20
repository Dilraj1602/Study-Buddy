const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function() {
      return this.isEmailVerified === true;
    }
  },
  token: { type: String },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  resetPasswordCode: { type: String }, // Stores hashed OTP
  resetPasswordExpires: { type: Date },
  resetPasswordAttempts: { type: Number, default: 0 },
  signupOtp: { type: String }, // Stores hashed OTP
  signupOtpExpires: { type: Date },
  signupOtpAttempts: { type: Number, default: 0 },
  isEmailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema); 