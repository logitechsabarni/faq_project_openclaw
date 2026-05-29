import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/apiClient';
import { toast } from '../../components/common/Toast';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', priority: 'info' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try { const { data } = await api.get('/announcements'); setAnnouncements(data); }
    catch {}
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements', form);
      toast('Announcement published', 'success');
      setForm({ title: '', content: '', priority: 'info' });
      setShowForm(false);
      loadAnnouncements();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try { await api.del(`/announcements/${id}`); toast('Deleted', 'success'); loadAnnouncements(); }
    catch (err) { toast(err.message, 'error'); }
  };

  const PRIORITY_COLORS = { info: '#dbeafe', warning: '#fef3c7', urgent: '#fee2e2' };

  return (
    <DashboardLayout pageTitle="Announcements" pageSubtitle="Manage system-wide announcements">
      <div className="flex-between mb-24">
        <div />
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-24">
          <div className="card-title">📢 New Announcement</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Announcement title..." />
            </div>
            <div className="form-group">
              <label className="form-label">Content *</label>
              <textarea className="form-textarea" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required placeholder="Full announcement text..." />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" style={{ width: 'auto' }} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Warning</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Publish</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ height: '150px' }} />
      ) : announcements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📢</div>
          <div className="empty-title">No announcements</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {announcements.map(a => (
            <div key={a._id} className="card" style={{ borderLeft: `4px solid ${a.priority === 'urgent' ? 'var(--danger)' : a.priority === 'warning' ? 'var(--warning)' : 'var(--primary)'}` }}>
              <div className="flex-between">
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{a.title}</div>
                <div className="flex gap-8">
                  <span className={`badge badge-${a.priority === 'urgent' ? 'rejected' : a.priority === 'warning' ? 'open' : 'published'}`}>{a.priority}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a._id)}>Delete</button>
                </div>
              </div>
              <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.6 }}>{a.content}</div>
              <div className="text-secondary text-sm mt-8">By {typeof a.createdBy === 'object' ? a.createdBy?.name : 'Admin'} · {new Date(a.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}