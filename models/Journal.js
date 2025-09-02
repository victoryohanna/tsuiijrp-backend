const mongoose = require("mongoose");

const JournalSchema = new mongoose.Schema({
  
  title: {
    type: String,
    required: [true, "Please provide a title"],
    trim: true,
    maxlength: [200, "Title cannot be more than 200 characters"],
  },
  authors: {
    type: [String],
    required: [true, "Please provide at least one author"],
    validate: {
      validator: function (authors) {
        return authors.length > 0;
      },
      message: "Please provide at least one author",
    },
  },
  abstract: {
    type: String,
    required: [true, "Please provide an abstract"],
    trim: true,
    minlength: [50, "Abstract must be at least 50 characters"],
  },
  keywords: {
    type: [String],
    required: [true, "Please provide at least one keyword"],
    validate: {
      validator: function (keywords) {
        return keywords.length > 0;
      },
      message: "Please provide at least one keyword",
    },
  },
  journalName: {
    type: String,
    trim: true,
  },
  impactFactor: { type: String },
  description: { type: String },
  publisher: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  issn: {
    type: String,
    trim: true,
  },
  publicationDate: {
    type: Date,
    default: Date.now,
  },
  fileUrl: {
    type: String,
    required: [true, "File URL is required"],
  },
  fileType: {
    type: String,
    enum: ["pdf", "doc", "docx"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  openAccess: {
    type: Boolean,
    default: true,
  },
  references: {
    type: [String],
  },
  citations: {
    type: String,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
JournalSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("journal", JournalSchema);
