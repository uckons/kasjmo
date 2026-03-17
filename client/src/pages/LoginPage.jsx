import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TurnstileBox from '../components/TurnstileBox';
import http from '../api/http';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@jakartamax.local', password: 'Admin#12345' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ ...form, captchaToken });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  async function requestReset() {
    const { data } = await http.post('/auth/password-reset/request', { email: resetEmail });
    setInfo(data.message);
  }

  async function confirmReset() {
    const { data } = await http.post('/auth/password-reset/confirm', { token: resetToken, newPassword });
    setInfo(data.message);
  }

  return <div className="min-h-screen grid lg:grid-cols-2"><div className="hidden lg:flex bg-slate-950 text-white p-12 flex-col justify-between"><div><div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm"><ShieldCheck size={18} />Jakarta Max Owners</div><h1 className="mt-8 text-5xl font-bold leading-tight">Enterprise Kas Kecil & Kas Besar</h1></div></div><div className="grid place-items-center bg-slate-100 p-6"><div className="w-full max-w-md space-y-4"><form onSubmit={submit} className="card w-full p-8"><h2 className="text-2xl font-bold text-slate-900">Sign in</h2><div className="mt-6"><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} /></div><div className="mt-4"><label className="label">Password</label><input type="password" className="input" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} /></div><div className="mt-4"><TurnstileBox onToken={setCaptchaToken} /></div>{error && <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}<button disabled={loading} className="btn-primary mt-6 w-full">{loading ? 'Signing in...' : 'Login'}</button></form><div className="card p-5"><h3 className="font-semibold">Reset Password</h3><input className="input mt-2" placeholder="Email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} /><button type="button" className="btn-secondary mt-2" onClick={requestReset}>Kirim token reset</button><input className="input mt-3" placeholder="Token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} /><input className="input mt-2" placeholder="Password baru" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><button type="button" className="btn-primary mt-2" onClick={confirmReset}>Reset password</button>{info && <p className="mt-2 text-xs text-slate-600">{info}</p>}</div></div></div></div>;
}
