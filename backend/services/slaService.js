const { Query, SLA_RULES } = require('../models/Query');
const User = require('../models/User');
const { ROLES } = require('../utils/roles');

// Calculate due date based on priority
function calculateDueDate(priority) {
  const rule = SLA_RULES[priority] || SLA_RULES.medium;
  return new Date(Date.now() + rule.maxHours * 60 * 60 * 1000);
}

// Check if query needs escalation
function needsEscalation(query) {
  if (['resolved', 'closed'].includes(query.status)) return false;
  if (!query.dueDate) return false;

  const now = new Date();
  const rule = SLA_RULES[query.priority] || SLA_RULES.medium;
  const hoursSinceCreated = (now - query.createdAt) / (1000 * 60 * 60);

  // Already at max escalation level
  if (query.escalationLevel >= 3) return false;

  // Check if enough time has passed for next escalation
  const escalateThreshold = rule.escalateAfterHours * (query.escalationLevel + 1);
  return hoursSinceCreated >= escalateThreshold;
}

// Run escalation check (called periodically)
async function runEscalationCheck() {
  try {
    const activeQueries = await Query.find({
      status: { $in: ['open', 'assigned', 'pending_approval', 'rejected'] },
      escalationLevel: { $lt: 3 },
    }).populate('assignedTo', 'name role').populate('raisedBy', 'name');

    let escalatedCount = 0;

    for (const query of activeQueries) {
      if (!needsEscalation(query)) continue;

      const now = new Date();
      const rule = SLA_RULES[query.priority] || SLA_RULES.medium;
      const hoursSinceCreated = (now - query.createdAt) / (1000 * 60 * 60);
      const newLevel = query.escalationLevel + 1;

      // Determine escalation reason
      let reason = '';
      if (newLevel === 1) {
        reason = `Auto-escalated: ${query.priority} priority exceeded ${rule.escalateAfterHours}h threshold`;
      } else if (newLevel === 2) {
        reason = `Second escalation: unresolved for ${Math.round(hoursSinceCreated)}h`;
      } else {
        reason = `Final escalation: critical — unresolved for ${Math.round(hoursSinceCreated)}h`;
      }

      // Find admin to escalate to
      const admin = await User.findOne({ role: ROLES.ADMIN, isActive: true });

      query.escalationLevel = newLevel;
      query.lastEscalatedAt = now;
      query.escalationHistory.push({
        level: newLevel,
        escalatedTo: admin?._id,
        reason,
        at: now,
      });

      // Add to query history
      query.queryHistory.push({
        status: query.status,
        action: 'escalated',
        note: reason,
        by: admin?._id,
        at: now,
      });

      await query.save();
      escalatedCount++;
    }

    if (escalatedCount > 0) {
      console.log(`[SLA] Escalated ${escalatedCount} query(ies)`);
    }

    return escalatedCount;
  } catch (err) {
    console.error('[SLA] Escalation check error:', err.message);
    return 0;
  }
}

// Start periodic escalation check (every 5 minutes)
let escalationInterval = null;

function startEscalationScheduler() {
  if (escalationInterval) return;
  console.log('[SLA] Starting escalation scheduler (every 5 minutes)');
  escalationInterval = setInterval(runEscalationCheck, 5 * 60 * 1000);
  // Run once immediately on start
  runEscalationCheck();
}

function stopEscalationScheduler() {
  if (escalationInterval) {
    clearInterval(escalationInterval);
    escalationInterval = null;
    console.log('[SLA] Escalation scheduler stopped');
  }
}

module.exports = {
  calculateDueDate,
  needsEscalation,
  runEscalationCheck,
  startEscalationScheduler,
  stopEscalationScheduler,
};
