const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  documents: [{
    type: {
      type: String,
      enum: ['id_proof', 'address_proof', 'business_registration', 'tax_document', 'bank_statement'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  personalInfo: {
    dateOfBirth: Date,
    nationality: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    phoneNumber: String
  },
  businessInfo: {
    companyName: String,
    registrationNumber: String,
    taxId: String,
    industry: String,
    website: String
  },
  verificationLevel: {
    type: String,
    enum: ['basic', 'advanced', 'enterprise'],
    default: 'basic'
  },
  verificationBadges: [{
    type: {
      type: String,
      enum: ['identity_verified', 'business_verified', 'address_verified', 'phone_verified', 'email_verified'],
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  verificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  rejectionReason: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date
}, {
  timestamps: true
});

// Indexes
kycSchema.index({ user: 1 });
kycSchema.index({ status: 1 });
kycSchema.index({ verificationLevel: 1 });
kycSchema.index({ verificationScore: -1 });

// Methods
kycSchema.methods.calculateVerificationScore = function() {
  let score = 0;
  
  // Basic verification (30 points)
  if (this.documents.some(doc => doc.type === 'id_proof' && doc.verified)) score += 15;
  if (this.documents.some(doc => doc.type === 'address_proof' && doc.verified)) score += 15;
  
  // Business verification (40 points)
  if (this.documents.some(doc => doc.type === 'business_registration' && doc.verified)) score += 20;
  if (this.documents.some(doc => doc.type === 'tax_document' && doc.verified)) score += 20;
  
  // Additional verification (30 points)
  if (this.documents.some(doc => doc.type === 'bank_statement' && doc.verified)) score += 30;
  
  this.verificationScore = score;
  return score;
};

kycSchema.methods.addVerificationBadge = function(badgeType) {
  if (!this.verificationBadges.some(badge => badge.type === badgeType)) {
    this.verificationBadges.push({
      type: badgeType,
      earnedAt: new Date()
    });
  }
};

const KYC = mongoose.model('KYC', kycSchema);

module.exports = KYC; 