const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Load and compile email templates
const templates = {};

async function loadTemplate(templateName) {
  if (templates[templateName]) {
    return templates[templateName];
  }

  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  templates[templateName] = handlebars.compile(templateContent);
  return templates[templateName];
}

async function sendEmail({ to, subject, template, context }) {
  try {
    const compiledTemplate = await loadTemplate(template);
    const html = compiledTemplate(context);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

module.exports = {
  sendEmail
};

// Send bulk emails
exports.sendBulkEmails = async (recipients, template, data) => {
  try {
    const emailPromises = recipients.map(recipient => 
      exports.sendEmail({
        to: recipient.email,
        template,
        data: { ...data, ...recipient }
      })
    );
    
    const results = await Promise.allSettled(emailPromises);
    return results;
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    throw error;
  }
};

// Verify email configuration
exports.verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}; 