//controllers/journalController.js
const express = require("express");
//const Journal = require("../models/Journal");
const Journal = require("../models/JournalModel")
const fs = require("fs");
const path = require("path");
const router = express.Router();
const upload = require("../config/multer");
const cloudinary = require("../config/cloudinary");
const { sendReviewInvitation } = require("../utils/sendEmail");
const { protect } = require("../utils/auth");
const stream = require("stream");
const crypto = require("crypto"); // Add crypto for token generation
require("dotenv").config();

// @desc    Submit a new journal
// @route   POST /submit
// @access  Public

router.post(
  "/submit",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      // Get form data
      const {
        fullName,
        email,
        phoneNumber,
        journalTitle,
        category,
      } = req.body;

      // Validate required fields
      if (!fullName || !email || !phoneNumber || !journalTitle || !category) {
        return res.status(400).json({
          success: false,
          error: "Please provide all required fields",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Please provide a valid email address",
        });
      }

      // Validate file type
      const fileExt = path
        .extname(req.file.originalname)
        .toLowerCase()
        .substring(1);
      const allowedTypes = ["pdf", "doc", "docx"];

      if (!allowedTypes.includes(fileExt)) {
        return res.status(400).json({
          success: false,
          error: "Invalid file type. Only PDF and Word documents are allowed",
        });
      }

      // Upload file to Cloudinary
      let cloudinaryResult;
      try {
        cloudinaryResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "raw",
              folder: "journal_submissions",
              type: "private",
              context: {
                submitter: fullName,
                email: email,
                title: journalTitle,
              },
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          const bufferStream = new stream.PassThrough();
          bufferStream.end(req.file.buffer);
          bufferStream.pipe(uploadStream);
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          success: false,
          error: "Failed to upload file to cloud storage",
        });
      }

      // Generate unique token for reviewer access
      const reviewToken = crypto.randomBytes(32).toString('hex');

      // Create journal entry with new fields
      const journal = await Journal.create({
        // Submitter information
        submittedBy: {
          fullName,
          email,
          phoneNumber,
        },
        
        // Journal information
        title: journalTitle,
        category,
        openAccess: true, // Always true
        
        // File information
        fileUrl: cloudinaryResult.secure_url,
        fileType: fileExt,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        
        // Cloudinary information
        cloudinaryPublicId: cloudinaryResult.public_id,
        
        // Review information
        reviewerToken: reviewToken,
        
        // Status
        status: "pending",
        
        // Timestamps
        submittedAt: new Date(),
        submissionSource: "public_form",
      });

      // Collect all reviewer emails from environment variables
      const reviewerEmails = [
        //process.env.FIRST_REVIEWER,
        //process.env.SECOND_REVIEWER,
        process.env.THIRD_REVIEWER,
        //process.env.FOURTH_REVIEWER,
        //process.env.FIFTH_REVIEWER,
        process.env.SIXTH_REVIEWER,
      ].filter(email => email && email.trim() !== ''); // Remove empty or undefined emails

      // Send notification emails to ALL reviewers
      if (reviewerEmails.length > 0) {
        console.log(`📧 Sending review invitations to ${reviewerEmails.length} reviewers`);
        
        // Send email to each reviewer individually
        const emailPromises = reviewerEmails.map(async (reviewerEmail) => {
          try {
            await sendReviewInvitation(
              reviewerEmail,
              journal,
              reviewToken
            );
            console.log(`✅ Invitation sent to ${reviewerEmail}`);
            return { success: true, email: reviewerEmail };
          } catch (error) {
            console.error(`❌ Failed to send to ${reviewerEmail}:`, error.message);
            return { success: false, email: reviewerEmail, error: error.message };
          }
        });

        // Wait for all emails to be sent (don't await if you want faster response)
        const results = await Promise.allSettled(emailPromises);
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
        
        console.log(`📊 Email summary: ${successful} sent, ${failed} failed`);
      } else {
        console.warn("⚠️ No reviewer emails found in environment variables");
      }

      // Return success response
      res.status(201).json({
        success: true,
        data: {
          _id: journal._id,
          fullName: journal.submittedBy.fullName,
          email: journal.submittedBy.email,
          title: journal.title,
          category: journal.category,
          fileName: journal.fileName,
          submittedAt: journal.submittedAt,
          status: journal.status,
        },
        message: `Journal submitted successfully. ${reviewerEmails.length} reviewer(s) have been notified.`,
      });

    } catch (error) {
      console.error("Error submitting journal:", error);
      
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((val) => val.message);
        return res.status(400).json({
          success: false,
          error: messages.join(", "),
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Server Error. Please try again later.",
      });
    }
  }
);

// router.post("/submit", upload.single("file"), async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         error: "No file uploaded",
//       });
//     }

//     // Get form data
//     const { fullName, email, phoneNumber, journalTitle, category } = req.body;

//     // Validate required fields
//     if (!fullName || !email || !phoneNumber || !journalTitle || !category) {
//       return res.status(400).json({
//         success: false,
//         error: "Please provide all required fields",
//       });
//     }

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         error: "Please provide a valid email address",
//       });
//     }

//     // Validate file type
//     const fileExt = path
//       .extname(req.file.originalname)
//       .toLowerCase()
//       .substring(1);
//     const allowedTypes = ["pdf", "doc", "docx"];

//     if (!allowedTypes.includes(fileExt)) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid file type. Only PDF and Word documents are allowed",
//       });
//     }

//     // Upload file to Cloudinary
//     let cloudinaryResult;
//     try {
//       cloudinaryResult = await new Promise((resolve, reject) => {
//         const uploadStream = cloudinary.uploader.upload_stream(
//           {
//             resource_type: "raw",
//             folder: "journal_submissions",
//             type: "private",
//             context: {
//               submitter: fullName,
//               email: email,
//               title: journalTitle,
//             },
//           },
//           (error, result) => {
//             if (error) reject(error);
//             else resolve(result);
//           }
//         );

//         const bufferStream = new stream.PassThrough();
//         bufferStream.end(req.file.buffer);
//         bufferStream.pipe(uploadStream);
//       });
//     } catch (uploadError) {
//       console.error("Cloudinary upload error:", uploadError);
//       return res.status(500).json({
//         success: false,
//         error: "Failed to upload file to cloud storage",
//       });
//     }

//     // Generate unique token for reviewer access
//     const reviewToken = crypto.randomBytes(32).toString("hex");

//     // Create journal entry with new fields
//     const journal = await Journal.create({
//       // Submitter information
//       submittedBy: {
//         fullName,
//         email,
//         phoneNumber,
//       },

//       // Journal information
//       title: journalTitle,
//       category,
//       openAccess: true, // Always true

//       // File information
//       fileUrl: cloudinaryResult.secure_url,
//       fileType: fileExt,
//       fileName: req.file.originalname,
//       fileSize: req.file.size,

//       // Cloudinary information
//       cloudinaryPublicId: cloudinaryResult.public_id,

//       // Review information
//       reviewerToken: reviewToken,
//       reviewerEmail: process.env.SIXTH_REVIEWER, // Default reviewer

//       // Status
//       status: "pending",

//       // Timestamps
//       submittedAt: new Date(),
//       submissionSource: "public_form",
//     });

//     // Send notification email to reviewers with the token
//     try {
//       await sendReviewInvitation(
//         process.env.SIXTH_REVIEWER, // Send to first reviewer by default
//         journal,
//         reviewToken
//       );
//     } catch (emailError) {
//       console.error("Failed to send review invitation email:", emailError);
//     }

//     // Return success response
//     res.status(201).json({
//       success: true,
//       data: {
//         _id: journal._id,
//         fullName: journal.submittedBy.fullName,
//         email: journal.submittedBy.email,
//         title: journal.title,
//         category: journal.category,
//         fileName: journal.fileName,
//         submittedAt: journal.submittedAt,
//         status: journal.status,
//       },
//       message: "Journal submitted successfully. A reviewer has been notified.",
//     });
//   } catch (error) {
//     console.error("Error submitting journal:", error);

//     if (error.name === "ValidationError") {
//       const messages = Object.values(error.errors).map((val) => val.message);
//       return res.status(400).json({
//         success: false,
//         error: messages.join(", "),
//       });
//     }

//     res.status(500).json({
//       success: false,
//       error: "Server Error. Please try again later.",
//     });
//   }
// });

// @desc    Get journal for review via token (no authentication required)
// @route   GET /review/:token
// @access  Public (token-based access)
router.get("/review/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Find journal by token
    const journal = await Journal.findOne({ reviewerToken: token });

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: "Invalid or expired review link",
      });
    }

    // Update access time
    journal.reviewerAccessedAt = new Date();
    await journal.save();

    // Generate signed URL for file download
    let downloadUrl = journal.fileUrl;
    if (journal.cloudinaryPublicId) {
      // Generate signed URL that expires in 24 hours
      downloadUrl = cloudinary.url(journal.cloudinaryPublicId, {
        resource_type: "raw",
        type: "private",
        sign_url: true,
        expires_at: Math.round(new Date().getTime() / 1000 + 86400), // 24 hours
      });
    }

    // Return journal data with download URL
    res.status(200).json({
      success: true,
      data: {
        _id: journal._id,
        submittedBy: journal.submittedBy,
        title: journal.title,
        category: journal.category,
        fileName: journal.fileName,
        fileType: journal.fileType,
        fileSize: journal.fileSize,
        downloadUrl,
        submittedAt: journal.submittedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching journal for review:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});




// @desc    Get all journals
// @route   GET /journals
// @access  Public (Filter by approved) / Private (Admins see all)

router.get("/journals", async (req, res) => {
  try {
    //  Define the query filter
    // If it's a public request, we ONLY show "approved"
    // let query = { status: "approved" };

    let query = {}; // show all journals

    //  Optional: If you want logged-in Admins/Reviewers to see everything
    // You would check the token here. For the simple public list:

    const journals = await Journal.find(query).sort({ submittedAt: -1 });

    const enhancedJournals = journals.map((journal) => {
      const journalObj = journal.toObject();
      if (journalObj.fileType === "pdf" && journalObj.cloudinaryPublicId) {
        journalObj.previewUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
          format: "jpg",
          page: 1,
          width: 300,
          height: 400,
          crop: "fill",
          quality: "auto",
        });
      }
      return journalObj;
    });

    return res.status(200).json({
      success: true,
      count: enhancedJournals.length,
      data: enhancedJournals,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

// router.get("/journals", async (req, res) => {
//   try {
//     // Show only approved journals for public view
//     let query = { status: "approved" };

//     const journals = await Journal.find(query).sort({ submittedAt: -1 });

//     const enhancedJournals = journals.map((journal) => {
//       const journalObj = journal.toObject();
//       if (journalObj.fileType === "pdf" && journalObj.cloudinaryPublicId) {
//         journalObj.previewUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
//           format: "jpg",
//           page: 1,
//           width: 300,
//           height: 400,
//           crop: "fill",
//           quality: "auto",
//         });
//       }
//       return journalObj;
//     });

//     return res.status(200).json({
//       success: true,
//       count: enhancedJournals.length,
//       data: enhancedJournals,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       error: "Server Error",
//     });
//   }
// });

// @desc    Get all journals for Dashboard (Admin/Reviewer only)
// @route   GET /journals/admin/all
// @access  Private
router.get("/admin/all", protect(["admin", "reviewer"]), async (req, res) => {
  try {
    // Admin/Reviewers see everything (pending, approved, rejected)
    const journals = await Journal.find().sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: journals.length,
      data: journals,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// @desc    Get single journal by ID
// @route   GET /journals/:id
// @access  Public (only if approved)
router.get("/journals/:id", async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);

    if (!journal) {
      return res
        .status(404)
        .json({ success: false, error: "Journal not found" });
    }

    // Only show approved journals to public
    if (journal.status !== "approved") {
      return res.status(403).json({
        success: false,
        error: "This journal is currently under review.",
      });
    }

    const journalObj = journal.toObject();

    // Signed URL generation for private Cloudinary files
    if (journalObj.cloudinaryPublicId) {
      journalObj.fileUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
        resource_type: "raw",
        type: "private",
        sign_url: true,
        expires_at: Math.round(new Date().getTime() / 1000 + 3600),
      });
    }

    return res.status(200).json({ success: true, data: journalObj });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// @desc    Update journal status (approve/reject)
// @route   PUT /journals/:id/status
// @access  Private (Reviewer or Admin only)
router.put("/:id/status", protect(["reviewer", "admin"]), async (req, res) => {
  try {
    const { status, reviewComments } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status value",
      });
    }

    const journal = await Journal.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedBy: req.user.id,
        reviewedAt: Date.now(),
        reviewComments,
      },
      { new: true, runValidators: true }
    );

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: "Journal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: journal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

// @desc    Get journal statistics
// @route   GET /journals/stats
// @access  Private
router.get("/stats", protect(), async (req, res) => {
  try {
    const stats = await Journal.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

// @desc    Health check endpoint (for warming up the server)
// @route   GET /health
// @access  Public
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is awake",
    timestamp: new Date().toISOString(),
  });
});

// @desc    Delete a journal
// @route   DELETE /journals/:id
// @access  Private (Admin only)
router.delete("/:id", protect(["admin"]), async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: "Journal not found",
      });
    }

    // Delete file from Cloudinary if it exists
    if (journal.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(journal.cloudinaryPublicId, {
          resource_type: "raw",
        });
      } catch (cloudinaryError) {
        console.error("Error deleting file from Cloudinary:", cloudinaryError);
        // Continue with deletion even if Cloudinary deletion fails
      }
    }

    await Journal.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Journal deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

module.exports = router;



// //controllers/journalController.js
// const express = require("express");
// const Journal = require("../models/Journal");
// const fs = require("fs");
// const path = require("path");
// const router = express.Router();
// const upload = require("../config/multer");
// const cloudinary = require('../config/cloudinary');
// const { sendReviewInvitation } = require("../utils/email");
// const { protect } = require("../utils/auth");
// // const cloudinary = require("cloudinary").v2;
// const stream = require("stream");
// require("dotenv").config();

// // @desc    Submit a new journal
// // @route   POST /submit
// // @access  Public
// router.post(
//   "/submit",
//   upload.single("file"),
//   async (req, res, next) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           error: "No file uploaded",
//         });
//       }

//       // Get form data
//       const {
//         fullName,
//         email,
//         phoneNumber,
//         journalTitle,
//         category,
//         openAccess,
//       } = req.body;

//       // Validate required fields
//       if (!fullName || !email || !phoneNumber || !journalTitle || !category) {
//         return res.status(400).json({
//           success: false,
//           error: "Please provide all required fields",
//         });
//       }

//       // Validate email format
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(email)) {
//         return res.status(400).json({
//           success: false,
//           error: "Please provide a valid email address",
//         });
//       }

//       // Validate file type
//       const fileExt = path
//         .extname(req.file.originalname)
//         .toLowerCase()
//         .substring(1);
//       const allowedTypes = ["pdf", "doc", "docx"];

//       if (!allowedTypes.includes(fileExt)) {
//         return res.status(400).json({
//           success: false,
//           error: "Invalid file type. Only PDF and Word documents are allowed",
//         });
//       }

//       // Upload file to Cloudinary
//       let cloudinaryResult;
//       try {
//         cloudinaryResult = await new Promise((resolve, reject) => {
//           const uploadStream = cloudinary.uploader.upload_stream(
//             {
//               resource_type: "raw",
//               folder: "journal_submissions",
//               type: "private",
//               context: {
//                 submitter: fullName,
//                 email: email,
//                 title: journalTitle,
//               },
//             },
//             (error, result) => {
//               if (error) reject(error);
//               else resolve(result);
//             }
//           );

//           const bufferStream = new stream.PassThrough();
//           bufferStream.end(req.file.buffer);
//           bufferStream.pipe(uploadStream);
//         });
//       } catch (uploadError) {
//         console.error("Cloudinary upload error:", uploadError);
//         return res.status(500).json({
//           success: false,
//           error: "Failed to upload file to cloud storage",
//         });
//       }

//       // Create journal entry with new fields
//       const journal = await Journal.create({
//         // Submitter information
//         submittedBy: {
//           fullName,
//           email,
//           phoneNumber,
//         },

//         // Journal information
//         title: journalTitle,
//         category,
//         openAccess: true, // Always true

//         // File information
//         fileUrl: cloudinaryResult.secure_url,
//         fileType: fileExt,
//         fileName: req.file.originalname,
//         fileSize: req.file.size,

//         // Cloudinary information
//         cloudinaryPublicId: cloudinaryResult.public_id,

//         // Status
//         status: "pending",

//         // Timestamps
//         submittedAt: new Date(),
//         submissionSource: "public_form",
//       });

//       // Send notification email to reviewers
//       try {
//         await sendReviewInvitation(
//           process.env.REVIEWER_EMAIL,
//           journal._id,
//           {
//             fullName,
//             email,
//             title: journalTitle,
//             fileName: req.file.originalname
//           }
//         );
//       } catch (emailError) {
//         console.error("Failed to send review invitation email:", emailError);
//       }

//       // Return success response
//       res.status(201).json({
//         success: true,
//         data: {
//           _id: journal._id,
//           fullName: journal.submittedBy.fullName,
//           email: journal.submittedBy.email,
//           title: journal.title,
//           category: journal.category,
//           fileName: journal.fileName,
//           submittedAt: journal.submittedAt,
//           status: journal.status,
//         },
//         message: "Journal submitted successfully. It will be reviewed shortly.",
//       });

//     } catch (error) {
//       console.error("Error submitting journal:", error);

//       if (error.name === "ValidationError") {
//         const messages = Object.values(error.errors).map((val) => val.message);
//         return res.status(400).json({
//           success: false,
//           error: messages.join(", "),
//         });
//       }

//       res.status(500).json({
//         success: false,
//         error: "Server Error. Please try again later.",
//       });
//     }
//   }
// );

// // @desc    Get all journals
// // @route   GET /journals
// // @access  Public (Filter by approved) / Private (Admins see all)
// router.get("/journals", async (req, res) => {
//   try {
//     //  Define the query filter
//     // If it's a public request, we ONLY show "approved"
//     // let query = { status: "approved" };

//     let query = { }; // show all journals

//     //  Optional: If you want logged-in Admins/Reviewers to see everything
//     // You would check the token here. For the simple public list:

//     const journals = await Journal.find(query).sort({ submittedAt: -1 });

//     const enhancedJournals = journals.map(journal => {
//       const journalObj = journal.toObject();
//       if (journalObj.fileType === 'pdf' && journalObj.cloudinaryPublicId) {
//         journalObj.previewUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
//           format: 'jpg',
//           page: 1,
//           width: 300,
//           height: 400,
//           crop: 'fill',
//           quality: 'auto',
//         });
//       }
//       return journalObj;
//     });

//     return res.status(200).json({
//       success: true,
//       count: enhancedJournals.length,
//       data: enhancedJournals,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       error: "Server Error",
//     });
//   }
// });

// // @desc    Get all journals for Dashboard (Admin/Reviewer only)
// // @route   GET /journals/admin/all
// // @access  Private
// router.get("/admin/all", protect(["admin", "reviewer"]), async (req, res) => {
//   try {
//     // Admin/Reviewers see everything (pending, approved, rejected)
//     const journals = await Journal.find().sort({ submittedAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: journals.length,
//       data: journals,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: "Server Error" });
//   }
// });

// router.get("/journals/:id", async (req, res) => {
//   try {
//     const journal = await Journal.findById(req.params.id);

//     if (!journal) {
//       return res
//         .status(404)
//         .json({ success: false, error: "Journal not found" });
//     }

//     // --- SECURITY CHECK ---
//     // If the journal is NOT approved, check if the user is an Admin or Reviewer
//     if (journal.status !== "approved") {
//       const token = req.header("x-auth-token");
//       if (!token) {
//         return res.status(403).json({
//           success: false,
//           error: "Access denied. This journal is currently under review.",
//         });
//       }

//       try {
//         const { verifyToken } = require("../utils/auth");
//         const decoded = verifyToken(token);
//         if (!["admin", "reviewer"].includes(decoded.role)) {
//           throw new Error();
//         }
//       } catch (err) {
//         return res
//           .status(403)
//           .json({ success: false, error: "Unauthorized access" });
//       }
//     }
//     // -----------------------

//     const journalObj = journal.toObject();

//     // Signed URL generation for private Cloudinary files
//     if (journalObj.cloudinaryPublicId) {
//       journalObj.fileUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
//         resource_type: "raw",
//         type: "private",
//         sign_url: true,
//         expires_at: Math.round(new Date().getTime() / 1000 + 3600),
//       });
//     }

//     return res.status(200).json({ success: true, data: journalObj });
//   } catch (error) {
//     res.status(500).json({ success: false, error: "Server Error" });
//   }
// });

// // @desc    Get journal for review
// // @route   GET /journals/review/:id
// // @access  Private (Reviewer or Admin only)
// router.get("/review/:id", protect(["reviewer", "admin"]), async (req, res) => {
//   try {
//     const journal = await Journal.findById(req.params.id);

//     if (!journal) {
//       return res.status(404).json({
//         success: false,
//         error: "Journal not found",
//       });
//     }

//     const journalObj = journal.toObject();

//     // Add enhanced URLs for review
//     if (journalObj.cloudinaryPublicId) {
//       if (journalObj.fileType === 'pdf') {
//         journalObj.previewUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
//           format: 'jpg',
//           page: 1,
//           width: 800,
//           height: 1000,
//           crop: 'fill',
//           quality: 'auto',
//         });
//       }

//       // Force download URL
//       journalObj.downloadUrl = journalObj.fileUrl.replace('/upload/', '/upload/fl_attachment/');
//     }

//     res.status(200).json({
//       success: true,
//       data: journalObj,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: "Server Error",
//     });
//   }
// });

// // @desc    Update journal status (approve/reject)
// // @route   PUT /journals/:id/status
// // @access  Private (Reviewer or Admin only)
// router.put("/:id/status", protect(["reviewer", "admin"]), async (req, res) => {
//   try {
//     const { status, reviewComments } = req.body;

//     if (!["approved", "rejected", "pending"].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid status value",
//       });
//     }

//     const journal = await Journal.findByIdAndUpdate(
//       req.params.id,
//       {
//         status,
//         reviewedBy: req.user.id,
//         reviewedAt: Date.now(),
//         reviewComments,
//       },
//       { new: true, runValidators: true }
//     );

//     if (!journal) {
//       return res.status(404).json({
//         success: false,
//         error: "Journal not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: journal,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: "Server Error",
//     });
//   }
// });

// // @desc    Get journal statistics
// // @route   GET /journals/stats
// // @access  Private
// router.get("/stats", protect(), async (req, res) => {
//   try {
//     const stats = await Journal.aggregate([
//       {
//         $group: {
//           _id: null,
//           total: { $sum: 1 },
//           pending: {
//             $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
//           },
//           approved: {
//             $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
//           },
//           rejected: {
//             $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
//           }
//         }
//       }
//     ]);

//     res.status(200).json({
//       success: true,
//       data: stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: "Server Error"
//     });
//   }
// });

// // @desc    Assign a reviewer to a journal
// // @route   PUT /api/journals/:id/assign
// // @access  Private/Admin
// router.put("/:id/assign", protect, async (req, res) => {
//   try {
//     const { reviewerId } = req.body;

//     const journal = await Journal.findByIdAndUpdate(
//       req.params.id,
//       {
//         assignedReviewer: reviewerId,
//         status: "pending" // Ensure it stays pending when assigned
//       },
//       { new: true }
//     );

//     if (!journal) {
//       return res.status(404).json({ success: false, error: "Journal not found" });
//     }

//     res.json({ success: true, data: journal });
//   } catch (err) {
//     res.status(500).json({ success: false, error: "Server Error" });
//   }
// });

// // @desc    Health check endpoint (for warming up the server)
// // @route   GET /health
// // @access  Public
// router.get("/health", (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "Server is awake",
//     timestamp: new Date().toISOString()
//   });
// });

// // @desc    Delete a journal
// // @route   DELETE /journals/:id
// // @access  Private (Admin only)
// router.delete("/:id", protect(["admin"]), async (req, res) => {
//   try {
//     const journal = await Journal.findById(req.params.id);

//     if (!journal) {
//       return res.status(404).json({
//         success: false,
//         error: "Journal not found"
//       });
//     }

//     // Delete file from Cloudinary if it exists
//     if (journal.cloudinaryPublicId) {
//       try {
//         await cloudinary.uploader.destroy(journal.cloudinaryPublicId, {
//           resource_type: 'raw'
//         });
//       } catch (cloudinaryError) {
//         console.error('Error deleting file from Cloudinary:', cloudinaryError);
//         // Continue with deletion even if Cloudinary deletion fails
//       }
//     }

//     await Journal.findByIdAndDelete(req.params.id);

//     res.status(200).json({
//       success: true,
//       message: "Journal deleted successfully"
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: "Server Error"
//     });
//   }
// });

// module.exports = router;
