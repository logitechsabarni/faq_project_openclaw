const mongoose = require('mongoose');

const QUERY_CATEGORIES = ['academics', 'admission', 'fees', 'placement', 'facilities', 'other'];
const QUERY_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const QUERY_STATUSES = [
  'open',
  'assigned',
  'pending_approval',
  'resolved',
  'rejected',
  'closed',
];

// SLA rules: priority -> max hours before escalation
const SLA_RULES = {
  urgent: { escalateAfterHours: 24, maxHours: 48 },
  high: { escalateAfterHours: 48, maxHours: 72 },
  medium: { escalateAfterHours: 72, maxHours: 120 },
  low: { escalateAfterHours: 120, maxHours: 240 },
};

const querySchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [500, 'Question cannot exceed 500 characters'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  category: {
    type: String,
    default: 'other',
  },
  priority: {
    type: String,
    enum: QUERY_PRIORITIES,
    default: 'medium',
  },
  status: {
    type: String,
    enum: QUERY_STATUSES,
    default: 'open',
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  communitySolution: {
    type: String,
    default: '',
  },
  solutionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  solutionSubmittedAt: {
    type: Date,
  },
  finalAnswer: {
    type: String,
    default: '',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  adminNote: {
    type: String,
    default: '',
  },
  addedToFAQ: {
    type: Boolean,
    default: false,
  },
  screenshot: {
    type: String,
    default: null,
  },
  solutionScreenshot: {
    type: String,
    default: null,
  },
  // SLA fields
  dueDate: {
    type: Date,
    default: null,
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3,
  },
  lastEscalatedAt: {
    type: Date,
    default: null,
  },
  escalationHistory: [{
    level: Number,
    escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    at: { type: Date, default: Date.now },
  }],
  queryHistory: [{
    status: {
      type: String,
      enum: QUERY_STATUSES,
      required: true,
    },
    action: {
      type: String,
      default: '',
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

querySchema.index({ status: 1, createdAt: -1 });
querySchema.index({ raisedBy: 1 });
querySchema.index({ dueDate: 1, status: 1 });
querySchema.index({ escalationLevel: 1 });

const Query = mongoose.model('Query', querySchema);
module.exports = { Query, QUERY_CATEGORIES, QUERY_PRIORITIES, QUERY_STATUSES, SLA_RULES };