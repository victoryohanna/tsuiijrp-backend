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
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      },
      phoneNumber: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true,
      },
      // Address field removed as requested
    },

    // Journal Information (New Fields)
    title: {
      type: String,
      required: [true, "Journal title is required"],
      trim: true,
      index: true,
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
      default: "Other",
      index: true,
    },
    openAccess: {
      type: Boolean,
      default: true, // Always true by default
      required: true,
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
    previewUrl: {
      type: String,
      default: null,
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // Review Information
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewComments: {
      type: String,
      default: null,
    },

    // Metadata
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    submissionSource: {
      type: String,
      default: "public_form",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
journalSchema.index({ "submittedBy.email": 1 });
journalSchema.index({ status: 1 });
journalSchema.index({ submittedAt: -1 });
journalSchema.index({ title: "text", category: 1 }); // Text index for searching
journalSchema.index({ category: 1, status: 1 }); // Compound index for filtering

// Virtual for formatted submission date
journalSchema.virtual("formattedSubmittedAt").get(function () {
  return this.submittedAt ? this.submittedAt.toLocaleDateString() : null;
});

// Virtual for file size in readable format
journalSchema.virtual("readableFileSize").get(function () {
  if (!this.fileSize) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = this.fileSize;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
});

// Virtual for formatted title with category
journalSchema.virtual("displayTitle").get(function () {
  return `${this.title} (${this.category})`;
});

// Virtual for submitter full info
journalSchema.virtual("submitterInfo").get(function () {
  return {
    name: this.submittedBy.fullName,
    email: this.submittedBy.email,
    phone: this.submittedBy.phoneNumber,
  };
});

// Pre-save middleware to ensure openAccess is always true
journalSchema.pre("save", function (next) {
  this.openAccess = true;
  next();
});

// Pre-update middleware to ensure openAccess remains true
journalSchema.pre("findOneAndUpdate", function () {
  this.set({ openAccess: true });
});

const Journal = mongoose.model("Journal", journalSchema);

module.exports = Journal;
