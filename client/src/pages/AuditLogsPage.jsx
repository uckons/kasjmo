import { useEffect, useState } from 'react';
import http from '../api/http';

export default function AuditLogsPage() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });

  async function load(targetPage = page) {
    const { data } = await http.get('/audit-logs', { params: { page: targetPage, limit: 20 } });
    setRows(data.rows);
    setPagination(data.pagination);
  }

  useEffect(() => {
    load(page);
  }, [page]);

  return <div className="space-y-6"><div><h1 className="text-3xl font-bold text-slate-900">Audit Log</h1><p className="mt-1 text-slate-500">Jejak aktivitas user untuk kebutuhan pengawasan.</p></div><div className="card overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">IP</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top"><td className="px-4 py-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString('id-ID')}</td><td className="px-4 py-3"><div className="font-medium">{row.full_name || '-'}</div><div className="text-xs text-slate-500">{row.email || '-'}</div></td><td className="px-4 py-3">{row.role || '-'}</td><td className="px-4 py-3">{row.action}</td><td className="px-4 py-3">{row.entity_type} #{row.entity_id || '-'}</td><td className="px-4 py-3">{row.ip_address || '-'}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm"><span>Total {pagination.total} log</span><div className="flex items-center gap-2"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button><span>Page {pagination.page}/{pagination.totalPages}</span><button className="btn-secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>Next</button></div></div></div></div>;
}
