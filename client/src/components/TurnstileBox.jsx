import { useEffect } from 'react';
export default function TurnstileBox({ onToken }) {
  useEffect(() => { const key = import.meta.env.VITE_TURNSTILE_SITE_KEY; if (!key) return; const interval = setInterval(() => { const el = document.getElementById('turnstile-box'); if (window.turnstile && el && !el.dataset.rendered) { window.turnstile.render('#turnstile-box', { sitekey: key, callback: (token) => onToken(token) }); el.dataset.rendered = 'true'; } }, 500); return () => clearInterval(interval); }, [onToken]);
  if (!import.meta.env.VITE_TURNSTILE_SITE_KEY) return <div className="text-xs text-amber-600">Turnstile site key belum diisi. Cocok untuk UAT lokal bila backend bypass captcha aktif.</div>;
  return <div id="turnstile-box" />;
}
