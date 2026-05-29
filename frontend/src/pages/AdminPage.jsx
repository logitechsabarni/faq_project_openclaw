import { useState, useEffect } from 'react';
import { useAuth } from './LoginPage';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || 'Request failed'), { status: res.status, data });
  return data;
}

// ── FAQ Management ──────────────────────────────────────────
function FAQSection() {
  const [faqs, setFaqs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'other', tags: '' });
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchFaqs(); }, []);

  const fetchFaqs = async () => {
    try {
      const data = await apiFetch('/api/faqs/all');
      setFaqs(data.data || []);
    } catch { setMsg({ type: 'error', text: 'Failed to load FAQs' }); }
  };

  const resetForm = () => { setForm({ question: '', answer: '', category: 'other', tags: '' }); setEditId(null); setShowForm(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { question: form.question, answer: form.answer, category: form.category, tags };
    const url = editId ? `/api/faqs/${editId}` : '/api/faqs';
    const method = editId ? 'PUT' : 'POST';
    try {
      const data = await apiFetch(url, { method, body: payload });
      setMsg({ type: 'success', text: editId ? 'FAQ updated!' : 'FAQ added!' });
      fetchFaqs();
      resetForm();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this FAQ?')) return;
    await apiFetch(`/api/faqs/${id}`, { method: 'DELETE' });
    fetchFaqs();
  };

  const startEdit = (faq) => {
    setForm({ question: faq.question, answer: faq.answer, category: faq.category || 'other', tags: (faq.tags || []).join(', ') });
    setEditId(faq._id);
    setShowForm(true);
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>📋 FAQ Database</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add FAQ
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {showForm && (
        <div style={{ background: 'var(--bg)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{editId ? '✏️ Edit FAQ' : '➕ Add New FAQ'}</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Question *</label>
              <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required placeholder="What is the question?" />
            </div>
            <div className="form-group">
              <label>Answer *</label>
              <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} required placeholder="Write the full answer..." style={{ minHeight: '100px' }} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['academics','admission','fees','placement','facilities','other'].map(c =>
                  <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="account, security, password" />
            </div>
            <div className="flex flex-gap">
              <button type="submit" className="btn btn-primary">{editId ? 'Update FAQ' : 'Add FAQ'}</button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {faqs.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem' }}><div className="icon">📭</div><p>No FAQs yet</p></div>
      ) : (
        <table className="admin-table">
          <thead><tr><th>#</th><th>Question</th><th>Category</th><th>Status</th><th>Views</th><th>Actions</th></tr></thead>
          <tbody>
            {faqs.map((f, i) => (
              <tr key={f._id}>
                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                <td style={{ fontWeight: 500, maxWidth: '200px' }} className="truncate">{f.question}</td>
                <td><span className="tag">{f.category || 'other'}</span></td>
                <td><span className={`tag tag-${f.status === 'published' ? 'solved' : f.status === 'archived' ? 'rejected' : ''}`}>{f.status}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{f.viewCount || 0}</td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(f)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Query Review ────────────────────────────────────────────
function QueryReviewSection() {
  const [queries, setQueries] = useState([]);
  const [msg, setMsg] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [faqTags, setFaqTags] = useState('');
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => { fetchQueries(); }, []);

  const fetchQueries = async () => {
    try {
      const data = await apiFetch('/api/queries');
      setQueries(data.data || data || []);
    } catch { setMsg({ type: 'error', text: 'Failed to load queries' }); }
  };

  const handleApprove = async (id, addToFAQ = false) => {
    try {
      const body = { addToFAQ, adminNote };
      if (addToFAQ && faqTags) body.faqTags = faqTags;
      const data = await apiFetch(`/api/queries/${id}/approve`, { method: 'PUT', body });
      setMsg({ type: 'success', text: addToFAQ ? '✅ Approved and added to FAQ!' : '✅ Solution approved' });
      setApprovingId(null); setFaqTags(''); setAdminNote('');
      fetchQueries();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  const handleReject = async (id) => {
    const note = prompt('Reason for rejection (optional):') || '';
    try {
      await apiFetch(`/api/queries/${id}/reject`, { method: 'PUT', body: { adminNote: note } });
      setMsg({ type: 'info', text: '↩️ Solution rejected. Query reopened.' });
      fetchQueries();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this query permanently?')) return;
    await apiFetch(`/api/queries/${id}`, { method: 'DELETE' });
    fetchQueries();
  };

  const pendingApproval = queries.filter(q => q.status === 'pending_approval');
  const other = queries.filter(q => q.status !== 'pending_approval');

  const STATUS_BADGE = (s) => {
    const map = { open: 'status-pending', assigned: 'status-pending', pending_approval: 'tag-pending', resolved: 'status-solved', rejected: 'status-rejected' };
    return `status-badge ${map[s] || ''}`;
  };
  const STATUS_LABEL = (s) => ({ open: '🟡 Open', assigned: '🟣 Assigned', pending_approval: '🔵 Under Review', resolved: '✅ Resolved', rejected: '❌ Rejected', closed: '⚫ Closed' }[s] || s);

  return (
    <div className="card">
      <h2 className="section-title">📬 Query Review Queue</h2>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        🔵 Awaiting Your Review ({pendingApproval.length})
      </h3>

      {pendingApproval.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>No solutions pending review 🎉</p>
      ) : (
        <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
          {pendingApproval.map(q => (
            <div key={q._id} className="card" style={{ border: '1px solid #bfdbfe', background: '#f0f9ff' }}>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.4rem' }}>{q.question}</div>
              {q.description && <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{q.description}</div>}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Raised by <strong>{typeof q.raisedBy === 'object' ? q.raisedBy?.name : (q.raisedBy || 'Unknown')}</strong>
                {' · '}{new Date(q.createdAt).toLocaleDateString()}
              </div>

              {q.communitySolution && (
                <div style={{ padding: '0.85rem', background: '#dbeafe', borderRadius: '8px', borderLeft: '3px solid var(--primary)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e40af', marginBottom: '0.3rem' }}>
                    💬 Community Solution by {typeof q.solutionBy === 'object' ? q.solutionBy?.name : (q.solutionBy || 'Someone')}
                  </div>
                  <div style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '0.9rem' }}>{q.communitySolution}</div>
                </div>
              )}

              {approvingId === q._id ? (
                <div>
                  <div className="form-group">
                    <label>Tags for FAQ (comma-separated, optional)</label>
                    <input value={faqTags} onChange={e => setFaqTags(e.target.value)} placeholder="e.g. account, password, login" />
                  </div>
                  <div className="form-group">
                    <label>Admin Note (optional)</label>
                    <input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Internal note..." />
                  </div>
                  <div className="flex flex-gap flex-wrap">
                    <button className="btn btn-accent" onClick={() => handleApprove(q._id, true)}>✅ Approve + Add to FAQ</button>
                    <button className="btn btn-primary" onClick={() => handleApprove(q._id, false)}>✅ Approve Only</button>
                    <button className="btn btn-ghost" onClick={() => { setApprovingId(null); setFaqTags(''); setAdminNote(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-gap flex-wrap">
                  <button className="btn btn-accent btn-sm" onClick={() => setApprovingId(q._id)}>✅ Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleReject(q._id)}>❌ Reject</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(q._id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        All Other Queries ({other.length})
      </h3>
      {other.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No other queries.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Question</th><th>Raised By</th><th>Status</th><th>Added to FAQ</th><th>Actions</th></tr></thead>
          <tbody>
            {other.map(q => (
              <tr key={q._id}>
                <td style={{ fontWeight: 500, maxWidth: '200px' }} className="truncate">{q.question}</td>
                <td>{typeof q.raisedBy === 'object' ? q.raisedBy?.name : (q.raisedBy || '—')}</td>
                <td><span className={STATUS_BADGE(q.status)}>{STATUS_LABEL(q.status)}</span></td>
                <td>{q.addedToFAQ ? '✅' : '❌'}</td>
                <td className="actions">
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Announcements ───────────────────────────────────────────
function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'info' });
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await apiFetch('/api/announcements');
      setAnnouncements(data.data || data || []);
    } catch { /* silent */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/announcements', { method: 'POST', body: form });
      setMsg({ type: 'success', text: 'Announcement published!' });
      setForm({ title: '', content: '', priority: 'info' });
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' });
    fetchAnnouncements();
  };

  const PRIORITY_STYLE = { info: 'var(--primary)', warning: 'var(--warning)', urgent: 'var(--danger)' };

  return (
    <div className="card">
      <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>📢 Announcements</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
          <div className="form-group">
            <label>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Announcement title..." />
          </div>
          <div className="form-group">
            <label>Content *</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required placeholder="Full text..." style={{ minHeight: '90px' }} />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: 'auto' }}>
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Warning</option>
              <option value="urgent">🚨 Urgent</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Publish</button>
        </form>
      )}

      {announcements.length === 0 ? (
        <div className="empty-state"><div className="icon">📢</div><p>No announcements yet</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {announcements.map(a => (
            <div key={a._id} style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '8px', borderLeft: `4px solid ${PRIORITY_STYLE[a.priority] || 'var(--primary)'}` }}>
              <div className="flex flex-between">
                <strong>{a.title}</strong>
                <div className="flex flex-gap">
                  <span className="tag">{a.priority}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a._id)}>Delete</button>
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.4rem', lineHeight: 1.6 }}>{a.content}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                By {typeof a.createdBy === 'object' ? a.createdBy?.name : 'Admin'} · {new Date(a.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main AdminPage with tabs ─────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState('queries');
  const { admin } = useAuth();

  if (!admin) return (
    <div className="page">
      <div className="empty-state"><div className="icon">🔐</div><p>Admin access only</p></div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>⚙️ Admin Panel</h1>
        <p>Manage FAQs, review community solutions, and post announcements</p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {['queries','faqs','announcements'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ queries: '📬 Query Review', faqs: '📋 FAQ Database', announcements: '📢 Announcements' }[t]}
          </button>
        ))}
      </div>

      {tab === 'queries' && <QueryReviewSection />}
      {tab === 'faqs' && <FAQSection />}
      {tab === 'announcements' && <AnnouncementsSection />}
    </div>
  );
}