const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const { createHash } = require('crypto');
const Investment = require('../models/investment.model');
const Campaign = require('../models/campaign.model');

// Initialize PayPal
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  )
);

// Payment service class
class PaymentService {
  // Process Stripe payment
  async processStripePayment(investmentData) {
    try {
      const { amount, currency, paymentMethodId, campaignId } = investmentData;
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency,
        payment_method: paymentMethodId,
        confirm: true,
        return_url: `${process.env.FRONTEND_URL}/payment/confirm`
      });
      
      // Create investment record
      const investment = new Investment({
        ...investmentData,
        paymentMethod: 'stripe',
        paymentDetails: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status
        }
      });
      
      await investment.save();
      
      // Update campaign funding progress
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { currentAmount: amount }
      });
      
      return {
        success: true,
        investment,
        paymentIntent
      };
    } catch (error) {
      console.error('Stripe payment error:', error);
      throw error;
    }
  }
  
  // Process PayPal payment
  async processPayPalPayment(investmentData) {
    try {
      const { amount, currency, campaignId } = investmentData;
      
      // Create PayPal order
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString()
          }
        }]
      });
      
      const order = await paypalClient.execute(request);
      
      // Create investment record
      const investment = new Investment({
        ...investmentData,
        paymentMethod: 'paypal',
        paymentDetails: {
          orderId: order.result.id,
          status: 'pending'
        }
      });
      
      await investment.save();
      
      return {
        success: true,
        investment,
        orderId: order.result.id
      };
    } catch (error) {
      console.error('PayPal payment error:', error);
      throw error;
    }
  }
  
  // Process M-Pesa payment
  async processMPesaPayment(investmentData) {
    try {
      const { amount, phoneNumber, campaignId } = investmentData;
      
      // Generate transaction reference
      const transactionRef = createHash('sha256')
        .update(`${phoneNumber}${Date.now()}`)
        .digest('hex');
      
      // Create investment record
      const investment = new Investment({
        ...investmentData,
        paymentMethod: 'mpesa',
        paymentDetails: {
          transactionId: transactionRef,
          status: 'pending'
        }
      });
      
      await investment.save();
      
      // TODO: Integrate with M-Pesa API
      // This is a placeholder for M-Pesa integration
      
      return {
        success: true,
        investment,
        transactionRef
      };
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      throw error;
    }
  }
  
  // Process recurring payment
  async processRecurringPayment(investmentData) {
    try {
      const { amount, frequency, paymentMethod, campaignId } = investmentData;
      
      let subscription;
      
      if (paymentMethod === 'stripe') {
        // Create Stripe subscription
        subscription = await stripe.subscriptions.create({
          customer: investmentData.customerId,
          items: [{ price: investmentData.priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent']
        });
      }
      
      // Create investment record
      const investment = new Investment({
        ...investmentData,
        investmentType: 'recurring',
        recurringDetails: {
          frequency,
          nextPaymentDate: this.calculateNextPaymentDate(frequency),
          endDate: investmentData.endDate
        },
        paymentDetails: {
          subscriptionId: subscription?.id,
          status: 'active'
        }
      });
      
      await investment.save();
      
      return {
        success: true,
        investment,
        subscription
      };
    } catch (error) {
      console.error('Recurring payment error:', error);
      throw error;
    }
  }
  
  // Calculate next payment date
  calculateNextPaymentDate(frequency) {
    const date = new Date();
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        throw new Error('Invalid frequency');
    }
    return date;
  }
  
  // Handle payment webhook
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handleStripePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handleStripePaymentFailure(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleStripeSubscriptionPayment(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleStripeSubscriptionFailure(event.data.object);
          break;
        default:
          console.log('Unhandled event type:', event.type);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }
  
  // Handle Stripe payment success
  async handleStripePaymentSuccess(paymentIntent) {
    const investment = await Investment.findOne({
      'paymentDetails.paymentIntentId': paymentIntent.id
    });
    
    if (investment) {
      investment.paymentDetails.status = 'completed';
      await investment.save();
      
      // Update campaign funding progress
      await Campaign.findByIdAndUpdate(investment.campaign, {
        $inc: { currentAmount: investment.amount }
      });
    }
  }
  
  // Handle Stripe payment failure
  async handleStripePaymentFailure(paymentIntent) {
    const investment = await Investment.findOne({
      'paymentDetails.paymentIntentId': paymentIntent.id
    });
    
    if (investment) {
      investment.paymentDetails.status = 'failed';
      await investment.save();
    }
  }
  
  // Handle Stripe subscription payment
  async handleStripeSubscriptionPayment(invoice) {
    const investment = await Investment.findOne({
      'paymentDetails.subscriptionId': invoice.subscription
    });
    
    if (investment) {
      // Create new payment record
      investment.milestonePayments.push({
        amount: invoice.amount_paid / 100,
        status: 'paid',
        paidDate: new Date()
      });
      
      // Update next payment date
      investment.recurringDetails.nextPaymentDate = this.calculateNextPaymentDate(
        investment.recurringDetails.frequency
      );
      
      await investment.save();
    }
  }
  
  // Handle Stripe subscription failure
  async handleStripeSubscriptionFailure(invoice) {
    const investment = await Investment.findOne({
      'paymentDetails.subscriptionId': invoice.subscription
    });
    
    if (investment) {
      investment.milestonePayments.push({
        amount: invoice.amount_due / 100,
        status: 'overdue',
        dueDate: new Date(invoice.due_date * 1000)
      });
      
      await investment.save();
    }
  }
}

module.exports = new PaymentService(); 