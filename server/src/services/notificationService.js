export async function sendEmail({ to, subject, body }) {
  console.log('[NOTIFY][EMAIL]', { to, subject, body });
}

export async function sendWhatsApp({ to, message }) {
  console.log('[NOTIFY][WHATSAPP]', { to, message });
}

export async function notifyUser({ user, subject, body, whatsappMessage }) {
  if (!user?.email) return;
  await sendEmail({ to: user.email, subject, body });
  await sendWhatsApp({ to: user.email, message: whatsappMessage || body });
}
