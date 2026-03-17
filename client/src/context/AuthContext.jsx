import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import http from '../api/http';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  async function fetchMe() { try { const { data } = await http.get('/auth/me'); setUser(data.user); } catch { localStorage.removeItem('jmo_token'); setUser(null); } finally { setLoading(false); } }
  useEffect(() => { if (localStorage.getItem('jmo_token')) fetchMe(); else setLoading(false); }, []);
  async function login(payload) { const { data } = await http.post('/auth/login', payload); localStorage.setItem('jmo_token', data.token); setUser(data.user); return data; }
  function logout() { localStorage.removeItem('jmo_token'); setUser(null); }
  const value = useMemo(() => ({ user, loading, login, logout, refreshMe: fetchMe }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
