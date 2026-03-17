import { useEffect, useMemo, useState } from 'react';
import http from '../api/http';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  cashType: 'kas_kecil',
  flow: 'income',
  amount: '',
  category: '',
  description: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  proofFile: null,
};

function Badge({ status }) {
  const classes = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    rejected: 'bg-rose-100 text-rose-700',
    draft: 'bg-slate-100 text-slate-700'
  };
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${classes[status] || classes.draft}`}>{status}</span>;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [approvalComment, setApprovalComment] = useState({});

  async function load() {
    const { data } = await http.get('/transactions');
    setItems(data);
  }

  useEffect(() => {
    load();
  }, []);

  const pendingApprovals = useMemo(
    () => items.filter((item) => item.cash_type === 'kas_besar' && item.flow === 'expense' && item.status === 'pending_approval'),
    [items]
  );

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    try {
      const payload = { ...form };
      if (form.proofFile) {
        const base64 = await form.proofFile.arrayBuffer().then((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))));
        payload.proofFileBase64 = base64;
        payload.proofFileName = form.proofFile.name;
      }
      delete payload.proofFile;
      await http.post('/transactions', payload);
      setForm(initialForm);
      setMessage('Transaksi berhasil dibuat');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Gagal membuat transaksi');
    }
  }

  async function decide(id, decision) {
    try {
      await http.post(`/transactions/${id}/approve`, { decision, comment: approvalComment[id] || '' });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal approval');
    }
  }

  return <div className="space-y-6">{(user?.role === 'admin' || user?.role === 'bendahara') && <form onSubmit={submit} className="card p-5"><h2 className="text-lg font-semibold">Tambah Transaksi</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div><label className="label">Jenis Kas</label><select className="input" value={form.cashType} onChange={(e) => setForm({ ...form, cashType: e.target.value })}><option value="kas_kecil">Kas Kecil</option><option value="kas_besar">Kas Besar</option></select></div><div><label className="label">Arus</label><select className="input" value={form.flow} onChange={(e) => setForm({ ...form, flow: e.target.value })}><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select></div><div><label className="label">Nominal</label><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div><div><label className="label">Kategori</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><div><label className="label">Tanggal</label><input className="input" type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></div><div><label className="label">Bukti (JPG/PNG/PDF)</label><input className="input" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setForm({ ...form, proofFile: e.target.files?.[0] || null })} /></div><div className="md:col-span-2 xl:col-span-3"><label className="label">Deskripsi</label><textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div></div><div className="mt-4 flex items-center gap-3"><button className="btn-primary">Simpan</button>{message && <span className="text-sm text-slate-600">{message}</span>}</div></form>}<div className="card overflow-hidden"><div className="p-5"><h2 className="text-lg font-semibold">Daftar Transaksi</h2></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Nominal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Bukti</th><th className="px-4 py-3">Approval</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{item.transaction_date.slice(0, 10)}</td><td className="px-4 py-3"><div className="font-medium">{item.category}</div><div className="text-xs text-slate-500">{item.description}</div></td><td className="px-4 py-3">Rp {Number(item.amount).toLocaleString('id-ID')}</td><td className="px-4 py-3"><Badge status={item.status} /></td><td className="px-4 py-3">{item.proof_file_path ? <a className="text-indigo-600 underline" href={`http://localhost:5800${item.proof_file_path}`} target="_blank" rel="noreferrer">Lihat bukti</a> : '-'}</td><td className="px-4 py-3">{(item.approvals || []).length}/3</td></tr>)}</tbody></table></div></div>{(user?.role === 'admin' || user?.role === 'approver') && <div className="card p-5"><h2 className="text-lg font-semibold">Pending Approval Kas Besar</h2><div className="mt-4 space-y-4">{pendingApprovals.length === 0 && <div className="text-sm text-slate-500">Tidak ada transaksi pending.</div>}{pendingApprovals.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-semibold">{item.category} — Rp {Number(item.amount).toLocaleString('id-ID')}</div><div className="text-sm text-slate-500">{item.description || '-'} • {item.transaction_date.slice(0, 10)}</div></div><Badge status={item.status} /></div><textarea className="input mt-3" placeholder="Komentar approval" value={approvalComment[item.id] || ''} onChange={(e) => setApprovalComment((v) => ({ ...v, [item.id]: e.target.value }))} /><div className="mt-3 flex gap-2"><button type="button" className="btn-primary" onClick={() => decide(item.id, 'approved')}>Approve</button><button type="button" className="btn-secondary" onClick={() => decide(item.id, 'rejected')}>Reject</button></div></div>)}</div></div>}</div>;
}
