import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/apiClient';
import { toast } from '../../components/common/Toast';

export default function QueryReviewPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [faqTags, setFaqTags] = useState('');
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => { loadQueries(); }, []);

  const loadQueries = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/queries');
      setQueries(data.filter(q => ['pending_approval', 'open', 'assigned', 'resolved', 'rejected'].includes(q.status)));
    } catch { toast('Failed to load queries', 'error'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id, addToFAQ = false) => {
    try {
      await api.put(`/queries/${id}/approve`, { addToFAQ, faqTags: addToFAQ ? faqTags : '', adminNote });
      toast(addToFAQ ? '✅ Approved and added to FAQ!' : '✅ Approved', 'success');
      setApprovingId(null); setFaqTags(''); setAdminNote('');
      loadQueries();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleReject = async (id) => {
    const note = prompt('Reason for rejection (optional):') || '';
    try {
      await api.put(`/queries/${id}/reject`, { adminNote: note });
      toast('↩️ Solution rejected', 'info');
      loadQueries();
    } catch (err) { toast(err.message, 'error'); }
  };

  const pending = queries.filter(q => q.status === 'pending_approval');
  const others = queries.filter(q => q.status !== 'pending_approval');

  return (
    <DashboardLayout pageTitle="Query Review" pageSubtitle="Review community-submitted solutions and manage queries">
      <div style={{ marginBottom: '24px' }}>
        <div className="card-title mb-16">🔵 Solutions Pending Review ({pending.length})</div>
        {pending.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-desc">All caught up! No solutions pending review.</div></div>
        ) : (
          <div className="faq-list">
            {pending.map(q => (
              <div key={q._id} className="card" style={{ border: '1.5px solid #bfdbfe', background: '#f0f9ff' }}>
                <div className="flex-between mb-8">
                  <div style={{ fontWeight: 600 }}>{q.question}</div>
                  <span className="badge badge-pending_approval">Under Review</span>
                </div>
                {q.description && <div className="text-secondary text-sm mb-16">{q.description}</div>}
                <div className="flex gap-8 text-sm text-secondary mb-16" style={{ fontSize: '.8rem' }}>
                  <span>👤 {typeof q.raisedBy === 'object' ? q.raisedBy?.name : 'User'}</span>
                  <span>💬 Solution by {typeof q.solutionBy === 'object' ? q.solutionBy?.name : 'Someone'}</span>
                </div>

                {q.communitySolution && (
                  <div style={{ padding: '14px', background: '#dbeafe', borderRadius: '8px', borderLeft: '3px solid var(--primary)', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '.82rem', color: '#1e40af', marginBottom: '6px' }}>💬 Community Solution</div>
                    <div style={{ fontSize: '.9rem', lineHeight: 1.6 }}>{q.communitySolution}</div>
                  </div>
                )}

                {approvingId === q._id ? (
                  <div>
                    <div className="form-group">
                      <label className="form-label">FAQ Tags (optional)</label>
                      <input className="form-input" value={faqTags} onChange={e => setFaqTags(e.target.value)} placeholder="account, password, login" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Admin Note (optional)</label>
                      <input className="form-input" value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Internal note..." />
                    </div>
                    <div className="flex gap-8 flex-wrap">
                      <button className="btn btn-accent" onClick={() => handleApprove(q._id, true)}>✅ Approve + Add to FAQ</button>
                      <button className="btn btn-primary" onClick={() => handleApprove(q._id, false)}>✅ Approve Only</button>
                      <button className="btn btn-ghost" onClick={() => { setApprovingId(null); setFaqTags(''); setAdminNote(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-8">
                    <button className="btn btn-accent btn-sm" onClick={() => setApprovingId(q._id)}>✅ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(q._id)}>❌ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="card-title mb-16">📋 All Other Queries ({others.length})</div>
        {others.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Question</th><th>Raised By</th><th>Category</th><th>Status</th><th>Added to FAQ</th></tr>
              </thead>
              <tbody>
                {others.slice(0, 20).map(q => (
                  <tr key={q._id}>
                    <td style={{ fontWeight: 500, maxWidth: '250px' }}><div className="truncate">{q.question}</div></td>
                    <td>{typeof q.raisedBy === 'object' ? q.raisedBy?.name : '—'}</td>
                    <td><span className="badge badge-draft">{q.category}</span></td>
                    <td><span className={`badge badge-${q.status}`}>{q.status.replace('_', ' ')}</span></td>
                    <td>{q.addedToFAQ ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}