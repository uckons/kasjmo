export async function validateCaptcha(token) {
  if (String(process.env.BYPASS_CAPTCHA).toLowerCase() === 'true') return true;
  if (!token || !process.env.TURNSTILE_SECRET_KEY) return false;
  try {
    const formData = new URLSearchParams();
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: formData });
    const data = await response.json();
    return !!data.success;
  } catch { return false; }
}
