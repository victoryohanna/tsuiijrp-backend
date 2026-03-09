// utils/email.js
const nodemailer = require("nodemailer");
const path = require("path");
const { generateToken } = require("./auth");
const SibApiV3Sdk = require("@getbrevo/brevo");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Initialize Brevo
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
let apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = process.env.BREVO_EMAIL_API_KEY;

/**
 * Send review invitation with direct download link (no authentication required)
 * @param {string} reviewerEmail - Email of the reviewer
 * @param {Object} journal - The journal object with all details
 * @param {string} reviewToken - Unique token for accessing the review page
 * @returns {Promise<boolean>}
 */
exports.sendReviewInvitation = async (reviewerEmail, journal, reviewToken) => {
  // If reviewerEmail is not provided, use the first reviewer from env
  if (!reviewerEmail) {
    const reviewers = [
      process.env.FIRST_REVIEWER,
      process.env.SECOND_REVIEWER,
      process.env.THIRD_REVIEWER,
      process.env.FOURTH_REVIEWER,
      process.env.FIFTH_REVIEWER,
      process.env.SIXTH_REVIEWER,
    ].filter((email) => email);

    if (reviewers.length === 0) {
      console.error("No reviewers found in environment variables.");
      return false;
    }

    // Use the first reviewer as default
    reviewerEmail = reviewers[0].email || reviewers[0];
  }

  // Create the review link using the token (no JWT token in URL)
  const reviewLink = `${process.env.FRONTEND_URL || process.env.BASE_URL}/review/${reviewToken}`;

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  // Prepare email content
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = `New Journal Submission for Review: ${journal.title || "Untitled"}`;
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📋 Journal Review Request</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">International Interdisciplinary Journal of Religion & Philosophy (IIJRP)</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear Reviewer,</p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
            A new journal has been submitted for review. Please find the submission details below:
          </p>

          <!-- Submission Details Card -->
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 15px; color: #333; font-size: 18px;">📄 Submission Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Title:</strong></td>
                <td style="padding: 8px 0; color: #333;">${journal.title || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Category:</strong></td>
                <td style="padding: 8px 0; color: #333;">${journal.category || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Submitted by:</strong></td>
                <td style="padding: 8px 0; color: #333;">${journal.submittedBy?.fullName || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                <td style="padding: 8px 0; color: #333;">${journal.submittedBy?.email || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
                <td style="padding: 8px 0; color: #333;">${journal.submittedBy?.phoneNumber || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>File Name:</strong></td>
                <td style="padding: 8px 0; color: #333;">${journal.fileName || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>File Size:</strong></td>
                <td style="padding: 8px 0; color: #333;">${formatFileSize(journal.fileSize)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Submitted:</strong></td>
                <td style="padding: 8px 0; color: #333;">${new Date(journal.submittedAt).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <!-- Download Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewLink}" 
               style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;
                      box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
              📥 Download Journal File
            </a>
          </div>

          <!-- Important Notes -->
          <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px; color: #856404; font-weight: bold;">⚠️ Important Notes:</p>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li>This is a one-time access link - you can download the file directly from the review page</li>
              <li>No login or authentication is required</li>
              <li>The link will expire in 7 days for security</li>
              <li>Please do not forward this email to others</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #999; text-align: center; margin-top: 30px;">
            This is an automated message from the IIJRP Journal Management System.<br>
            If you have any questions, please contact the editorial team.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} International Interdisciplinary Journal of Religion & Philosophy</p>
          <p style="margin: 5px 0 0;">Taraba State University, Jalingo, Nigeria</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Plain text version for email clients that don't support HTML
  sendSmtpEmail.textContent = `
    New Journal Submission for Review: ${journal.title || "Untitled"}
    
    Submission Details:
    - Title: ${journal.title || "N/A"}
    - Category: ${journal.category || "N/A"}
    - Submitted by: ${journal.submittedBy?.fullName || "N/A"}
    - Email: ${journal.submittedBy?.email || "N/A"}
    - Phone: ${journal.submittedBy?.phoneNumber || "N/A"}
    - File: ${journal.fileName || "N/A"} (${formatFileSize(journal.fileSize)})
    - Submitted: ${new Date(journal.submittedAt).toLocaleDateString()}
    
    To review and download this journal, please visit:
    ${reviewLink}
    
    This is a one-time access link that will expire in 7 days.
    
    Thank you for your contribution to the academic community.
    
    Best regards,
    Editorial Team
    IIJRP
  `;

  sendSmtpEmail.sender = {
    name: "IIJRP Editorial Team",
    email: process.env.EMAIL_USER || "noreply@iijrp.org",
  };

  sendSmtpEmail.to = [{ email: reviewerEmail }];

  // Add reply-to if needed
  if (process.env.REPLY_TO_EMAIL) {
    sendSmtpEmail.replyTo = {
      email: process.env.REPLY_TO_EMAIL,
      name: "IIJRP Support",
    };
  }

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(
      `✅ Review invitation sent successfully to ${reviewerEmail}. Message ID:`,
      data.messageId
    );
    return true;
  } catch (error) {
    console.error("❌ Brevo API Error:", error.response?.body || error.message);

    // Fallback to console log for development
    if (process.env.NODE_ENV === "development") {
      console.log("\n=== DEVELOPMENT MODE: Email Preview ===");
      console.log("To:", reviewerEmail);
      console.log("Subject:", sendSmtpEmail.subject);
      console.log("Review Link:", reviewLink);
      console.log("=====================================\n");
      return true;
    }

    return false;
  }
};

/**
 * Send test email to verify configuration
 * @param {string} testEmail - Email address to send test to
 */
exports.sendTestEmail = async (testEmail) => {
  const testJournal = {
    title: "Test Journal Submission",
    category: "Humanities",
    submittedBy: {
      fullName: "John Doe",
      email: "john@example.com",
      phoneNumber: "+1234567890",
    },
    fileName: "test-journal.pdf",
    fileSize: 1024 * 1024 * 2.5, // 2.5 MB
    submittedAt: new Date(),
  };

  const testToken = "test-token-123456";

  return await exports.sendReviewInvitation(testEmail, testJournal, testToken);
};
