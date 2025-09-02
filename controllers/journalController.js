// routes/journals.js
const express = require("express");
const Journal = require("../models/Journal");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const upload = require("../config/multer");
const { sendReviewInvitation } = require("../utils/email");
const { protect } = require("../utils/auth");
require("dotenv").config();

// @desc    Submit a new journal
// @route   POST /journals
// @access  Public (or Private if you want only logged in users to submit)
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
      fileUrl,
      fileType,
      status,
      openAccess,
      references,
      citations,
    } = req.body;

    // Determine file type
    const fileExt = path
      .extname(req.file.originalname)
      .toLowerCase()
      .substring(1);
    const allowedTypes = ["pdf", "doc", "docx"];
    if (!allowedTypes.includes(fileExt)) {
      // Delete the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Only PDF and Word documents are allowed",
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
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: fileExt,
      status: "pending",
      openAccess,
      references,
      citations,
      submittedBy: req.user?.id || null, // Link to user if authenticated
    });

    // Send email to reviewer
    await sendReviewInvitation(process.env.REVIEWER_EMAIL, journal._id);

    res.status(201).json({
      success: true,
      data: journal,
    });
  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages,
      });
    }

    console.error("Error submitting journal:", error);
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

    return res.status(200).json({
      success: true,
      count: journals.length,
      data: journals,
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

    return res.status(200).json({
      success: true,
      data: journal,
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

// @desc    Get journal for review
// @route   GET /journals/review/:id
// @access  Private (Reviewer or Admin only)
router.get("/review/:id", protect(["reviewer", "admin"]), async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);

   // console.log("journal:", journal)

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

// routes/journals.js - Add this endpoint
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
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error"
    });
  }
});

// routes/journals.js - Add this endpoint
// @desc    Delete a journal
// @route   DELETE /journals/:id
// @access  Private (Admin only)
router.delete("/:id", protect(["admin"]), async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: "Journal not found"
      });
    }

    // Delete associated file
    if (journal.fileUrl) {
      const filePath = path.join(__dirname, '..', journal.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Journal.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Journal deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error"
    });
  }
});

module.exports = router;
