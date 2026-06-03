const Notification = require('../models/Notification');

async function createNotification(payload) {
  if (!payload?.user || !payload?.title || !payload?.message) return null;
  return Notification.create(payload);
}

async function createNotificationsBulk(payloads = []) {
  const docs = payloads.filter((p) => p?.user && p?.title && p?.message);
  if (!docs.length) return [];
  return Notification.insertMany(docs, { ordered: false });
}

module.exports = { createNotification, createNotificationsBulk };
