const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['query', 'announcement', 'system'],
    default: 'system',
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  link: {
    type: String,
    default: '',
    trim: true,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  metadata: {
    queryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Query', default: null },
    announcementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', default: null },
  },
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
