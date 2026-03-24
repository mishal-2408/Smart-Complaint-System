const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('attachment'), async (req, res) => {
  try {
    const { title, description, userId } = req.body;
    let attachmentPath = null;
    
    if (req.file) {
      attachmentPath = req.file.path.replace(/\\/g, '/'); // Normalize path to forward slash
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newComplaint = new Complaint({
      title,
      description,
      userId,
      attachment: attachmentPath
    });

    await newComplaint.save();

    res.status(201).json({ message: 'Complaint submitted successfully', complaint: newComplaint });
  } catch (error) {
    console.error('Error submitting complaint:', error);
    res.status(500).json({ message: 'Server error while submitting complaint' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.query; 
    
    let complaints;
    if (role === 'admin') {
      complaints = await Complaint.find().populate('userId', 'username').sort({ createdAt: -1 });
    } else if (userId) {
      complaints = await Complaint.find({ userId }).sort({ createdAt: -1 });
    } else {
      return res.status(400).json({ message: 'User ID or Admin Role is required' });
    }

    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Server error while fetching complaints' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['Pending', 'In Progress', 'Resolved'].includes(status)) {
       return res.status(400).json({ message: 'Invalid status value' });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (complaint.userId && complaint.userId.email) {
      try {
        let transporter;
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
        }

        const info = await transporter.sendMail({
          from: '"Smart Complaint System" <noreply@smartcomplaints.com>',
          to: complaint.userId.email,
          subject: `Update on your complaint: ${complaint.title}`,
          text: `Hello ${complaint.userId.username},\n\nThe status of your complaint "${complaint.title}" has been updated to: ${status}.\n\nBest regards,\nAdmin Team`,
        });
        
        console.log("Email Notification sent! Message ID: %s", info.messageId);
        if (!process.env.SMTP_USER) {
           console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr);
      }
    }

    res.json({ message: 'Complaint status updated', complaint });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Server error while updating complaint' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ message: 'Server error while deleting complaint' });
  }
});

router.get('/stats', async (req, res) => {
    try {
        const stats = await Complaint.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        res.json(stats);
    } catch(error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ message: 'Server error while getting stats' });
    }
});

module.exports = router;
