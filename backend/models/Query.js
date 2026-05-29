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
    enum: QUERY_CATEGORIES,
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
    required: true,
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
}, {
  timestamps: true,
});

querySchema.index({ status: 1, createdAt: -1 });
querySchema.index({ raisedBy: 1 });

const Query = mongoose.model('Query', querySchema);
module.exports = { Query, QUERY_CATEGORIES, QUERY_PRIORITIES, QUERY_STATUSES };