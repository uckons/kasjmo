import { useEffect, useMemo, useState } from 'react';
import http from '../api/http';
import { Plus } from 'lucide-react';

const initialForm = { cashType: 'kas_kecil', name: '', description: '', color: '#3B82F6' };

export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');

  async function load() {
    const { data } = await http.get('/categories');
    setItems(data);
  }

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => ({
    kas_kecil: items.filter((x) => x.cash_type === 'kas_kecil'),
    kas_besar: items.filter((x) => x.cash_type === 'kas_besar')
  }), [items]);

  async function addCategory() {
    setMessage('');
    try {
      await http.post('/categories', form);
      setForm(initialForm);
      setMessage('Kategori berhasil ditambah');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Gagal menambah kategori');
    }
  }

  async function toggle(cat) {
    try {
      await http.patch(`/categories/${cat.id}/status`, { isActive: !cat.is_active });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Gagal ubah status kategori');
    }
  }

  function renderCard(title, rows) {
    return <div className="card p-6 bg-slate-900 text-white border border-indigo-900"><h3 className="text-3xl font-bold">{title}</h3><div className="mt-6 divide-y divide-indigo-900">{rows.map((cat) => <div key={cat.id} className="flex items-center justify-between py-4"><div className="flex items-start gap-3"><span className="mt-2 h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || '#3B82F6' }} /><div><div className="font-semibold text-xl">{cat.name}</div><div className="text-slate-400">{cat.description || '-'}</div></div></div><button type="button" className={`rounded-full px-4 py-1 text-sm font-semibold ${cat.is_active ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700 text-slate-200'}`} onClick={() => toggle(cat)}>{cat.is_active ? 'Aktif' : 'Nonaktif'}</button></div>)}</div></div>;
  }

  return <div className="space-y-6"><div className="grid gap-4 lg:grid-cols-[220px_1fr]"><div><h1 className="text-4xl font-bold text-slate-900">Kategori Transaksi</h1><p className="mt-3 text-slate-500">Kelola kategori untuk pengelompokan transaksi</p></div><div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 p-4 text-center text-white"><button type="button" onClick={addCategory} className="inline-flex items-center gap-2 text-lg font-semibold"><Plus size={18} /> Tambah Kategori</button></div></div><div className="card p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><select className="input" value={form.cashType} onChange={(e) => setForm({ ...form, cashType: e.target.value })}><option value="kas_kecil">Kas Kecil</option><option value="kas_besar">Kas Besar</option></select><input className="input" placeholder="Nama kategori" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="input" placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><input type="color" className="input h-11" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /><button type="button" className="btn-primary" onClick={addCategory}>Simpan</button></div>{message && <div className="mt-3 text-sm text-slate-600">{message}</div>}</div><div className="grid gap-6 lg:grid-cols-2">{renderCard('Kas Kecil', groups.kas_kecil)}{renderCard('Kas Besar', groups.kas_besar)}</div></div>;
}
