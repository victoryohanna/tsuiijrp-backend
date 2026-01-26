const nodemailer = require("nodemailer");
const path = require("path");
const { generateToken } = require("./auth");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// --- DEBUGGING: SANITY CHECK ---
console.log("Checking Environment Variables...");
console.log("- EMAIL_USER exists:", !!process.env.EMAIL_USER);
console.log("- APP_PASSWORD exists:", !!process.env.PASS);
console.log("- REVIEWER_1 exists:", !!process.env.FIRST_REVIEWER);
// -------------------------------



// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     type: "OAuth2",
//     user: process.env.EMAIL_USER,
//     clientId: process.env.OAUTH_CLIENTID,
//     clientSecret: process.env.OAUTH_CLIENT_SECRET,
//     refreshToken: process.env.OAUTH_REFRESH_TOKEN,
//   },
// });


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.PASS,
  },
  // Add these specific socket settings for Cloud environments
  tls: {
    rejectUnauthorized: false, // Helps if there are self-signed cert issues in the hop
    servername: "smtp.gmail.com",
  },
  debug: true, // Show detailed logs in your console
  logger: true, // Log information to console
  connectionTimeout: 30000, // Wait 30 seconds
});


exports.sendReviewInvitation = async (email, journalId) => {
  // Verify connection configuration before sending
  await transporter.verify();
  console.log("Transporter is ready to take our messages");

  const token = generateToken(journalId, "reviewer");

  // Use the landing page with both journalId and token as query parameters
  //const reviewLink = `${process.env.BASE_URL}/email-redirect.html?journalId=${journalId}&token=${token}`;
  const reviewLink = `${process.env.BASE_URL}/#/review/${journalId}?token=${token}`;

  // Collect all potential reviewers from .env
  const reviewers = [
    process.env.FIRST_REVIEWER,
    process.env.SECOND_REVIEWER,
    process.env.THIRD_REVIEWER,
    process.env.FOURTH_REVIEWER,
    process.env.FIFTH_REVIEWER,
    process.env.SIXTH_REVIEWER,
  ].filter((email) => email && email.trim() !== "");

  if (reviewers.length === 0) {
    console.error("No reviewer emails found in environment variables.");
    return false;
  }

  const mailOptions = {
    from: process.env.USER_EMAIL,
    to: reviewers.join(", "),

    subject:
      "New Journal Submission for Review - International Interdisciplinary Journal of Religion & Philosophy",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">IIJRP Journal Management System</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="color: #2c3e50;">New Journal Submission for Review</h2>
          <p>Dear Reviewer,</p>
          <p>A new journal has been submitted to the International Interdisciplinary Journal of Religion & Philosophy and requires your expert review.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
            <p style="margin: 0;"><strong>Journal ID:</strong> ${journalId}</p>
            <p style="margin: 0;"><strong>Action Required:</strong> Please review the submission</p>
          </div>
          
          <p>Click the button below to access the review platform:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewLink}" 
               style="display: inline-block; padding: 12px 24px; background-color: #3498db; 
                      color: white; text-decoration: none; border-radius: 5px; font-weight: bold;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              ➡️ Review Journal Now
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            <strong>Important:</strong> This review link is unique to you and will expire in 7 days.
            For security reasons, please do not share this link with anyone.
          </p>
          
          <p>If you encounter any issues with the link, please contact the journal administrator.</p>
          
          <p>Thank you for your contribution to the academic community.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>Editorial Team</strong><br>
            International Interdisciplinary Journal of Religion & Philosophy<br>
            Faculty of Religion and Philosophy, Taraba State University, Jalingo
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">
            This is an automated message. Please do not reply to this email.<br>
            © ${new Date().getFullYear()} IIJRP Journal Management System
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Review invitation successfully sent to: ${reviewers.join(", ")}`
    );
    return true;
  } catch (error) {
    console.error("Nodemailer Error:", error.message);
    return false;
  }

  // try {
  //   console.log("Attempting to send email to:", mailOptions.to);
  //   const result = await transporter.sendMail(mailOptions);
  //   console.log(`Review invitation sent for journal ${journalId}`);
  //   return true;
  // } catch (error) {
  //   console.error("Error sending email:", error);
  //   return false;
  // }
};;;

