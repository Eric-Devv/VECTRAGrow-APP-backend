const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  userType: {
    type: String,
    enum: ['business_owner', 'investor', 'admin'],
    required: true
  },
  // OAuth fields
  googleId: String,
  linkedinId: String,
  
  // Profile information
  profilePicture: String,
  coverPhoto: String,
  bio: String,
  location: String,
  website: String,
  company: String,
  jobTitle: String,
  industry: String,
  skills: [String],
  interests: [String],
  socialLinks: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Verification and trust system
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: {
      type: String,
      enum: ['id', 'business_registration', 'tax_document', 'bank_statement']
    },
    url: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    uploadedAt: Date
  }],
  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  badges: [{
    type: {
      type: String,
      enum: ['verified', 'trusted_investor', 'successful_entrepreneur', 'early_supporter']
    },
    earnedAt: Date
  }],
  
  // Business owner specific fields
  companyDetails: {
    name: String,
    registrationNumber: String,
    description: String
  },
  
  // Investor specific fields
  investmentPreferences: {
    industries: [String],
    minInvestment: Number,
    maxInvestment: Number,
    preferredLocations: [String]
  },
  
  // Security
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: String,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },
  lastActive: Date,
  loginHistory: [{
    timestamp: Date,
    ip: String,
    device: String,
    location: String
  }],
  
  // KYC and verification
  kyc: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KYC'
  },
  verificationBadges: [{
    type: String,
    enum: ['email', 'phone', 'identity', 'business', 'premium']
  }],
  verificationScore: {
    type: Number,
    default: 0
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiry: Date,
  
  // Settings
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'connections', 'private'],
        default: 'public'
      },
      showEmail: {
        type: Boolean,
        default: false
      },
      showPhone: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ 'companyDetails.name': 1 });
userSchema.index({ trustScore: -1 });
userSchema.index({ 'following.user': 1 });
userSchema.index({ 'followers.user': 1 });
userSchema.index({ verificationScore: -1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ isPremium: 1 });

// Methods
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  return token;
};

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }
  
  this.loginAttempts += 1;
  
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  }
  
  await this.save();
};

userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

userSchema.methods.follow = async function(userId) {
  if (!this.following.some(follow => follow.user.toString() === userId.toString())) {
    this.following.push({
      user: userId,
      followedAt: new Date()
    });
    await this.save();
  }
};

userSchema.methods.unfollow = async function(userId) {
  this.following = this.following.filter(follow => follow.user.toString() !== userId.toString());
  await this.save();
};

userSchema.methods.addFollower = async function(userId) {
  if (!this.followers.some(follower => follower.user.toString() === userId.toString())) {
    this.followers.push({
      user: userId,
      followedAt: new Date()
    });
    await this.save();
  }
};

userSchema.methods.removeFollower = async function(userId) {
  this.followers = this.followers.filter(follower => follower.user.toString() !== userId.toString());
  await this.save();
};

userSchema.methods.addVerificationBadge = async function(badge) {
  if (!this.verificationBadges.includes(badge)) {
    this.verificationBadges.push(badge);
    await this.save();
  }
};

userSchema.methods.removeVerificationBadge = async function(badge) {
  this.verificationBadges = this.verificationBadges.filter(b => b !== badge);
  await this.save();
};

userSchema.methods.updateVerificationScore = async function(score) {
  this.verificationScore = score;
  this.isVerified = score >= 70; // Threshold for verification
  await this.save();
};

userSchema.methods.addLoginHistory = async function(ip, device, location) {
  this.loginHistory.push({
    timestamp: new Date(),
    ip,
    device,
    location
  });
  this.lastActive = new Date();
  await this.save();
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User; 