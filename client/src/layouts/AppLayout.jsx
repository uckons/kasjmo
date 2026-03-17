import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, FileText, ShieldCheck, History, Users, LogOut, Tags } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isViewer = user?.role === 'viewer';
  const navItems = [
    { to: '/', label: 'Dashboard', icon: BarChart3 },
    ...(isViewer ? [] : [{ to: '/transactions', label: 'Transaksi', icon: FileText }]),
    ...(user?.role === 'admin' || user?.role === 'bendahara' ? [{ to: '/categories', label: 'Kategori', icon: Tags }] : []),
    { to: '/reports', label: 'Laporan', icon: ShieldCheck },
    ...(!isViewer && user?.role !== 'approver' ? [{ to: '/audit-logs', label: 'Audit Log', icon: History }] : []),
    ...(user?.role === 'admin' ? [{ to: '/users', label: 'Users', icon: Users }] : [])
  ];

  return <div className="min-h-screen bg-slate-100"><div className="grid min-h-screen lg:grid-cols-[270px_1fr]"><aside className="bg-slate-950 text-white p-6"><Link to="/" className="block text-2xl font-bold tracking-tight">JMO Finance</Link><p className="mt-2 text-sm text-slate-300">Kas Kecil & Kas Besar</p><nav className="mt-8 space-y-2">{navItems.map((item) => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${isActive ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-slate-800'}`}><Icon size={18} /><span>{item.label}</span></NavLink>; })}</nav><div className="mt-10 rounded-2xl bg-slate-900/60 border border-slate-800 p-4"><div className="text-sm font-semibold">{user?.full_name || user?.fullName}</div><div className="text-xs uppercase tracking-wide text-slate-400">{user?.role}</div><button onClick={() => { logout(); navigate('/login'); }} className="btn-secondary mt-4 w-full"><LogOut size={16} className="mr-2" />Logout</button></div></aside><main className="p-4 md:p-6 lg:p-8"><Outlet /></main></div></div>;
}
