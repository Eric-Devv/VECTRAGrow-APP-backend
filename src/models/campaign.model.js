const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  targetAmount: {
    type: Number,
    required: true
  },
  deadline: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  completionDate: Date,
  deliverables: [String]
});

const campaignSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['technology', 'healthcare', 'education', 'real_estate', 'retail', 'other']
  },
  industry: {
    type: String,
    required: true
  },
  location: {
    country: String,
    city: String,
    state: String
  },
  
  // Funding details
  fundingGoal: {
    type: Number,
    required: true
  },
  currentAmount: {
    type: Number,
    default: 0
  },
  minimumInvestment: {
    type: Number,
    required: true
  },
  maximumInvestment: Number,
  
  // Campaign timeline
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Campaign status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'active', 'funded', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Media and documents
  pitchVideo: {
    url: String,
    thumbnail: String
  },
  images: [{
    url: String,
    caption: String
  }],
  documents: [{
    type: {
      type: String,
      enum: ['business_plan', 'financial_projections', 'market_analysis', 'other']
    },
    url: String,
    name: String
  }],
  
  // Campaign details
  milestones: [milestoneSchema],
  risks: [{
    description: String,
    mitigation: String
  }],
  team: [{
    name: String,
    role: String,
    bio: String,
    image: String
  }],
  
  // Engagement metrics
  views: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Investment tracking
  investors: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    date: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  }],
  
  // Verification and trust
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Analytics
  analytics: {
    dailyViews: [{
      date: Date,
      count: Number
    }],
    dailyInvestments: [{
      date: Date,
      amount: Number
    }],
    conversionRate: Number,
    averageInvestment: Number
  }
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ owner: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ category: 1 });
campaignSchema.index({ 'location.country': 1 });
campaignSchema.index({ fundingGoal: 1 });
campaignSchema.index({ currentAmount: 1 });
campaignSchema.index({ endDate: 1 });

// Virtual fields
campaignSchema.virtual('fundingProgress').get(function() {
  return (this.currentAmount / this.fundingGoal) * 100;
});

campaignSchema.virtual('daysRemaining').get(function() {
  return Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24));
});

// Methods
campaignSchema.methods.updateFundingProgress = async function(amount) {
  this.currentAmount += amount;
  
  if (this.currentAmount >= this.fundingGoal) {
    this.status = 'funded';
  }
  
  await this.save();
};

campaignSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    user: userId,
    content,
    createdAt: new Date()
  });
  
  await this.save();
};

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign; 