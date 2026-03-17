import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UsersPage from './pages/UsersPage';
import AppLayout from './layouts/AppLayout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return <Routes><Route path="/login" element={<LoginPage />} /><Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}><Route index element={<DashboardPage />} /><Route path="transactions" element={<RoleRoute roles={['admin', 'bendahara', 'approver']}><TransactionsPage /></RoleRoute>} /><Route path="reports" element={<ReportsPage />} /><Route path="audit-logs" element={<RoleRoute roles={['admin', 'bendahara']}><AuditLogsPage /></RoleRoute>} /><Route path="users" element={<RoleRoute roles={['admin']}><UsersPage /></RoleRoute>} /></Route></Routes>;
}
