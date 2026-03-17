import { useEffect, useState } from 'react';
import http from '../api/http';

const init = { fullName: '', email: '', role: 'approver', password: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(init);
  const [message, setMessage] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(init);

  async function load() {
    const { data } = await http.get('/users');
    setUsers(data);
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    try {
      await http.post('/users', form);
      setForm(init);
      setMessage('User berhasil dibuat');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Gagal membuat user');
    }
  }

  function startEdit(user) {
    setEditId(user.id);
    setEditForm({ fullName: user.full_name, email: user.email, role: user.role, password: '' });
  }

  async function saveEdit(userId) {
    try {
      await http.put(`/users/${userId}`, editForm);
      setEditId(null);
      setMessage('User berhasil diupdate');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Gagal update user');
    }
  }

  async function toggleStatus(user) {
    try {
      await http.patch(`/users/${user.id}/status`, { isActive: !user.is_active });
      setMessage(`User ${user.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Gagal ubah status user');
    }
  }

  async function removeUser(user) {
    const ok = window.confirm(`Hapus user ${user.full_name}?`);
    if (!ok) return;
    try {
      await http.delete(`/users/${user.id}`);
      setMessage('User berhasil dihapus');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Gagal hapus user');
    }
  }

  return <div className="space-y-6"><div><h1 className="text-3xl font-bold text-slate-900">User Management</h1><p className="mt-1 text-slate-500">Khusus admin untuk mengelola user dan role.</p></div><form onSubmit={submit} className="card p-5"><h2 className="text-lg font-semibold">Tambah User</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><input className="input" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /><input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="admin">admin</option><option value="bendahara">bendahara</option><option value="approver">approver</option></select><input className="input" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div><div className="mt-4 flex items-center gap-3"><button className="btn-primary">Simpan</button>{message && <span className="text-sm text-slate-600">{message}</span>}</div></form><div className="card overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Aksi</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-100"><td className="px-4 py-3">{editId === user.id ? <input className="input" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /> : user.full_name}</td><td className="px-4 py-3">{editId === user.id ? <input className="input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /> : user.email}</td><td className="px-4 py-3">{editId === user.id ? <select className="input" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}><option value="admin">admin</option><option value="bendahara">bendahara</option><option value="approver">approver</option></select> : user.role}</td><td className="px-4 py-3">{user.is_active ? 'active' : 'inactive'}</td><td className="px-4 py-3"><div className="flex gap-2">{editId === user.id ? <><button type="button" className="btn-primary" onClick={() => saveEdit(user.id)}>Save</button><button type="button" className="btn-secondary" onClick={() => setEditId(null)}>Cancel</button></> : <button type="button" className="btn-secondary" onClick={() => startEdit(user)}>Edit</button>}<button type="button" className="btn-secondary" onClick={() => toggleStatus(user)}>{user.is_active ? 'Disable' : 'Enable'}</button><button type="button" className="btn-secondary" onClick={() => removeUser(user)}>Delete</button></div></td></tr>)}</tbody></table></div></div></div>;
}
