import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/apiClient';
import { toast } from '../../components/common/Toast';

const CATEGORIES = ['academics', 'admission', 'fees', 'placement', 'facilities', 'other'];

export default function FAQManagementPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'other', tags: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadFaqs(); }, []);

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/faqs/all');
      setFaqs(data);
    } catch { toast('Failed to load FAQs', 'error'); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setForm({ question: '', answer: '', category: 'other', tags: '' }); setEditId(null); setShowForm(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    try {
      if (editId) {
        await api.put(`/faqs/${editId}`, payload);
        toast('FAQ updated', 'success');
      } else {
        await api.post('/faqs', payload);
        toast('FAQ created', 'success');
      }
      resetForm();
      loadFaqs();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Archive this FAQ?')) return;
    try { await api.del(`/faqs/${id}`); toast('FAQ archived', 'success'); loadFaqs(); }
    catch (err) { toast(err.message, 'error'); }
  };

  const startEdit = (f) => {
    setForm({ question: f.question, answer: f.answer, category: f.category, tags: (f.tags || []).join(', ') });
    setEditId(f._id); setShowForm(true);
  };

  return (
    <DashboardLayout pageTitle="FAQ Management" pageSubtitle="Create, edit, and manage the knowledge base">
      <div className="flex-between mb-16">
        <div />
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add FAQ
        </button>
      </div>

      {showForm && (
        <div className="card mb-24">
          <div className="card-title">{editId ? '✏️ Edit FAQ' : '➕ New FAQ'}</div>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Question *</label>
                <input className="form-input" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required placeholder="What is the question?" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Answer *</label>
                <textarea className="form-textarea" value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} required placeholder="Write the full answer..." />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input className="form-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="account, password, security" />
              </div>
            </div>
            <div className="flex gap-8">
              <button type="submit" className="btn btn-primary">{editId ? 'Update FAQ' : 'Create FAQ'}</button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ height: '200px' }} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Question</th><th>Category</th><th>Status</th><th>Views</th><th>Helpful</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((f, i) => (
                <tr key={f._id}>
                  <td className="text-secondary">{i + 1}</td>
                  <td style={{ fontWeight: 500, maxWidth: '280px' }}><div className="truncate">{f.question}</div></td>
                  <td><span className="badge badge-draft">{f.category}</span></td>
                  <td><span className={`badge badge-${f.status}`}>{f.status}</span></td>
                  <td className="text-secondary">{f.viewCount}</td>
                  <td className="text-secondary">{f.helpful}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(f)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f._id)}>Archive</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}