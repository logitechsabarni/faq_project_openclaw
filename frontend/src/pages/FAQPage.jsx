import { useState, useEffect } from 'react';

const API = '/api/faqs';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFAQs(); }, []);

  const fetchFAQs = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      if (res.ok) setFaqs(data.data || []);
    } catch { /* silent fail */ }
    finally { setLoading(false); }
  };

  const open = (id) => setFaqs(faqs.map(f => f._id === id ? { ...f, expanded: !f.expanded } : f));

  const filtered = faqs.filter(f =>
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    (f.answer || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const handleVote = async (id, vote) => {
    const token = getToken();
    if (!token) { alert('Please login to vote'); return; }
    await fetch(`/api/faqs/${id}/helpful`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ vote }),
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>📖 Frequently Asked Questions</h1>
        <p>Find answers to the most common questions from the community</p>
      </div>
      <div className="search-bar">
        <input
          type="search"
          placeholder="🔍 Search questions, answers, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="empty-state"><div className="icon">⏳</div><p>Loading FAQs...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">❓</div>
          <p>{search ? 'No FAQs match your search' : 'No FAQs yet — be the first to add one!'}</p>
          {!search && <a href="/admin" className="btn btn-primary" style={{marginTop:'1rem',display:'inline-flex'}}>Add FAQ</a>}
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(faq => (
            <div key={faq._id} className="card faq-card">
              <div className="faq-question collapse-header" onClick={() => open(faq._id)}>
                <span className="q-icon">Q</span>
                <span style={{flex:1}}>{faq.question}</span>
                <span className={`collapse-chevron ${faq.expanded ? 'open' : ''}`}>▼</span>
              </div>
              {faq.expanded && (
                <>
                  <div className="faq-answer">{faq.answer}</div>
                  <div className="faq-tags">
                    {(faq.tags || []).map(t => <span key={t} className="tag">{t}</span>)}
                    <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      👍 {faq.helpful || 0}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleVote(faq._id, 'helpful'); }}>👍 Helpful</button>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleVote(faq._id, 'notHelpful'); }}>👎 Not Helpful</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}