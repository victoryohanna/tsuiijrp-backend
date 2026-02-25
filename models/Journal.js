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
      address: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
      },
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

// Index for better query performance
journalSchema.index({ "submittedBy.email": 1 });
journalSchema.index({ status: 1 });
journalSchema.index({ submittedAt: -1 });

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

const Journal = mongoose.model("Journal", journalSchema);

module.exports = Journal;

// const mongoose = require("mongoose");

// const JournalSchema = new mongoose.Schema({

//   title: {
//     type: String,
//     required: [true, "Please provide a title"],
//     trim: true,
//     maxlength: [200, "Title cannot be more than 200 characters"],
//   },
//   authors: {
//     type: [String],
//     required: [true, "Please provide at least one author"],
//     validate: {
//       validator: function (authors) {
//         return authors.length > 0;
//       },
//       message: "Please provide at least one author",
//     },
//   },
//   abstract: {
//     type: String,
//     required: [true, "Please provide an abstract"],
//     trim: true,
//     minlength: [50, "Abstract must be at least 50 characters"],
//   },
//   keywords: {
//     type: [String],
//     required: [true, "Please provide at least one keyword"],
//     validate: {
//       validator: function (keywords) {
//         return keywords.length > 0;
//       },
//       message: "Please provide at least one keyword",
//     },
//   },
//   journalName: {
//     type: String,
//     trim: true,
//   },
//   impactFactor: { type: String },
//   description: { type: String },
//   publisher: {
//     type: String,
//     trim: true,
//   },
//   category: {
//     type: String,
//     trim: true,
//   },
//   issn: {
//     type: String,
//     trim: true,
//   },
//   publicationDate: {
//     type: Date,
//     default: Date.now,
//   },
//   fileUrl: {
//     type: String,
//     required: [true, "File URL is required"],
//   },
//   previewUrl:{
//     type:String
//   },

//   cloudinaryPublicId:{
//     type:String
//   },

//   fileType: {
//     type: String,
//     enum: ["pdf", "doc", "docx"],
//     required: true,
//   },
//   status: {
//     type: String,
//     enum: ["pending", "approved", "rejected"],
//     default: "pending",
//   },
//   openAccess: {
//     type: Boolean,
//     default: true,
//   },
//   references: {
//     type: [String],
//   },
//   citations: {
//     type: String,
//   },
//   submittedAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Update the updatedAt field before saving
// JournalSchema.pre("save", function (next) {
//   this.updatedAt = Date.now();
//   next();
// });

// module.exports = mongoose.model("journal", JournalSchema);
