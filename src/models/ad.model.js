const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  creator: {
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
  media: {
    type: {
      type: String,
      enum: ['image', 'video', 'carousel'],
      required: true
    },
    urls: [{
      url: String,
      thumbnail: String,
      metadata: {
        size: Number,
        duration: Number,
        format: String
      }
    }]
  },
  targetAudience: {
    ageRange: {
      min: Number,
      max: Number
    },
    gender: {
      type: String,
      enum: ['all', 'male', 'female', 'other']
    },
    locations: [{
      country: String,
      state: String,
      city: String
    }],
    interests: [String],
    industries: [String],
    userTypes: [{
      type: String,
      enum: ['business_owner', 'investor', 'admin']
    }]
  },
  budget: {
    total: {
      type: Number,
      required: true
    },
    daily: {
      type: Number,
      required: true
    },
    spent: {
      type: Number,
      default: 0
    }
  },
  duration: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  placement: {
    type: String,
    enum: ['feed', 'stories', 'search', 'profile', 'all'],
    default: 'all'
  },
  callToAction: {
    type: String,
    enum: ['learn_more', 'sign_up', 'invest_now', 'contact_us', 'visit_website'],
    default: 'learn_more'
  },
  destinationUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed', 'rejected'],
    default: 'pending'
  },
  analytics: {
    impressions: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    spend: {
      type: Number,
      default: 0
    },
    ctr: {
      type: Number,
      default: 0
    },
    cpc: {
      type: Number,
      default: 0
    },
    engagement: {
      type: Number,
      default: 0
    }
  },
  performance: {
    daily: [{
      date: Date,
      impressions: Number,
      clicks: Number,
      conversions: Number,
      spend: Number
    }],
    demographics: {
      age: {
        '18-24': Number,
        '25-34': Number,
        '35-44': Number,
        '45-54': Number,
        '55+': Number
      },
      gender: {
        male: Number,
        female: Number,
        other: Number
      },
      location: [{
        country: String,
        count: Number
      }]
    }
  },
  reviews: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true
    },
    comments: String,
    reviewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  compliance: {
    isCompliant: {
      type: Boolean,
      default: false
    },
    violations: [{
      type: String,
      description: String,
      resolved: {
        type: Boolean,
        default: false
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes
adSchema.index({ creator: 1, createdAt: -1 });
adSchema.index({ status: 1 });
adSchema.index({ 'duration.startDate': 1, 'duration.endDate': 1 });
adSchema.index({ 'targetAudience.locations': 1 });
adSchema.index({ 'targetAudience.interests': 1 });
adSchema.index({ 'analytics.engagement': -1 });

// Methods
adSchema.methods.updateAnalytics = async function(data) {
  this.analytics.impressions += data.impressions || 0;
  this.analytics.views += data.views || 0;
  this.analytics.clicks += data.clicks || 0;
  this.analytics.conversions += data.conversions || 0;
  this.analytics.spend += data.spend || 0;
  
  // Update CTR and CPC
  if (this.analytics.impressions > 0) {
    this.analytics.ctr = (this.analytics.clicks / this.analytics.impressions) * 100;
  }
  if (this.analytics.clicks > 0) {
    this.analytics.cpc = this.analytics.spend / this.analytics.clicks;
  }
  
  // Update daily performance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let dailyPerformance = this.performance.daily.find(
    day => day.date.getTime() === today.getTime()
  );
  
  if (!dailyPerformance) {
    dailyPerformance = {
      date: today,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0
    };
    this.performance.daily.push(dailyPerformance);
  }
  
  dailyPerformance.impressions += data.impressions || 0;
  dailyPerformance.clicks += data.clicks || 0;
  dailyPerformance.conversions += data.conversions || 0;
  dailyPerformance.spend += data.spend || 0;
  
  await this.save();
};

adSchema.methods.addReview = async function(reviewerId, status, comments) {
  this.reviews.push({
    reviewer: reviewerId,
    status,
    comments
  });
  
  if (status === 'approved') {
    this.status = 'active';
  } else if (status === 'rejected') {
    this.status = 'rejected';
  }
  
  await this.save();
};

adSchema.methods.updateCompliance = async function(violation) {
  this.compliance.violations.push({
    type: violation.type,
    description: violation.description
  });
  
  this.compliance.isCompliant = false;
  await this.save();
};

// Pre-save middleware to check budget and duration
adSchema.pre('save', function(next) {
  if (this.isModified('analytics.spend') && this.analytics.spend >= this.budget.total) {
    this.status = 'completed';
  }
  
  if (this.duration.endDate < new Date()) {
    this.status = 'completed';
  }
  
  next();
});

const Ad = mongoose.model('Ad', adSchema);

module.exports = Ad; 