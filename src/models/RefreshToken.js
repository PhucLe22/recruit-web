const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  userAgent: String,
  ipAddress: String,
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for faster lookups
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens

// Static method to create a new refresh token
refreshTokenSchema.statics.createToken = async function(userId, userAgent, ipAddress) {
  const token = jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret',
    { expiresIn: '7d' }
  );

  // Calculate expiration date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create and save the refresh token
  const refreshToken = new this({
    userId,
    token,
    userAgent,
    ipAddress,
    expiresAt
  });

  await refreshToken.save();
  return refreshToken;
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;