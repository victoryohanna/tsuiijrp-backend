
// // routes/journals.js
// const express = require("express");
// const Journal = require("../models/Journal");
// const fs = require("fs");
// const path = require("path");
// const router = express.Router();
// const upload = require("../config/multer");
// const { sendReviewInvitation } = require("../utils/email");
// const { protect } = require("../utils/auth");
// const cloudinary = require("cloudinary").v2;
// const stream = require("stream");
// require("dotenv").config();

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // @desc    Submit a new journal
// // @route   POST /journals
// // @access  Public (or Private if you want only logged in users to submit)
// router.post("/submit", upload.single("file"), async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         error: "No file uploaded",
//       });
//     }

//     const {
//       title,
//       authors,
//       abstract,
//       keywords,
//       journalName,
//       impactFactor,
//       description,
//       publisher,
//       category,
//       issn,
//       publicationDate,
//       openAccess,
//       references,
//       citations,
//     } = req.body;

//     // Determine file type
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
//             folder: "journals",
//             format: fileExt,
//             use_filename: true,
//             unique_filename: false,
//             overwrite: false,
//             type: "upload", // Ensure it's a public upload
//             access_mode: "public", // Explicitly make it public
//           },
//           (error, result) => {
//             if (error) reject(error);
//             else resolve(result);
//           }
//         );

//         // Create a buffer stream for Cloudinary
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

//     // Generate preview URL for PDF files (first page as image)
//     let previewUrl = null;
//     if (fileExt === 'pdf') {
//       previewUrl = cloudinary.url(cloudinaryResult.public_id, {
//         format: 'jpg',
//         page: 1, // First page as preview
//         width: 300,
//         height: 400,
//         crop: 'fill',
//         quality: 'auto',
//       });
//     }

//     const journal = await Journal.create({
//       title,
//       authors: authors.split(",").map((author) => author.trim()),
//       abstract,
//       keywords: keywords.split(",").map((keyword) => keyword.trim()),
//       journalName,
//       impactFactor,
//       description,
//       publisher,
//       category,
//       issn,
//       publicationDate: publicationDate || Date.now(),
//       fileUrl: cloudinaryResult.secure_url, // Direct file URL
//       previewUrl: previewUrl, // Preview image for PDFs
//       fileType: fileExt,
//       status: "pending",
//       openAccess: openAccess === 'true' || openAccess === true,
//       references: references ? references.split(",").map(ref => ref.trim()) : [],
//       citations: citations ? parseInt(citations) : 0,
//       submittedBy: req.user?.id || null,
//       cloudinaryPublicId: cloudinaryResult.public_id, // Store for future management
//       cloudinaryVersion: cloudinaryResult.version, // Store version for cache busting
//     });

//     // Send email to reviewer
//     await sendReviewInvitation(process.env.REVIEWER_EMAIL, journal._id);

//     res.status(201).json({
//       success: true,
//       data: {
//         ...journal.toObject(),
//         // Include additional frontend-friendly URLs
//         downloadUrl: cloudinaryResult.secure_url.replace('/upload/', '/upload/fl_attachment/'),
//         previewUrl: previewUrl,
//       },
//     });
//   } catch (error) {
//     console.error("Error submitting journal:", error);

//     // Handle validation errors
//     if (error.name === "ValidationError") {
//       const messages = Object.values(error.errors).map((val) => val.message);
//       return res.status(400).json({
//         success: false,
//         error: messages,
//       });
//     }

//     res.status(500).json({
//       success: false,
//       error: "Server Error",
//     });
//   }
// });

// // @desc    Get all journals
// // @route   GET /journals
// // @access  Public
// router.get("/journals", async (req, res, next) => {
//   try {
//     const journals = await Journal.find().sort({ submittedAt: -1 });

//     // Enhance journals with preview URLs
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

// // @desc    Get single journal
// // @route   GET /journals/:id
// // @access  Public
// router.get("/journals/:id", async (req, res) => {
//   try {
//     const journal = await Journal.findById(req.params.id);

//     if (!journal) {
//       return res.status(404).json({
//         success: false,
//         error: "Journal not found",
//       });
//     }

//     const journalObj = journal.toObject();
    
//     // Add preview URL for PDF files
//     if (journalObj.fileType === 'pdf' && journalObj.cloudinaryPublicId) {
//       journalObj.previewUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
//         format: 'jpg',
//         page: 1,
//         width: 600,
//         height: 800,
//         crop: 'fill',
//         quality: 'auto',
//       });
      
//       // Add download URL with forced download
//       journalObj.downloadUrl = journalObj.fileUrl.replace('/upload/', '/upload/fl_attachment/');
//     }

//     return res.status(200).json({
//       success: true,
//       data: journalObj,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       error: "Server Error",
//     });
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

// // // routes/journals.js
// // const express = require("express");
// // const Journal = require("../models/Journal");
// // const fs = require("fs");
// // const path = require("path");
// // const router = express.Router();
// // const upload = require("../config/multer");
// // const { sendReviewInvitation } = require("../utils/email");
// // const { protect } = require("../utils/auth");
// // require("dotenv").config();

// // // @desc    Submit a new journal
// // // @route   POST /journals
// // // @access  Public (or Private if you want only logged in users to submit)
// // router.post("/submit", upload.single("file"), async (req, res, next) => {
// //   try {
// //     if (!req.file) {
// //       return res.status(400).json({
// //         success: false,//
// //         error: "No file uploaded",
// //       });
// //     }

// //     const {
// //       title,
// //       authors,
// //       abstract,
// //       keywords,
// //       journalName,
// //       impactFactor,
// //       description,
// //       publisher,
// //       category,
// //       issn,
// //       publicationDate,
// //       fileUrl,
// //       fileType,
// //       status,
// //       openAccess,
// //       references,
// //       citations,
// //     } = req.body;

// //     // Determine file type
// //     const fileExt = path
// //       .extname(req.file.originalname)
// //       .toLowerCase()
// //       .substring(1);
// //     const allowedTypes = ["pdf", "doc", "docx"];
// //     if (!allowedTypes.includes(fileExt)) {
// //       // Delete the uploaded file
// //       fs.unlinkSync(req.file.path);
// //       return res.status(400).json({
// //         success: false,
// //         error: "Invalid file type. Only PDF and Word documents are allowed",
// //       });
// //     }

// //     const journal = await Journal.create({
// //       title,
// //       authors: authors.split(",").map((author) => author.trim()),
// //       abstract,
// //       keywords: keywords.split(",").map((keyword) => keyword.trim()),
// //       journalName,
// //       impactFactor,
// //       description,
// //       publisher,
// //       category,
// //       issn,
// //       publicationDate: publicationDate || Date.now(),
// //       fileUrl: `/uploads/${req.file.filename}`,
// //       fileType: fileExt,
// //       status: "pending",
// //       openAccess,
// //       references,
// //       citations,
// //       submittedBy: req.user?.id || null, // Link to user if authenticated
// //     });

// //     // Send email to reviewer
// //     await sendReviewInvitation(process.env.REVIEWER_EMAIL, journal._id);

// //     res.status(201).json({
// //       success: true,
// //       data: journal,
// //     });
// //   } catch (error) {
// //     // Clean up uploaded file if error occurs
// //     if (req.file) {
// //       fs.unlinkSync(req.file.path);
// //     }

// //     // Handle validation errors
// //     if (error.name === "ValidationError") {
// //       const messages = Object.values(error.errors).map((val) => val.message);
// //       return res.status(400).json({
// //         success: false,
// //         error: messages,
// //       });
// //     }

// //     console.error("Error submitting journal:", error);
// //     res.status(500).json({
// //       success: false,
// //       error: "Server Error",
// //     });
// //   }
// // });

// // // @desc    Get all journals
// // // @route   GET /journals
// // // @access  Public
// // router.get("/journals", async (req, res, next) => {
// //   try {
// //     const journals = await Journal.find().sort({ submittedAt: -1 });

// //     return res.status(200).json({
// //       success: true,
// //       count: journals.length,
// //       data: journals,
// //     });
// //   } catch (error) {
// //     return res.status(500).json({
// //       success: false,
// //       error: "Server Error",
// //     });
// //   }
// // });

// // // @desc    Get single journal
// // // @route   GET /journals/:id
// // // @access  Public
// // router.get("/journals/:id", async (req, res) => {
// //   try {
// //     const journal = await Journal.findById(req.params.id);

// //     if (!journal) {
// //       return res.status(404).json({
// //         success: false,
// //         error: "Journal not found",
// //       });
// //     }

// //     return res.status(200).json({
// //       success: true,
// //       data: journal,
// //     });
// //   } catch (error) {
    
// //     return res.status(500).json({
// //       success: false,
// //       error: "Server Error",
// //     });
// //   }
// // });

// // // @desc    Get journal for review
// // // @route   GET /journals/review/:id
// // // @access  Private (Reviewer or Admin only)
// // router.get("/review/:id", protect(["reviewer", "admin"]), async (req, res) => {
// //   try {
// //     const journal = await Journal.findById(req.params.id);

// //    // console.log("journal:", journal)

// //     if (!journal) {
// //       return res.status(404).json({
// //         success: false,
// //         error: "Journal not found",
// //       });
// //     }

// //     res.status(200).json({
// //       success: true,
// //       data: journal,
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       error: "Server Error",
// //     });
// //   }
// // });

// // // @desc    Update journal status (approve/reject)
// // // @route   PUT /journals/:id/status
// // // @access  Private (Reviewer or Admin only)
// // router.put("/:id/status", protect(["reviewer", "admin"]), async (req, res) => {
// //   try {
// //     const { status, reviewComments } = req.body;

// //     if (!["approved", "rejected", "pending"].includes(status)) {
// //       return res.status(400).json({
// //         success: false,
// //         error: "Invalid status value",
// //       });
// //     }

// //     const journal = await Journal.findByIdAndUpdate(
// //       req.params.id,
// //       {
// //         status,
// //         reviewedBy: req.user.id,
// //         reviewedAt: Date.now(),
// //         reviewComments,
// //       },
// //       { new: true, runValidators: true }
// //     );

// //     if (!journal) {
// //       return res.status(404).json({
// //         success: false,
// //         error: "Journal not found",
// //       });
// //     }

// //     res.status(200).json({
// //       success: true,
// //       data: journal,
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       error: "Server Error",
// //     });
// //   }
// // });

// // // routes/journals.js - Add this endpoint
// // // @desc    Get journal statistics
// // // @route   GET /journals/stats
// // // @access  Private
// // router.get("/stats", protect(), async (req, res) => {
// //   try {
// //     const stats = await Journal.aggregate([
// //       {
// //         $group: {
// //           _id: null,
// //           total: { $sum: 1 },
// //           pending: {
// //             $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
// //           },
// //           approved: {
// //             $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
// //           },
// //           rejected: {
// //             $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
// //           }
// //         }
// //       }
// //     ]);

// //     res.status(200).json({
// //       success: true,
// //       data: stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       error: "Server Error"
// //     });
// //   }
// // });

// // // routes/journals.js - Add this endpoint
// // // @desc    Delete a journal
// // // @route   DELETE /journals/:id
// // // @access  Private (Admin only)
// // router.delete("/:id", protect(["admin"]), async (req, res) => {
// //   try {
// //     const journal = await Journal.findById(req.params.id);

// //     if (!journal) {
// //       return res.status(404).json({
// //         success: false,
// //         error: "Journal not found"
// //       });
// //     }

// //     // Delete associated file
// //     if (journal.fileUrl) {
// //       const filePath = path.join(__dirname, '..', journal.fileUrl);
// //       if (fs.existsSync(filePath)) {
// //         fs.unlinkSync(filePath);
// //       }
// //     }

// //     await Journal.findByIdAndDelete(req.params.id);

// //     res.status(200).json({
// //       success: true,
// //       message: "Journal deleted successfully"
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       error: "Server Error"
// //     });
// //   }
// // });

// // module.exports = router;

// routes/journals.js
const express = require("express");
const Journal = require("../models/Journal");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const upload = require("../config/multer");
const { sendReviewInvitation } = require("../utils/email");
const { protect } = require("../utils/auth");
const cloudinary = require("cloudinary").v2;
const stream = require("stream");
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc    Submit a new journal
// @route   POST /journals
// @access  Public
router.post("/submit", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const {
      title,
      authors,
      abstract,
      keywords,
      journalName,
      impactFactor,
      description,
      publisher,
      category,
      issn,
      publicationDate,
      openAccess,
      references,
      citations,
    } = req.body;

    const fileExt = path.extname(req.file.originalname).toLowerCase().substring(1);
    const allowedTypes = ["pdf", "doc", "docx"];
    
    if (!allowedTypes.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Only PDF and Word documents are allowed",
      });
    }

    // ✅ MODIFIED: Upload file to Cloudinary as 'private' for security
    let cloudinaryResult;
    try {
      cloudinaryResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw", // Use 'raw' for non-image files
            folder: "journals",
            type: "private", // <-- IMPORTANT: Upload as a private asset
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

    // Preview URL generation for PDFs (works even for private files)
    let previewUrl = null;
    if (fileExt === 'pdf') {
      previewUrl = cloudinary.url(cloudinaryResult.public_id, {
        format: 'jpg',
        page: 1,
        width: 300,
        height: 400,
        crop: 'fill',
        quality: 'auto',
      });
    }

    const journal = await Journal.create({
      title,
      authors: authors.split(",").map((author) => author.trim()),
      abstract,
      keywords: keywords.split(",").map((keyword) => keyword.trim()),
      journalName,
      impactFactor,
      description,
      publisher,
      category,
      issn,
      publicationDate: publicationDate || Date.now(),
      fileUrl: cloudinaryResult.secure_url, // Store the permanent, non-signed URL
      previewUrl: previewUrl,
      fileType: fileExt,
      status: "pending",
      openAccess: openAccess === 'true' || openAccess === true,
      references: references ? references.split(",").map(ref => ref.trim()) : [],
      citations: citations ? parseInt(citations) : 0,
      submittedBy: req.user?.id || null,
      cloudinaryPublicId: cloudinaryResult.public_id, // Store public_id for signing
    });

    await sendReviewInvitation(process.env.REVIEWER_EMAIL, journal._id);

    res.status(201).json({
      success: true,
      data: journal.toObject(),
    });
  } catch (error) {
    console.error("Error submitting journal:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages,
      });
    }
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

// @desc    Get all journals
// @route   GET /journals
// @access  Public
router.get("/journals", async (req, res, next) => {
  try {
    const journals = await Journal.find().sort({ submittedAt: -1 });

    const enhancedJournals = journals.map(journal => {
      const journalObj = journal.toObject();
      if (journalObj.fileType === 'pdf' && journalObj.cloudinaryPublicId) {
        journalObj.previewUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
          format: 'jpg',
          page: 1,
          width: 300,
          height: 400,
          crop: 'fill',
          quality: 'auto',
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

// @desc    Get single journal
// @route   GET /journals/:id
// @access  Public
router.get("/journals/:id", async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: "Journal not found",
      });
    }

    const journalObj = journal.toObject();
    
    // ✨ ADDED: Generate a temporary, signed URL for the private file
    if (journalObj.cloudinaryPublicId) {
      const signedUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
        resource_type: 'raw',
        type: 'private',
        sign_url: true,
        expires_at: Math.round((new Date().getTime() / 1000) + 3600), // URL is valid for 1 hour
      });

      // Replace the permanent URL with the temporary signed one for the frontend
      journalObj.fileUrl = signedUrl;
    }
    
    // Add preview URL for PDF files
    if (journalObj.fileType === 'pdf' && journalObj.cloudinaryPublicId) {
      journalObj.previewUrl = cloudinary.url(journalObj.cloudinaryPublicId, {
        format: 'jpg',
        page: 1,
        width: 600,
        height: 800,
        crop: 'fill',
        quality: 'auto',
      });
    }

    return res.status(200).json({
      success: true,
      data: journalObj,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});


// All other routes (review, status update, stats, delete) remain the same...
// Make sure to apply the same signed URL logic to the GET /review/:id route if needed.

module.exports = router;