import { useState, useEffect } from 'react';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

const STATUS_LABEL = {
  open: '🟡 Open',
  assigned: '🟣 Assigned',
  pending_approval: '🔵 Under Review',
  resolved: '✅ Resolved',
  rejected: '❌ Rejected',
  closed: '⚫ Closed',
};

const STATUS_CLASS = {
  open: 'status-pending',
  assigned: 'status-pending',
  pending_approval: 'tag-pending',
  resolved: 'status-solved',
  rejected: 'status-rejected',
};

export default function QueryResolvePage() {
  const [queries, setQueries] = useState([]);
  const [filter, setFilter] = useState('open');
  const [solvingId, setSolvingId] = useState(null);
  const [solution, setSolution] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchQueries(); }, [filter]);

  const fetchQueries = async () => {
    const token = getToken();
    const url = filter === 'all' ? '/api/queries' : `/api/queries?status=${filter}`;
    const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    const data = await res.json();
    if (res.ok) setQueries(data.data || data || []);
  };

  const handleSubmitSolution = async (id) => {
    if (!solution.trim()) return;
    setMsg(null);
    const token = getToken();
    const res = await fetch(`/api/queries/${id}/solution`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ solution }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: '✅ Solution submitted! Sent to admin for review before adding to FAQ.' });
      setSolvingId(null);
      setSolution('');
      fetchQueries();
    } else {
      setMsg({ type: 'error', text: data.message || data.error || 'Failed to submit solution' });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🔧 Community Query Board</h1>
        <p>Browse open queries and submit solutions to help your community</p>
      </div>

      {msg && <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>{msg.text}</div>}

      <div className="flex flex-between flex-wrap flex-gap" style={{ marginBottom: '1.5rem' }}>
        <div className="flex flex-gap">
          {['open', 'pending_approval', 'resolved', 'rejected', 'all'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setMsg(null); }}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}>
              {f === 'all' ? 'All' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <a href="/raise" className="btn btn-accent btn-sm">+ Raise New Query</a>
      </div>

      {queries.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🫥</div>
          <p>No {filter === 'all' ? '' : filter.replace('_', ' ')} queries found.</p>
        </div>
      ) : (
        <div className="card-grid">
          {queries.map(q => (
            <div key={q._id} className="card">
              <div className="flex flex-between flex-wrap flex-gap">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.3rem' }}>{q.question}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    By <strong>{typeof q.raisedBy === 'object' ? q.raisedBy?.name : (q.raisedBy || 'Anonymous')}</strong>
                    {' · '}{new Date(q.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ marginTop: '0.4rem' }}>
                    <span className={`status-badge ${STATUS_CLASS[q.status] || ''}`}>
                      {STATUS_LABEL[q.status] || q.status}
                    </span>
                    {q.addedToFAQ && <span className="tag" style={{ marginLeft: '0.4rem' }}>📖 Added to FAQ</span>}
                  </div>
                </div>
              </div>

              {q.description && (
                <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {q.description}
                </div>
              )}

              {q.status === 'pending_approval' && q.communitySolution && (
                <div className="solution-block">
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e40af' }}>💬 Community Solution</div>
                  <div style={{ marginTop: '0.5rem', color: 'var(--text)', lineHeight: 1.6 }}>{q.communitySolution}</div>
                  <div className="solver">by <strong>{typeof q.solutionBy === 'object' ? q.solutionBy?.name : (q.solutionBy || 'Someone')}</strong> · awaiting admin review</div>
                </div>
              )}

              {q.status === 'rejected' && q.adminNote && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '8px', fontSize: '0.88rem', color: '#991b1b' }}>
                  <strong>Admin note:</strong> {q.adminNote}
                </div>
              )}

              {q.status === 'open' && solvingId !== q._id && (
                <button className="btn btn-accent btn-sm" style={{ marginTop: '1rem' }}
                  onClick={() => { setSolvingId(q._id); setMsg(null); }}>
                  ✍️ Submit Solution
                </button>
              )}

              {q.status === 'open' && solvingId === q._id && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Your Solution *</label>
                    <textarea value={solution} onChange={e => setSolution(e.target.value)}
                      placeholder="Write the solution here... After submission, admin will review before adding to FAQ."
                      style={{ minHeight: '90px' }} />
                  </div>
                  <div className="flex flex-gap">
                    <button className="btn btn-accent" onClick={() => handleSubmitSolution(q._id)}
                      disabled={!solution.trim()}>Submit for Review</button>
                    <button className="btn btn-ghost" onClick={() => { setSolvingId(null); setSolution(''); }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}