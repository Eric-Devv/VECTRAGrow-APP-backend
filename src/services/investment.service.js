const Investment = require('../models/investment.model');
const Campaign = require('../models/campaign.model');
const User = require('../models/user.model');
const PaymentService = require('./payment.service');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

class InvestmentService {
  // Process new investment
  async processInvestment(investmentData) {
    try {
      const { campaignId, userId, amount, paymentMethod, paymentDetails } = investmentData;
      
      // Get campaign and validate
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      if (campaign.status !== 'active') {
        throw new Error('Campaign is not active');
      }
      
      if (campaign.fundingProgress + amount > campaign.fundingGoal) {
        throw new Error('Investment amount exceeds remaining funding goal');
      }
      
      // Get user and validate
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Process payment based on method
      let paymentResult;
      switch (paymentMethod) {
        case 'stripe':
          paymentResult = await PaymentService.processStripePayment({
            amount,
            currency: campaign.currency,
            paymentMethodId: paymentDetails.paymentMethodId,
            userId,
            campaignId
          });
          break;
          
        case 'paypal':
          paymentResult = await PaymentService.processPayPalPayment({
            amount,
            currency: campaign.currency,
            userId,
            campaignId
          });
          break;
          
        case 'mpesa':
          paymentResult = await PaymentService.processMPesaPayment({
            amount,
            phoneNumber: paymentDetails.phoneNumber,
            userId,
            campaignId
          });
          break;
          
        default:
          throw new Error('Unsupported payment method');
      }
      
      // Create investment record
      const investment = new Investment({
        campaign: campaignId,
        investor: userId,
        amount,
        paymentMethod,
        paymentDetails: paymentResult,
        status: paymentResult.status
      });
      
      await investment.save();
      
      // Update campaign funding progress
      campaign.fundingProgress += amount;
      campaign.investors.push({
        user: userId,
        amount,
        date: new Date()
      });
      
      // Check if funding goal is reached
      if (campaign.fundingProgress >= campaign.fundingGoal) {
        campaign.status = 'funded';
        await this.handleFundingGoalReached(campaign);
      }
      
      await campaign.save();
      
      // Send notifications
      await this.sendInvestmentNotifications(investment, campaign, user);
      
      return investment;
    } catch (error) {
      console.error('Process investment error:', error);
      throw error;
    }
  }
  
  // Get user investments
  async getUserInvestments(userId, page = 1, limit = 10) {
    try {
      const investments = await Investment.find({ investor: userId })
        .populate('campaign', 'title description fundingGoal fundingProgress status')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit);
      
      const total = await Investment.countDocuments({ investor: userId });
      
      return {
        investments,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get user investments error:', error);
      throw error;
    }
  }
  
  // Get campaign investments
  async getCampaignInvestments(campaignId, page = 1, limit = 10) {
    try {
      const investments = await Investment.find({ campaign: campaignId })
        .populate('investor', 'firstName lastName profilePicture')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit);
      
      const total = await Investment.countDocuments({ campaign: campaignId });
      
      return {
        investments,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get campaign investments error:', error);
      throw error;
    }
  }
  
  // Process recurring investment
  async processRecurringInvestment(investmentData) {
    try {
      const { campaignId, userId, amount, frequency, paymentMethod, paymentDetails } = investmentData;
      
      // Validate campaign and user
      const campaign = await Campaign.findById(campaignId);
      if (!campaign || campaign.status !== 'active') {
        throw new Error('Campaign not found or not active');
      }
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Process recurring payment
      const paymentResult = await PaymentService.processRecurringPayment({
        amount,
        currency: campaign.currency,
        frequency,
        paymentMethod,
        paymentDetails,
        userId,
        campaignId
      });
      
      // Create investment record
      const investment = new Investment({
        campaign: campaignId,
        investor: userId,
        amount,
        paymentMethod,
        paymentDetails: paymentResult,
        status: 'active',
        isRecurring: true,
        recurringDetails: {
          frequency,
          nextPaymentDate: paymentResult.nextPaymentDate,
          subscriptionId: paymentResult.subscriptionId
        }
      });
      
      await investment.save();
      
      // Update campaign funding progress
      campaign.fundingProgress += amount;
      campaign.investors.push({
        user: userId,
        amount,
        date: new Date(),
        isRecurring: true
      });
      
      if (campaign.fundingProgress >= campaign.fundingGoal) {
        campaign.status = 'funded';
        await this.handleFundingGoalReached(campaign);
      }
      
      await campaign.save();
      
      // Send notifications
      await this.sendInvestmentNotifications(investment, campaign, user);
      
      return investment;
    } catch (error) {
      console.error('Process recurring investment error:', error);
      throw error;
    }
  }
  
  // Cancel recurring investment
  async cancelRecurringInvestment(investmentId, userId) {
    try {
      const investment = await Investment.findOne({
        _id: investmentId,
        investor: userId,
        isRecurring: true
      });
      
      if (!investment) {
        throw new Error('Investment not found or not recurring');
      }
      
      // Cancel subscription with payment provider
      await PaymentService.cancelSubscription(investment.paymentDetails.subscriptionId);
      
      // Update investment status
      investment.status = 'cancelled';
      investment.recurringDetails.nextPaymentDate = null;
      await investment.save();
      
      // Send cancellation notification
      await this.sendCancellationNotification(investment);
      
      return investment;
    } catch (error) {
      console.error('Cancel recurring investment error:', error);
      throw error;
    }
  }
  
  // Handle funding goal reached
  async handleFundingGoalReached(campaign) {
    try {
      // Notify campaign owner
      const owner = await User.findById(campaign.owner);
      if (owner) {
        await sendEmail({
          to: owner.email,
          template: 'fundingGoalReached',
          data: {
            firstName: owner.firstName,
            campaignTitle: campaign.title,
            campaignId: campaign._id
          }
        });
        
        if (owner.phoneNumber) {
          await sendSMS({
            to: owner.phoneNumber,
            template: 'fundingGoalReached',
            data: {
              campaignTitle: campaign.title
            }
          });
        }
      }
      
      // Notify investors
      const investors = await User.find({
        _id: { $in: campaign.investors.map(i => i.user) }
      });
      
      for (const investor of investors) {
        await sendEmail({
          to: investor.email,
          template: 'campaignFunded',
          data: {
            firstName: investor.firstName,
            campaignTitle: campaign.title,
            campaignId: campaign._id
          }
        });
      }
    } catch (error) {
      console.error('Handle funding goal reached error:', error);
    }
  }
  
  // Send investment notifications
  async sendInvestmentNotifications(investment, campaign, user) {
    try {
      // Notify investor
      await sendEmail({
        to: user.email,
        template: 'investmentConfirmation',
        data: {
          firstName: user.firstName,
          amount: investment.amount,
          campaignTitle: campaign.title,
          campaignId: campaign._id
        }
      });
      
      if (user.phoneNumber) {
        await sendSMS({
          to: user.phoneNumber,
          template: 'investmentConfirmation',
          data: {
            amount: investment.amount,
            campaignTitle: campaign.title
          }
        });
      }
      
      // Notify campaign owner
      const owner = await User.findById(campaign.owner);
      if (owner) {
        await sendEmail({
          to: owner.email,
          template: 'newInvestment',
          data: {
            firstName: owner.firstName,
            investorName: `${user.firstName} ${user.lastName}`,
            amount: investment.amount,
            campaignTitle: campaign.title,
            campaignId: campaign._id
          }
        });
      }
    } catch (error) {
      console.error('Send investment notifications error:', error);
    }
  }
  
  // Send cancellation notification
  async sendCancellationNotification(investment) {
    try {
      const user = await User.findById(investment.investor);
      const campaign = await Campaign.findById(investment.campaign);
      
      if (user && campaign) {
        await sendEmail({
          to: user.email,
          template: 'investmentCancelled',
          data: {
            firstName: user.firstName,
            campaignTitle: campaign.title,
            campaignId: campaign._id
          }
        });
      }
    } catch (error) {
      console.error('Send cancellation notification error:', error);
    }
  }
}

module.exports = new InvestmentService(); 