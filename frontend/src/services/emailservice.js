const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;

// Email configuration
const emailConfig = {
  service: 'gmail', // You can change to other services
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'saaslocal.platform@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter(emailConfig);
};

// Email templates directory
const TEMPLATES_DIR = path.join(__dirname, '../templates/emails');

// Ensure templates directory exists
const ensureTemplatesDir = async () => {
  try {
    await fs.access(TEMPLATES_DIR);
  } catch (error) {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  }
};

// Default email template wrapper
const getDefaultTemplate = (title, content, buttonText = '', buttonUrl = '') => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .content h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        .content p {
            margin-bottom: 15px;
            font-size: 16px;
            line-height: 1.8;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
            transition: transform 0.2s;
        }
        
        .button:hover {
            transform: translateY(-2px);
        }
        
        .stats {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .stats-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .stats-label {
            font-weight: bold;
            color: #495057;
        }
        
        .stats-value {
            color: #007bff;
            font-weight: bold;
        }
        
        .footer {
            background-color: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .footer p {
            margin-bottom: 10px;
        }
        
        .footer a {
            color: #3498db;
            text-decoration: none;
        }
        
        .social-links {
            margin-top: 20px;
        }
        
        .social-links a {
            color: white;
            margin: 0 10px;
            text-decoration: none;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                box-shadow: none;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .content h2 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SaaS Local</h1>
            <p>Pakistani Business Automation Platform</p>
        </div>
        
        <div class="content">
            ${content}
            
            ${buttonText && buttonUrl ? `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${buttonUrl}" class="button">${buttonText}</a>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p><strong>SaaS Local - Empowering Pakistani Businesses</strong></p>
            <p>Automated social media posting and e-commerce for local businesses</p>
            <p>📧 support@saaslocal.pk | 📱 +92-321-1234567</p>
            
            <div class="social-links">
                <a href="#">Facebook</a> |
                <a href="#">Instagram</a> |
                <a href="#">Twitter</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
                © 2024 SaaS Local. All rights reserved.<br>
                Made with ❤️ for Pakistani entrepreneurs
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

// Email service functions
const emailService = {
  // Send welcome email to new users
  sendWelcomeEmail: async (user) => {
    try {
      await ensureTemplatesDir();
      
      const content = `
        <h2>Welcome to SaaS Local, ${user.name}! 🎉</h2>
        
        <p><strong>Assalam-o-Alaikum aur SaaS Local mein khush amadeed!</strong></p>
        
        <p>Congratulations on joining Pakistan's most powerful business automation platform! We're excited to help you grow your <strong>${user.businessType || 'business'}</strong> with our AI-powered tools.</p>
        
        <h3>🚀 Here's what you can do right now:</h3>
        <ul style="margin: 20px 0; padding-left: 30px;">
            <li><strong>Connect Social Media:</strong> Link your Facebook and Instagram accounts</li>
            <li><strong>Create AI Content:</strong> Generate engaging posts automatically</li>
            <li><strong>Setup Your Store:</strong> Start selling online immediately</li>
            <li><strong>Schedule Posts:</strong> Automate your social media presence</li>
        </ul>
        
        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">Business Name:</span>
                <span class="stats-value">${user.businessName || user.name}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Business Type:</span>
                <span class="stats-value">${user.businessType || 'General Business'}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Account Status:</span>
                <span class="stats-value">Active</span>
            </div>
        </div>
        
        <h3>🎯 Quick Start Tips:</h3>
        <p><strong>1. Complete Your Profile:</strong> Add your business details, location, and photos</p>
        <p><strong>2. Connect Social Media:</strong> Link Facebook and Instagram for automated posting</p>
        <p><strong>3. Generate Your First Post:</strong> Use our AI to create engaging content</p>
        <p><strong>4. Setup Your Store:</strong> Add products and start selling online</p>
        
        <p style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;">
            <strong>💡 Pro Tip:</strong> Pakistani businesses see 300% more engagement when they post consistently. Our automation handles this for you!
        </p>
        
        <p>Need help? Our Pakistani support team is here for you in both English and Urdu!</p>
        
        <p><strong>Happy business building!</strong><br>
        The SaaS Local Team 🇵🇰</p>
      `;

      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"SaaS Local Team" <${emailConfig.auth.user}>`,
        to: user.email,
        subject: `Welcome to SaaS Local - Let's Grow Your Business! 🚀`,
        html: getDefaultTemplate(
          'Welcome to SaaS Local',
          content,
          'Complete Your Setup',
          `${process.env.FRONTEND_URL}/dashboard/profile`
        )
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Welcome email sent to ${user.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Welcome email error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send email verification
  sendEmailVerification: async (user, verificationToken) => {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      
      const content = `
        <h2>Verify Your Email Address</h2>
        
        <p>Assalam-o-Alaikum ${user.name},</p>
        
        <p>Thank you for joining SaaS Local! Please verify your email address to activate your account and start growing your business.</p>
        
        <p style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <strong>⚠️ Important:</strong> Your account access is limited until you verify your email address.
        </p>
        
        <p>Click the button below to verify your email:</p>
        
        <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">${verificationUrl}</a>
        </p>
        
        <p style="font-size: 14px; color: #dc3545;">
            <strong>Security Note:</strong> This verification link will expire in 24 hours for your security.
        </p>
        
        <p>Welcome to the SaaS Local family! 🇵🇰</p>
      `;

      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"SaaS Local Verification" <${emailConfig.auth.user}>`,
        to: user.email,
        subject: 'Verify Your SaaS Local Account - Action Required',
        html: getDefaultTemplate(
          'Email Verification',
          content,
          'Verify Email Address',
          verificationUrl
        )
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Verification email sent to ${user.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Verification email error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send password reset email
  sendPasswordReset: async (user, resetToken) => {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const content = `
        <h2>Reset Your Password</h2>
        
        <p>Assalam-o-Alaikum ${user.name},</p>
        
        <p>We received a request to reset your password for your SaaS Local account. If you didn't make this request, you can safely ignore this email.</p>
        
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <strong>🔒 Security Alert:</strong> Someone requested a password reset for your account.
        </div>
        
        <p>Click the button below to create a new password:</p>
        
        <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">Request Time:</span>
                <span class="stats-value">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} PKT</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Valid Until:</span>
                <span class="stats-value">${new Date(Date.now() + 3600000).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} PKT</span>
            </div>
        </div>
        
        <p style="font-size: 14px; color: #dc3545;">
            <strong>⏰ Important:</strong> This reset link will expire in 1 hour for your security.
        </p>
        
        <p>If you didn't request this password reset, please contact our support team immediately.</p>
      `;

      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"SaaS Local Security" <${emailConfig.auth.user}>`,
        to: user.email,
        subject: 'Reset Your SaaS Local Password - Security Alert',
        html: getDefaultTemplate(
          'Password Reset',
          content,
          'Reset Password',
          resetUrl
        )
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Password reset email sent to ${user.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Password reset email error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send post confirmation email
  sendPostConfirmation: async (user, post, postResults) => {
    try {
      const successfulPlatforms = Object.keys(postResults).filter(platform => postResults[platform].success);
      const failedPlatforms = Object.keys(postResults).filter(platform => !postResults[platform].success);
      
      const content = `
        <h2>Your Post Has Been Published! 🎉</h2>
        
        <p>Assalam-o-Alaikum ${user.name},</p>
        
        <p>Great news! Your social media post has been successfully published on your selected platforms.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">📝 Post Content:</h3>
            <p style="font-style: italic; background-color: white; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;">
                "${post.content.text.substring(0, 200)}${post.content.text.length > 200 ? '...' : ''}"
            </p>
        </div>
        
        <h3>✅ Successfully Published On:</h3>
        <ul style="margin: 15px 0; padding-left: 30px;">
          ${successfulPlatforms.map(platform => 
            `<li style="margin-bottom: 8px;"><strong>${platform.charAt(0).toUpperCase() + platform.slice(1)}:</strong> Posted successfully at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} PKT</li>`
          ).join('')}
        </ul>
        
        ${failedPlatforms.length > 0 ? `
        <h3 style="color: #dc3545;">❌ Failed Platforms:</h3>
        <ul style="margin: 15px 0; padding-left: 30px; color: #dc3545;">
          ${failedPlatforms.map(platform => 
            `<li style="margin-bottom: 8px;"><strong>${platform.charAt(0).toUpperCase() + platform.slice(1)}:</strong> ${postResults[platform].error}</li>`
          ).join('')}
        </ul>
        ` : ''}
        
        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">Post ID:</span>
                <span class="stats-value">#${post._id.toString().slice(-8)}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Content Type:</span>
                <span class="stats-value">${post.content.contentType || 'General'}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Platforms:</span>
                <span class="stats-value">${successfulPlatforms.join(', ')}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Published At:</span>
                <span class="stats-value">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} PKT</span>
            </div>
        </div>
        
        <p style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <strong>📈 Pro Tip:</strong> Check your analytics in 24-48 hours to see how your post performed across platforms!
        </p>
        
        <p>Keep creating amazing content for your ${user.businessType} business!</p>
      `;

      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"SaaS Local Posts" <${emailConfig.auth.user}>`,
        to: user.email,
        subject: `✅ Your Post is Live - Published on ${successfulPlatforms.join(', ')}`,
        html: getDefaultTemplate(
          'Post Published Successfully',
          content,
          'View Analytics',
          `${process.env.FRONTEND_URL}/dashboard/posts`
        )
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Post confirmation email sent to ${user.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Post confirmation email error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send weekly report email
  sendWeeklyReport: async (user, analyticsData) => {
    try {
      const { social, store, period } = analyticsData;
      const weekStart = new Date(period.start).toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
      const weekEnd = new Date(period.end).toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
      
      const content = `
        <h2>Your Weekly Business Report 📊</h2>
        
        <p>Assalam-o-Alaikum ${user.name},</p>
        
        <p>Here's your weekly performance summary for <strong>${user.businessName || user.name}</strong> from ${weekStart} to ${weekEnd}.</p>
        
        <h3>📱 Social Media Performance</h3>
        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">Total Posts:</span>
                <span class="stats-value">${social.totalPosts}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Published Posts:</span>
                <span class="stats-value">${social.publishedPosts}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Total Engagement:</span>
                <span class="stats-value">${social.totalEngagement.toLocaleString()}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Total Reach:</span>
                <span class="stats-value">${social.totalReach.toLocaleString()}</span>
            </div>
        </div>
        
        ${store ? `
        <h3>🛍️ Store Performance</h3>
        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">New Orders:</span>
                <span class="stats-value">${store.totalOrders}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Revenue:</span>
                <span class="stats-value">PKR ${store.revenue.toLocaleString()}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">New Customers:</span>
                <span class="stats-value">${store.newCustomers}</span>
            </div>
        </div>
        ` : `
        <p style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;">
            <strong>💡 Suggestion:</strong> Setup your online store to start selling and track revenue alongside your social media growth!
        </p>
        `}
        
        <h3>🎯 This Week's Highlights</h3>
        <ul style="margin: 20px 0; padding-left: 30px;">
            ${social.publishedPosts > 0 ? `<li>✅ Posted ${social.publishedPosts} times across your social media platforms</li>` : ''}
            ${social.totalEngagement > 0 ? `<li>❤️ Received ${social.totalEngagement} total engagements from your audience</li>` : ''}
            ${store && store.totalOrders > 0 ? `<li>🛒 Generated ${store.totalOrders} new orders worth PKR ${store.revenue.toLocaleString()}</li>` : ''}
            ${store && store.newCustomers > 0 ? `<li>👥 Welcomed ${store.newCustomers} new customers to your business</li>` : ''}
        </ul>
        
        <p style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <strong>🚀 Keep it up!</strong> Consistent posting and engagement are key to growing your Pakistani business online.
        </p>
        
        <p>Continue the great work, and we'll see you next week with more insights!</p>
      `;

      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"SaaS Local Analytics" <${emailConfig.auth.user}>`,
        to: user.email,
        subject: `📊 Weekly Report: ${weekStart} - ${weekEnd} | ${user.businessName || user.name}`,
        html: getDefaultTemplate(
          'Weekly Business Report',
          content,
          'View Full Dashboard',
          `${process.env.FRONTEND_URL}/dashboard`
        )
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Weekly report email sent to ${user.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Weekly report email error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send subscription renewal confirmation
  sendSubscriptionRenewalConfirmation: async (user, subscription) => {
    try {
      const content = `
        <h2>Subscription Renewed Successfully! 🎉</h2>
        
        <p>Assalam-o-Alaikum ${user.name},</p>
        
        <p>Your SaaS Local subscription has been successfully renewed. Thank you for continuing to trust us with your business growth!</p>
        
        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">Plan:</span>
                <span class="stats-value">${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Renewal Date:</span>
                <span class="stats-value">${new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' })}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Next Billing:</span>
                <span class="stats-value">${new Date(subscription.billing.nextBillingDate).toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' })}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Amount:</span>
                <span class="stats-value">PKR ${subscription.billing.currentPlan.price.toLocaleString()}</span>
            </div>
        </div>
        
        <h3>✨ Your Plan Includes:</h3>
        <ul style="margin: 20px 0; padding-left: 30px;">
            <li>📝 ${subscription.features.monthlyPosts} AI-generated posts per month</li>
            <li>📱 ${subscription.features.socialPlatforms} social media platform${subscription.features.socialPlatforms > 1 ? 's' : ''}</li>
            <li>🛍️ ${subscription.features.maxProducts} products in your store</li>
            <li>📊 ${subscription.features.analytics ? 'Advanced' : 'Basic'} analytics</li>
            ${subscription.features.customBranding ? '<li>🎨 Custom branding</li>' : ''}
            ${subscription.features.prioritySupport ? '<li>⚡ Priority support</li>' : ''}
        </ul>
        
        <p style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <strong>🔄 Monthly Reset:</strong> Your usage limits have been reset for this new billing cycle. Time to create amazing content!
        </p>
        
        <p>Thank you for being a valued member of the SaaS Local community!</p>
      `;

      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"SaaS Local Billing" <${emailConfig.auth.user}>`,
        to: user.email,
        subject: `✅ Subscription Renewed - ${subscription.plan} Plan Active`,
        html: getDefaultTemplate(
          'Subscription Renewed',
          content,
          'Access Dashboard',
          `${process.env.FRONTEND_URL}/dashboard`
        )
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Subscription renewal email sent to ${user.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Subscription renewal email error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send automated content notification
  sendAutomatedContentNotification: async (user, post) => {
    try {
      const scheduledTime = new Date(post.schedule.scheduledFor).toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
      
      const content = `
        <h2>AI Content Scheduled for You! 🤖</h2>
        
        <p>Assalam-o-Alaikum ${user.name},</p>
        
        <p>Our AI has generated and scheduled new content for your ${user.businessType} business. Here's what's coming up:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">🎯 Scheduled Post Preview:</h3>
            <p style="font-style: italic; background-color: white; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
                "${post.content.text.substring(0, 150)}${post.content.text.length > 150 ? '...' : ''}"
            </p>
        </div>
        
        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">Content Type:</span>
                <span class="stats-value">${post.content.contentType}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Scheduled For:</span>
                <span class="stats-value">${scheduledTime} PKT</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Platforms:</span>
                <span class="stats-value">${Object.keys(post.platforms).filter(p => post.platforms[p]).join(', ')}</span>
            </div>
        </div>
        
        <p style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;">
            <strong>✏️ Want to Edit?</strong> You can modify or cancel this post anytime before it's published through your dashboard.
        </p>
        
        <p>Our AI continues to work for your business growth, even while you sleep! 🌙</p>
      `;

      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"SaaS Local AI" <${emailConfig.auth.user}>`,
        to: user.email,
        subject: `🤖 AI Content Scheduled - Auto-posting at ${scheduledTime.split(',')[1]} PKT`,
        html: getDefaultTemplate(
          'AI Content Scheduled',
          content,
          'Review & Edit',
          `${process.env.FRONTEND_URL}/dashboard/posts`
        )
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Automated content notification sent to ${user.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Automated content notification error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send order confirmation email
  sendOrderConfirmation: async (order, store) => {
    try {
      const content = `
        <h2>Order Confirmation - Thank You! 🛍️</h2>
        
        <p>Assalam-o-Alaikum ${order.customer.name},</p>
        
        <p>Thank you for your order from <strong>${store.storeSettings.name}</strong>! We're excited to serve you.</p>
        
        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">Order Number:</span>
                <span class="stats-value">#${order.orderNumber}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Order Date:</span>
                <span class="stats-value">${new Date(order.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' })}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Total Amount:</span>
                <span class="stats-value">PKR ${order.totals.total.toLocaleString()}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Status:</span>
                <span class="stats-value">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            </div>
        </div>
        
        <h3>📦 Order Items:</h3>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${order.items.map(item => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #dee2e6;">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>Quantity: ${item.quantity}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong>PKR ${item.total.toLocaleString()}</strong>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <h3>🚚 Delivery Information:</h3>
        <p><strong>Address:</strong><br>
        ${order.delivery.address.street}<br>
        ${order.delivery.address.city}, ${order.delivery.address.state} ${order.delivery.address.zipCode}</p>
        
        <p style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <strong>📞 Stay Connected:</strong> We'll keep you updated via SMS and email about your order status.
        </p>
        
        <p>Thank you for supporting local Pakistani businesses! 🇵🇰</p>
      `;

      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"${store.storeSettings.name}" <${emailConfig.auth.user}>`,
        to: order.customer.email,
        subject: `Order Confirmed #${order.orderNumber} - ${store.storeSettings.name}`,
        html: getDefaultTemplate(
          'Order Confirmation',
          content,
          'Track Your Order',
          `${process.env.FRONTEND_URL}/track-order/${order.orderNumber}`
        )
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Order confirmation email sent to ${order.customer.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Order confirmation email error:', error);
      return { success: false, error: error.message };
    }
  },

  // Test email configuration
  testEmailConfig: async () => {
    try {
      const transporter = createTransporter();
      await transporter.verify();
      
      console.log('✅ Email configuration is valid');
      return { success: true, message: 'Email configuration is working' };
      
    } catch (error) {
      console.error('❌ Email configuration error:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = emailService;