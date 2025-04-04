const Campaign = require('../models/campaign.model');
const Investment = require('../models/investment.model');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');

class AnalyticsService {
  // Get platform overview
  async getPlatformOverview() {
    try {
      const [
        totalCampaigns,
        activeCampaigns,
        totalInvestments,
        totalInvestors,
        totalBusinessOwners,
        totalFunding
      ] = await Promise.all([
        Campaign.countDocuments(),
        Campaign.countDocuments({ status: 'active' }),
        Investment.countDocuments(),
        User.countDocuments({ userType: 'investor' }),
        User.countDocuments({ userType: 'business_owner' }),
        Investment.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);
      
      return {
        totalCampaigns,
        activeCampaigns,
        totalInvestments,
        totalInvestors,
        totalBusinessOwners,
        totalFunding: totalFunding[0]?.total || 0
      };
    } catch (error) {
      console.error('Get platform overview error:', error);
      throw error;
    }
  }
  
  // Get campaign analytics
  async getCampaignAnalytics(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId)
        .populate('investors.user', 'firstName lastName profilePicture');
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // Get investment statistics
      const investmentStats = await Investment.aggregate([
        { $match: { campaign: campaign._id } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' },
            totalInvestors: { $addToSet: '$investor' },
            recurringInvestors: {
              $addToSet: {
                $cond: [{ $eq: ['$isRecurring', true] }, '$investor', null]
              }
            }
          }
        }
      ]);
      
      // Get investment timeline
      const investmentTimeline = await Investment.aggregate([
        { $match: { campaign: campaign._id } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);
      
      // Get investor demographics
      const investorDemographics = await User.aggregate([
        { $match: { _id: { $in: campaign.investors.map(i => i.user) } } },
        {
          $group: {
            _id: '$location.country',
            count: { $sum: 1 },
            totalAmount: {
              $sum: {
                $let: {
                  vars: {
                    investment: {
                      $arrayElemAt: [
                        '$investments',
                        { $indexOfArray: ['$investments.campaign', campaign._id] }
                      ]
                    }
                  },
                  in: '$$investment.amount'
                }
              }
            }
          }
        }
      ]);
      
      return {
        campaign,
        statistics: {
          totalAmount: investmentStats[0]?.totalAmount || 0,
          averageAmount: investmentStats[0]?.averageAmount || 0,
          totalInvestors: investmentStats[0]?.totalInvestors?.length || 0,
          recurringInvestors: investmentStats[0]?.recurringInvestors?.filter(Boolean).length || 0
        },
        timeline: investmentTimeline,
        demographics: investorDemographics
      };
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      throw error;
    }
  }
  
  // Get user analytics
  async getUserAnalytics(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      let analytics = {};
      
      if (user.userType === 'investor') {
        // Get investment statistics
        const investmentStats = await Investment.aggregate([
          { $match: { investor: user._id } },
          {
            $group: {
              _id: null,
              totalInvested: { $sum: '$amount' },
              activeInvestments: {
                $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
              },
              completedInvestments: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              },
              recurringInvestments: {
                $sum: { $cond: [{ $eq: ['$isRecurring', true] }, 1, 0] }
              }
            }
          }
        ]);
        
        // Get investment history
        const investmentHistory = await Investment.find({ investor: user._id })
          .populate('campaign', 'title description status')
          .sort('-createdAt');
        
        analytics = {
          statistics: investmentStats[0] || {
            totalInvested: 0,
            activeInvestments: 0,
            completedInvestments: 0,
            recurringInvestments: 0
          },
          history: investmentHistory
        };
      } else if (user.userType === 'business_owner') {
        // Get campaign statistics
        const campaignStats = await Campaign.aggregate([
          { $match: { owner: user._id } },
          {
            $group: {
              _id: null,
              totalCampaigns: { $sum: 1 },
              activeCampaigns: {
                $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
              },
              fundedCampaigns: {
                $sum: { $cond: [{ $eq: ['$status', 'funded'] }, 1, 0] }
              },
              totalFunding: { $sum: '$fundingProgress' },
              totalViews: { $sum: '$views' }
            }
          }
        ]);
        
        // Get campaign performance
        const campaignPerformance = await Campaign.find({ owner: user._id })
          .select('title status fundingGoal fundingProgress views createdAt')
          .sort('-createdAt');
        
        analytics = {
          statistics: campaignStats[0] || {
            totalCampaigns: 0,
            activeCampaigns: 0,
            fundedCampaigns: 0,
            totalFunding: 0,
            totalViews: 0
          },
          performance: campaignPerformance
        };
      }
      
      return analytics;
    } catch (error) {
      console.error('Get user analytics error:', error);
      throw error;
    }
  }
  
  // Get engagement metrics
  async getEngagementMetrics(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // Get chat statistics
      const chatStats = await Chat.aggregate([
        { $match: { 'context.campaign': campaign._id } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: { $size: '$messages' } },
            uniqueParticipants: { $addToSet: '$participants' },
            averageResponseTime: {
              $avg: {
                $subtract: [
                  '$messages.createdAt',
                  '$messages.createdAt'
                ]
              }
            }
          }
        }
      ]);
      
      // Get comment statistics
      const commentStats = {
        totalComments: campaign.comments.length,
        uniqueCommenters: new Set(campaign.comments.map(c => c.user.toString())).size
      };
      
      // Get social sharing statistics
      const socialStats = {
        shares: campaign.socialShares || 0,
        likes: campaign.likes || 0,
        saves: campaign.saves || 0
      };
      
      return {
        chat: {
          totalMessages: chatStats[0]?.totalMessages || 0,
          uniqueParticipants: chatStats[0]?.uniqueParticipants?.length || 0,
          averageResponseTime: chatStats[0]?.averageResponseTime || 0
        },
        comments: commentStats,
        social: socialStats
      };
    } catch (error) {
      console.error('Get engagement metrics error:', error);
      throw error;
    }
  }
  
  // Get funding trends
  async getFundingTrends(timeframe = 'month') {
    try {
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
      }
      
      const trends = await Investment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);
      
      return trends;
    } catch (error) {
      console.error('Get funding trends error:', error);
      throw error;
    }
  }
  
  // Get category performance
  async getCategoryPerformance() {
    try {
      const performance = await Campaign.aggregate([
        {
          $group: {
            _id: '$category',
            totalCampaigns: { $sum: 1 },
            activeCampaigns: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            fundedCampaigns: {
              $sum: { $cond: [{ $eq: ['$status', 'funded'] }, 1, 0] }
            },
            totalFunding: { $sum: '$fundingProgress' },
            averageFunding: { $avg: '$fundingProgress' },
            successRate: {
              $avg: {
                $cond: [
                  { $eq: ['$status', 'funded'] },
                  { $divide: ['$fundingProgress', '$fundingGoal'] },
                  0
                ]
              }
            }
          }
        },
        { $sort: { totalFunding: -1 } }
      ]);
      
      return performance;
    } catch (error) {
      console.error('Get category performance error:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService(); 