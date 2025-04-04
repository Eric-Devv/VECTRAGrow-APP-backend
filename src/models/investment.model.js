const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  investor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'mpesa', 'crypto'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    paymentIntentId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Investment type
  investmentType: {
    type: String,
    enum: ['one_time', 'recurring'],
    default: 'one_time'
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextPaymentDate: Date,
    endDate: Date
  },
  
  // Investment terms
  terms: {
    equity: Number,
    interestRate: Number,
    repaymentPeriod: Number,
    expectedReturn: Number
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'defaulted'],
    default: 'pending'
  },
  
  // Milestone tracking
  milestonePayments: [{
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign.milestones'
    },
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    },
    dueDate: Date,
    paidDate: Date
  }],
  
  // Returns tracking
  returns: [{
    amount: Number,
    date: Date,
    type: {
      type: String,
      enum: ['dividend', 'interest', 'principal'],
      default: 'interest'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    }
  }],
  
  // Communication
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['agreement', 'receipt', 'statement', 'other']
    },
    url: String,
    name: String,
    uploadedAt: Date
  }],
  
  // Analytics
  analytics: {
    totalReturn: {
      type: Number,
      default: 0
    },
    roi: {
      type: Number,
      default: 0
    },
    riskScore: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
investmentSchema.index({ investor: 1 });
investmentSchema.index({ campaign: 1 });
investmentSchema.index({ status: 1 });
investmentSchema.index({ 'paymentDetails.transactionId': 1 });
investmentSchema.index({ createdAt: -1 });

// Virtual fields
investmentSchema.virtual('totalReturn').get(function() {
  return this.returns.reduce((total, return_) => {
    return total + (return_.status === 'paid' ? return_.amount : 0);
  }, 0);
});

investmentSchema.virtual('roi').get(function() {
  return ((this.totalReturn - this.amount) / this.amount) * 100;
});

// Methods
investmentSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  await this.save();
};

investmentSchema.methods.addReturn = async function(amount, type) {
  this.returns.push({
    amount,
    type,
    date: new Date(),
    status: 'pending'
  });
  
  await this.save();
};

investmentSchema.methods.addMessage = async function(senderId, content) {
  this.messages.push({
    sender: senderId,
    content,
    createdAt: new Date()
  });
  
  await this.save();
};

const Investment = mongoose.model('Investment', investmentSchema);

module.exports = Investment; 