import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/apiClient';
import { toast } from '../../components/common/Toast';

const ROLES = ['student', 'support_staff', 'admin'];
const ROLE_LABELS = { student: '🎓 Student', support_staff: '🛠️ Support Staff', admin: '⚙️ Admin' };

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadUsers(); }, [filter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/users' : `/users?role=${filter}`;
      const { data } = await api.get(url);
      setUsers(data);
    } catch { toast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.put(`/users/${id}/role`, { role });
      toast('Role updated', 'success');
      loadUsers();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleToggleActive = async (id) => {
    try {
      const { data } = await api.put(`/users/${id}/toggle-active`);
      toast(data.message, 'success');
      loadUsers();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <DashboardLayout pageTitle="User Management" pageSubtitle="Manage user roles and account status">
      <div className="filter-bar">
        {['all', ...ROLES].map(r => (
          <button key={r} className={`btn btn-sm ${filter === r ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(r)}>
            {r === 'all' ? 'All' : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ height: '200px' }} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td className="text-secondary">{u.email}</td>
                  <td>
                    <select className="form-select" style={{ width: 'auto', padding: '4px 28px 4px 8px', fontSize: '.8rem' }}
                      value={u.role} onChange={e => handleRoleChange(u._id, e.target.value)}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="text-secondary text-sm">{u.department || '—'}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-resolved' : 'badge-rejected'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-secondary text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-accent'}`}
                      onClick={() => handleToggleActive(u._id)}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
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