/**
 * EmailJS ile tarayıcıdan doğrudan e-posta gönderimi.
 * Ücretsiz plan: 200 e-posta/ay — gün sonu raporu için yeterli.
 * Hizmet yapılandırması gerekmez — API anahtarları EmailJS dashboard'dan alınır.
 */

const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

// SMTP tipi ayrıca da build edilebilir; ama sendEmail yalnızca EmailJS/Resend kullanıyor.
export type EmailProvider = 'emailjs' | 'resend' | 'smtp';

declare global {
  interface Window {
    mosEmail?: {
      send: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
      hostInfo: () => Promise<{ ips: string[]; port: number }>;
    };
  }
}

/** Electron preload köprüsü varsa Node process üzerinden gönderim yapar (CORS'suz). Yoksa tarayıcı fetch'i kullanır. */
export async function sendEmail(opts: {
  provider?: EmailProvider;
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey?: string;
  subject: string;
  message: string;
  fromName?: string;
  toEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpStarttls?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const provider = opts.provider ?? 'emailjs';

  // 0) SMTP — Electron/Node process (Nodemailer) üzerinden direkt gönderim
  if (provider === 'smtp') {
    const mosSmtp = (window as unknown as {
      mosSmtp?: { send: (p: Record<string, unknown>) => Promise<{ ok: boolean; messageId?: string; error?: string }> };
    }).mosSmtp;
    if (mosSmtp?.send) {
      try {
        return await mosSmtp.send({
          host: opts.smtpHost,
          port: opts.smtpPort,
          secure: !opts.smtpStarttls, // STARTTLS = 587 düşük güvenlik; aksi halde 465 SSL
          user: opts.smtpUser,
          pass: opts.smtpPass,
          from: opts.smtpFrom || opts.smtpUser,
          to: opts.toEmail,
          subject: opts.subject,
          text: opts.message,
        });
      } catch (e) {
        return { ok: false, error: `SMTP gönderme hatası: ${String(e)}` };
      }
    }
    return { ok: false, error: 'SMTP yalnızca masaüstü (.exe) içinden kullanılabilir. Tarayıcı/PWA için Resend veya EmailJS seçin.' };
  }

  // 1) Electron preload IPC (varsa) — Node process üzerinden, CORS yok.
  if (window.mosEmail?.send) {
    try {
      return await window.mosEmail.send({ ...opts, provider });
    } catch (e) {
      return { ok: false, error: `IPC hatası: ${String(e)}` };
    }
  }

  // 2) Resende üzerinden tarayıcı fetch (Authorization Bearer)
  if (provider === 'resend') {
    if (!opts.privateKey) return { ok: false, error: 'Resend privateKey gereklidir' };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${opts.privateKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: opts.fromName ? `${opts.fromName} <onboarding@resend.dev>` : 'MOSBARKODYAZILIM <onboarding@resend.dev>',
          to: [opts.toEmail],
          subject: opts.subject,
          text: opts.message,
        }),
      });
      if (res.ok) return { ok: true };
      const text = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 160) || res.statusText}` };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // 3) EmailJS tarayıcı fetch — privateKey varsa Authorization Bearer ile 403'ü atlatır
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.privateKey) headers.Authorization = `Bearer ${opts.privateKey}`;
    const res = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        service_id: opts.serviceId,
        template_id: opts.templateId,
        user_id: opts.publicKey,
        template_params: {
          subject: opts.subject,
          message: opts.message,
          from_name: opts.fromName ?? 'MOSBARKODYAZILIM',
          to_email: opts.toEmail,
        },
      }),
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => '');
    const hint = !opts.privateKey
      ? ' — .exe için EmailJS Private API Key gerekli veya Resend sağlayıcısı seçin'
      : '';
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 120) || res.statusText}${hint}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** EmailJS Hızlı Kurulum:
 * 1. https://dashboard.emailjs.com → Account → General → hedef mail hesabı bağla
 * 2. Email Services > Add New Service → Gmail/Outlook/Resend seç → bağla
 * 3. Service ID'sini kopyala (örn: service_abc123)
 * 4. Email Templates > Create Template → {{subject}}, {{message}}, {{from_name}}, {{to_email}} değişkenlerini ekle
 * 5. Template ID'sini kopyala (örn: template_xyz456)
 * 6. Account > General > Public Key'i kopyala (uzun string)
 */
