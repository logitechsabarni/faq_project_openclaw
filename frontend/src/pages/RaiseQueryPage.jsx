import { useState, useRef } from 'react';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

export default function RaiseQueryPage() {
  const [form, setForm] = useState({ question: '', description: '', priority: 'medium' });
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Image must be smaller than 5MB' });
      return;
    }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setScreenshot(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question.trim()) return;
    setLoading(true);
    setMsg(null);

    const formData = new FormData();
    formData.append('question', form.question);
    formData.append('description', form.description);
    formData.append('priority', form.priority);
    if (screenshot) formData.append('screenshot', screenshot);

    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch('/api/queries', { method: 'POST', headers, body: formData });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: "✅ Query raised! The community or admin will respond soon." });
        setForm({ question: '', description: '', priority: 'medium' });
        removeFile();
      } else {
        setMsg({ type: 'error', text: data.message || data.error || 'Failed to raise query' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error — is the server running?' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🙋 Raise a Query</h1>
        <p>Can't find your answer? Submit your question to the community or admin.</p>
      </div>
      <div className="two-col">
        <div className="card">
          <h2 className="section-title">Submit Your Question</h2>
          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Question *</label>
              <input value={form.question} onChange={e => set('question', e.target.value)}
                placeholder="What's your question?" required maxLength={500} />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Add more context or details — the more specific, the better the answer..."
                style={{ minHeight: '110px' }} />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ width: 'auto' }}>
                {['low', 'medium', 'high', 'urgent'].map(p =>
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                )}
              </select>
            </div>

            {/* Screenshot Upload */}
            <div className="form-group">
              <label>Screenshot (optional)</label>
              {!screenshot ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label htmlFor="screenshot-upload" className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                    📎 Attach Screenshot
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>jpg, png, gif, webp — max 5MB</span>
                  <input
                    id="screenshot-upload"
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={preview} alt="Screenshot preview"
                      style={{ height: '90px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover' }} />
                    <button type="button" onClick={removeFile}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--danger)', color: 'white', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{screenshot.name}</span>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || !form.question.trim()}>
              {loading ? 'Submitting...' : 'Submit Query'}
            </button>
          </form>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h2 className="section-title">💡 Tips for a Good Query</h2>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '2', fontSize: '0.9rem' }}>
            <li>Search the FAQ page first to check if it's already answered</li>
            <li>Be specific and clear in your question</li>
            <li>Add context that helps understand the problem</li>
            <li>Attach a screenshot if your issue is visual — it helps a lot!</li>
            <li>Check back on the Resolve page to see if someone solved it</li>
          </ul>
          <div style={{ marginTop: '1.5rem' }}>
            <a href="/resolve" className="btn btn-ghost">🔍 Browse Open Queries</a>
          </div>
        </div>
      </div>
    </div>
  );
}