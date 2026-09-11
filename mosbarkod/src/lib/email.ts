import type { EmailProviderId } from './emailProviders';

/**
 * E-posta gönderim çekirdeği — 8 sağlayıcı destekler:
 * EmailJS, Resend, SMTP (Nodemailer), SendGrid, Mailgun, Mailjet, Brevo, SMTP2GO.
 *
 * Tarayıcı/PWA tarafında CORS izin veren sağlayıcılar doğrudan fetch ile çalışır;
 * .exe (Electron) tarafında ise tümü Node köprüsü (IPC) üzerinden CORS'suz çalışır.
 */

const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

export type EmailProvider = EmailProviderId;

declare global {
  interface Window {
    mosEmail?: {
      send: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
      hostInfo: () => Promise<{ ips: string[]; port: number }>;
    };
  }
}

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
  fromEmail?: string;
  /** Mailgun gönderim alan adı (domain). */
  domain?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpStarttls?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const provider = opts.provider ?? 'emailjs';
  // API sağlayıcıları için gönderici adresi — girilmezse güvenli varsayılan.
  const fromEmail = opts.fromEmail || opts.smtpFrom || 'noreply@mosbarkod.app';
  const fromName = opts.fromName || 'MOSBARKODYAZILIM';

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
          secure: !opts.smtpStarttls, // STARTTLS = 587; aksi halde 465 SSL
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
    return { ok: false, error: 'SMTP yalnızca masaüstü (.exe) içinden kullanılabilir. Tarayıcı/PWA için bir API sağlayıcısı seçin.' };
  }

  // 1) Electron preload IPC (varsa) — Node process üzerinden, CORS yok.
  if (window.mosEmail?.send) {
    try {
      return await window.mosEmail.send({ ...opts, provider });
    } catch (e) {
      return { ok: false, error: `IPC hatası: ${String(e)}` };
    }
  }

  const httpError = async (res: Response) => {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 160) || res.statusText}` };
  };

  // 2) Resend — Bearer API key
  if (provider === 'resend') {
    if (!opts.privateKey) return { ok: false, error: 'Resend API Key gereklidir' };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${opts.privateKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [opts.toEmail],
          subject: opts.subject,
          text: opts.message,
        }),
      });
      if (res.ok) return { ok: true };
      return await httpError(res);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // 3) SendGrid — Bearer API key (SG.xxx)
  if (provider === 'sendgrid') {
    if (!opts.privateKey) return { ok: false, error: 'SendGrid API Key gereklidir' };
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${opts.privateKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: opts.toEmail }] }],
          from: { email: fromEmail, name: fromName },
          subject: opts.subject,
          content: [{ type: 'text/plain', value: opts.message }],
        }),
      });
      if (res.status >= 200 && res.status < 300) return { ok: true };
      return await httpError(res);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // 4) Mailgun — Basic auth (api:KEY) + domain
  if (provider === 'mailgun') {
    if (!opts.privateKey || !opts.domain) return { ok: false, error: 'Mailgun API Key ve Domain gereklidir' };
    try {
      const body = new URLSearchParams();
      body.set('from', `${fromName} <${fromEmail}>`);
      body.set('to', opts.toEmail);
      body.set('subject', opts.subject);
      body.set('text', opts.message);
      const res = await fetch(`https://api.mailgun.net/v3/${opts.domain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${opts.privateKey}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      if (res.ok) return { ok: true };
      return await httpError(res);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // 5) Mailjet — Basic auth (publicKey:privateKey)
  if (provider === 'mailjet') {
    if (!opts.publicKey || !opts.privateKey) return { ok: false, error: 'Mailjet API Key ve Secret Key gereklidir' };
    try {
      const res = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${opts.publicKey}:${opts.privateKey}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: fromEmail, Name: fromName },
              To: [{ Email: opts.toEmail }],
              Subject: opts.subject,
              TextPart: opts.message,
            },
          ],
        }),
      });
      if (res.ok) return { ok: true };
      return await httpError(res);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // 6) Brevo (Sendinblue) — api-key header
  if (provider === 'brevo') {
    if (!opts.privateKey) return { ok: false, error: 'Brevo API Key gereklidir' };
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': opts.privateKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: opts.toEmail }],
          subject: opts.subject,
          textContent: opts.message,
        }),
      });
      if (res.ok) return { ok: true };
      return await httpError(res);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // 7) SMTP2GO — X-Smtp2go-Api-Key header
  if (provider === 'smtp2go') {
    if (!opts.privateKey) return { ok: false, error: 'SMTP2GO API Key gereklidir' };
    try {
      const res = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: { 'X-Smtp2go-Api-Key': opts.privateKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [opts.toEmail],
          sender: fromEmail,
          subject: opts.subject,
          text_body: opts.message,
        }),
      });
      if (res.ok) return { ok: true };
      return await httpError(res);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // 8) EmailJS — tarayıcı fetch (privateKey varsa Authorization Bearer ile 403'ü atlatır)
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
          from_name: fromName,
          to_email: opts.toEmail,
        },
      }),
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => '');
    const hint = !opts.privateKey
      ? ' — .exe için EmailJS Private API Key gerekli veya başka bir sağlayıcı seçin'
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
