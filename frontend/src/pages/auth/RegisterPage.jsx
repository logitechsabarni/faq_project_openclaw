import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../components/common/Toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    if (form.password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password, form.department);
      toast(`Welcome, ${user.name}!`, 'success');
      navigate('/');
    } catch (err) {
      toast(err.message || 'Registration failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">❓</div>
        <div className="auth-title">Create Account</div>
        <div className="auth-sub">Join the Student Support Hub</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Your full name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="you@university.edu" required />
          </div>
          <div className="form-group">
            <label className="form-label">Department (optional)</label>
            <input className="form-input" value={form.department} onChange={e => set('department', e.target.value)}
              placeholder="e.g. Computer Science" />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input type="password" className="form-input" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="Min 8 characters" required minLength={8} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}