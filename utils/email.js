// utils/email.js
const nodemailer = require("nodemailer");
const path = require("path");
const { generateToken } = require("./auth");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.OAUTH_CLIENTID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
});

exports.sendReviewInvitation = async (email, journalId) => {
  // Generate a token that expires in 7 days
  const token = generateToken(journalId, "reviewer");
  const reviewLink = `${process.env.BASE_URL}/review/${journalId}?token=${token}`;

  const mailOptions = {
    from: process.env.USER_EMAIL,
    to: [
      process.env.FIRST_REVIEWER,
      process.env.SECOND_REVIEWER,
      process.env.THIRD_REVIEWER,
    ],
    subject: "New Journal Submission for Review",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Journal Submission for Review</h2>
        <p>A new journal has been submitted and requires your review.</p>
        <p>Please click the link below to review the submission:</p>
        <a href="${reviewLink}" 
           style="display: inline-block; padding: 10px 20px; background-color: #3498db; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">
          Review Journal
        </a>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777;">
          This link will expire in 7 days. For security reasons, please do not share this link.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    //console.log(`Review invitation sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

