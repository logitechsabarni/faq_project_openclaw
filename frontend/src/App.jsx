import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './pages/LoginPage';
import FAQPage from './pages/FAQPage';
import RaiseQueryPage from './pages/RaiseQueryPage';
import QueryResolvePage from './pages/QueryResolvePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

function NavBar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand"><span>❓</span> <span>FAQ</span><span>Hub</span></a>
      <ul className="navbar-links">
        <li><NavLink to="/" end>FAQ</NavLink></li>
        <li><NavLink to="/raise">Raise Query</NavLink></li>
        <li><NavLink to="/resolve">Resolve</NavLink></li>
        {admin ? (
          <>
            <li><NavLink to="/admin">⚙️ Admin</NavLink></li>
            <li><button onClick={() => { logout(); navigate('/login'); }} className="btn btn-ghost btn-sm">Logout</button></li>
          </>
        ) : (
          <li><NavLink to="/login" className="btn-admin">🔐 Admin Login</NavLink></li>
        )}
      </ul>
    </nav>
  );
}

function ProtectedRoute({ children }) {
  const { admin } = useAuth();
  return admin ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<FAQPage />} />
          <Route path="/raise" element={<RaiseQueryPage />} />
          <Route path="/resolve" element={<QueryResolvePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}