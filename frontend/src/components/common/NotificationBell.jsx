import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);

  const token = getToken();

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=15', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.data || []);
        setUnread(data.unreadCount || 0);
      }
    } catch {
      // silent non-blocking UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (!token) return undefined;
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const markAllRead = async () => {
    if (!token || unread === 0) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // silent
    }
  };

  const openNotification = async (n) => {
    if (!token) return;
    try {
      if (!n.isRead) {
        await fetch(`/api/notifications/${n._id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      }
    } catch {
      // silent
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  if (!token) return null;

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              marginLeft: '0.35rem',
              minWidth: '1.2rem',
              height: '1.2rem',
              borderRadius: '999px',
              background: 'var(--danger)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 0.3rem',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 0.4rem)',
            width: '360px',
            maxHeight: '420px',
            overflow: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.9rem', borderBottom: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '0.9rem' }}>Notifications</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
          </div>

          {loading ? (
            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notifications</div>
          ) : (
            items.map((n) => (
              <button
                key={n._id}
                type="button"
                onClick={() => openNotification(n)}
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'left',
                  padding: '0.75rem 0.9rem',
                  background: n.isRead ? 'var(--surface)' : 'rgba(79, 70, 229, 0.08)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>{n.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{n.message}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{formatTime(n.createdAt)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
