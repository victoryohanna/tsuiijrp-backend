// models/Journal.js
const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema(
  {
    // Submitter Information
    submittedBy: {
      fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "Email is required"],
        trim: true,
        lowercase: true,
      },
      phoneNumber: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true,
      },
    },

    // Journal Information
    title: {
      type: String,
      required: [true, "Journal title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Humanities",
        "Social Sciences",
        "Religion",
        "Philosophy",
        "Theology",
        "Ethics",
        "Cultural Studies",
        "History",
        "Other",
      ],
    },
    openAccess: {
      type: Boolean,
      default: true,
    },

    // File Information
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ["pdf", "doc", "docx"],
    },
    fileSize: {
      type: Number,
      required: true,
    },

    // Cloudinary
    cloudinaryPublicId: {
      type: String,
      required: true,
    },

    // Review Information
    reviewerToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    reviewerEmail: {
      type: String,
      default: process.env.REVIEWER_EMAIL,
    },
    reviewerAccessedAt: {
      type: Date,
      default: null,
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique token for reviewer access
journalSchema.methods.generateReviewerToken = function () {
  const crypto = require("crypto");
  this.reviewerToken = crypto.randomBytes(32).toString("hex");
  return this.reviewerToken;
};

const Journal = mongoose.model("Journal", journalSchema);

module.exports = Journal;
