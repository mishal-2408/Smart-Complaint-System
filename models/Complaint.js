const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Normal', 'High'],
    default: 'Normal'
  },
  attachment: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

complaintSchema.pre('save', function() {
  const textToAnalyze = `${this.title} ${this.description}`.toLowerCase();
  const highPriorityKeywords = ['urgent', 'danger', 'emergency', 'critical', 'asap'];
  
  const isHighPriority = highPriorityKeywords.some(keyword => textToAnalyze.includes(keyword));
  
  if (isHighPriority) {
    this.priority = 'High';
  } else {
    this.priority = 'Normal';
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
