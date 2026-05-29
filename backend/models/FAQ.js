const mongoose = require('mongoose');

const FAQ_CATEGORIES = ['academics', 'admission', 'fees', 'placement', 'facilities', 'other'];

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [500, 'Question cannot exceed 500 characters'],
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
  },
  category: {
    type: String,
    enum: FAQ_CATEGORIES,
    default: 'other',
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0,
  },
  notHelpful: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  publishedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for full-text search
faqSchema.index({ question: 'text', answer: 'text', tags: 'text' });

const FAQ = mongoose.model('FAQ', faqSchema);
module.exports = { FAQ, FAQ_CATEGORIES };