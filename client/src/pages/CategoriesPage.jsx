import { useEffect, useMemo, useState } from 'react';
import http from '../api/http';
import { Plus } from 'lucide-react';

const initialForm = { cashType: 'kas_kecil', name: '', description: '', color: '#3B82F6' };

function CategoryColumn({ title, rows, onToggle }) {
  return (
    <section className="rounded-2xl border border-indigo-900/60 bg-[#121c3a] p-6 shadow-xl shadow-slate-950/30">
      <h3 className="text-3xl font-bold text-white">{title}</h3>
      <div className="mt-5 divide-y divide-indigo-900/70">
        {rows.length === 0 && <div className="py-6 text-sm text-slate-400">Belum ada kategori.</div>}
        {rows.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-2 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color || '#3B82F6' }} />
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold text-white">{cat.name}</p>
                <p className="truncate text-slate-400">{cat.description || '-'}</p>
              </div>
            </div>
            <button
              type="button"
              className={`rounded-full px-4 py-1 text-sm font-semibold ${cat.is_active ? 'bg-emerald-900/80 text-emerald-300' : 'bg-slate-700 text-slate-200'}`}
              onClick={() => onToggle(cat)}
            >
              {cat.is_active ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');

  async function load() {
    const { data } = await http.get('/categories');
    setItems(data);
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(
    () => ({
      kas_kecil: items.filter((x) => x.cash_type === 'kas_kecil'),
      kas_besar: items.filter((x) => x.cash_type === 'kas_besar')
    }),
    [items]
  );

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

  return (
    <div className="-m-4 min-h-[calc(100vh-2rem)] bg-[#060d23] p-6 text-white md:-m-6 md:p-8 lg:-m-8 lg:p-10">
      <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
        <div>
          <h1 className="text-5xl font-extrabold leading-tight">Kategori Transaksi</h1>
          <p className="mt-4 text-lg text-slate-300">Kelola kategori untuk pengelompokan transaksi</p>
        </div>
        <button
          type="button"
          onClick={addCategory}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 text-lg font-semibold"
        >
          <Plus size={18} /> Tambah Kategori
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-900/60 bg-[#121c3a] p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select className="input border-indigo-800 bg-[#0f1730] text-white" value={form.cashType} onChange={(e) => setForm({ ...form, cashType: e.target.value })}>
            <option value="kas_kecil">Kas Kecil</option>
            <option value="kas_besar">Kas Besar</option>
          </select>
          <input className="input border-indigo-800 bg-[#0f1730] text-white placeholder:text-slate-400" placeholder="Nama kategori" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input border-indigo-800 bg-[#0f1730] text-white placeholder:text-slate-400" placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input type="color" className="input h-11 border-indigo-800 bg-[#0f1730]" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <button type="button" className="btn-primary" onClick={addCategory}>Simpan</button>
        </div>
        {message && <div className="mt-3 text-sm text-slate-300">{message}</div>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CategoryColumn title="Kas Kecil" rows={groups.kas_kecil} onToggle={toggle} />
        <CategoryColumn title="Kas Besar" rows={groups.kas_besar} onToggle={toggle} />
      </div>
    </div>
  );
}
