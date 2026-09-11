import type { Locale } from '../locales/i18n';

/**
 * E-posta sağlayıcı kataloğu + ülkeye özel SMTP hazır ayarları.
 *
 * "Richer menu" ilkesi: dünyanın her yerinde farklı e-posta hizmetleri yaygındır.
 * Bayi hangi ülkedeyse, o ülkede yaygın sağlayıcılar ve SMTP ayarları önerilir.
 */

export type EmailProviderId =
  | 'emailjs'
  | 'resend'
  | 'smtp'
  | 'sendgrid'
  | 'mailgun'
  | 'mailjet'
  | 'brevo'
  | 'smtp2go';

export interface EmailProviderInfo {
  id: EmailProviderId;
  name: string;
  kind: 'api' | 'smtp';
  freeTier: string;
  docsUrl: string;
  blurb: string;
}

export const EMAIL_PROVIDERS: EmailProviderInfo[] = [
  {
    id: 'emailjs',
    name: 'EmailJS',
    kind: 'api',
    freeTier: '200 e-posta / ay ücretsiz',
    docsUrl: 'dashboard.emailjs.com',
    blurb: 'Tarayıcıdan doğrudan gönderim — kurulumu en kolay, hizmet yapılandırması gerekmez.',
  },
  {
    id: 'resend',
    name: 'Resend',
    kind: 'api',
    freeTier: '100 e-posta / gün ücretsiz',
    docsUrl: 'resend.com',
    blurb: 'Modern geliştirici API — Gün sonu raporu için hızlı ve güvenilir.',
  },
  {
    id: 'smtp',
    name: 'SMTP (Kendi Sunucun)',
    kind: 'smtp',
    freeTier: 'Sınırsız (kendi hesabın)',
    docsUrl: '—',
    blurb: 'Gmail, Outlook, Yahoo, Yandex vb. her SMTP hesabıyla doğrudan gönderim. .exe için idealdir.',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid (Twilio)',
    kind: 'api',
    freeTier: '100 e-posta / gün ücretsiz',
    docsUrl: 'sendgrid.com',
    blurb: 'Kurumsal teslimat altyapısı — yüksek gönderim oranı ve detaylı istatistik.',
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    kind: 'api',
    freeTier: '5.000 e-posta / ay ücretsiz (3 ay)',
    docsUrl: 'mailgun.com',
    blurb: 'Geliştirici dostu, güçlü API — alan adı (domain) doğrulaması gerekir.',
  },
  {
    id: 'mailjet',
    name: 'Mailjet (Sinch)',
    kind: 'api',
    freeTier: '200 e-posta / gün ücretsiz',
    docsUrl: 'mailjet.com',
    blurb: 'API Key + Secret Key ikilisiyle çalışır; AB bölgesinde popülerdir.',
  },
  {
    id: 'brevo',
    name: 'Brevo (Sendinblue)',
    kind: 'api',
    freeTier: '300 e-posta / gün ücretsiz',
    docsUrl: 'brevo.com',
    blurb: 'Eski adı Sendinblue — cömert ücretsiz kota, Avrupa merkezli.',
  },
  {
    id: 'smtp2go',
    name: 'SMTP2GO',
    kind: 'api',
    freeTier: '1.000 e-posta / ay ücretsiz',
    docsUrl: 'smtp2go.com',
    blurb: "SMTP'den API'ye köprü — teslimat raporu ve yedekli altyapı.",
  },
];

export interface SmtpPreset {
  id: string;
  name: string;
  host: string;
  port: number;
  starttls: boolean;
  note?: string;
}

/** Her ülkede ortak gösterilen global sağlayıcılar. */
export const GLOBAL_SMTP_PRESETS: SmtpPreset[] = [
  { id: 'gmail587', name: 'Gmail (STARTTLS)', host: 'smtp.gmail.com', port: 587, starttls: true, note: 'Gmail için Uygulama Şifresi gerekir' },
  { id: 'gmail465', name: 'Gmail (SSL)', host: 'smtp.gmail.com', port: 465, starttls: false, note: 'Gmail için Uygulama Şifresi gerekir' },
  { id: 'outlook', name: 'Outlook / Office365', host: 'smtp.office365.com', port: 587, starttls: true, note: 'Hotmail/Outlook uygulama şifresi' },
  { id: 'zoho', name: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, starttls: false },
];

/** Ülkeye özel yaygın e-posta sağlayıcıları. */
export const SMTP_PRESETS: Partial<Record<Locale, SmtpPreset[]>> = {
  tr: [
    { id: 'yahoo', name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', port: 465, starttls: false },
    { id: 'yandex', name: 'Yandex Mail', host: 'smtp.yandex.com', port: 465, starttls: false },
  ],
  en: [
    { id: 'yahoo', name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', port: 465, starttls: false },
  ],
  es: [
    { id: 'yahoo', name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', port: 465, starttls: false },
    { id: 'orange_es', name: 'Orange España', host: 'smtp.orange.es', port: 465, starttls: false },
  ],
  de: [
    { id: 'gmx', name: 'GMX', host: 'mail.gmx.net', port: 587, starttls: true },
    { id: 'webde', name: 'WEB.DE', host: 'smtp.web.de', port: 587, starttls: true },
    { id: 'tonline', name: 'T-Online', host: 'securesmtp.t-online.de', port: 587, starttls: true },
  ],
  fr: [
    { id: 'orange_fr', name: 'Orange', host: 'smtp.orange.fr', port: 465, starttls: false },
    { id: 'free', name: 'Free', host: 'smtp.free.fr', port: 465, starttls: false },
    { id: 'laposte', name: 'La Poste', host: 'smtp.laposte.net', port: 465, starttls: false },
    { id: 'sfr', name: 'SFR', host: 'smtp.sfr.fr', port: 465, starttls: false },
  ],
  it: [
    { id: 'libero', name: 'Libero', host: 'smtp.libero.it', port: 465, starttls: false },
    { id: 'virgilio', name: 'Virgilio', host: 'smtp.virgilio.it', port: 465, starttls: false },
    { id: 'tim', name: 'TIM / Alice', host: 'smtp.tim.it', port: 465, starttls: false },
  ],
  pt: [
    { id: 'uol', name: 'UOL', host: 'smtp.uol.com.br', port: 587, starttls: true },
    { id: 'bol', name: 'BOL', host: 'smtps.bol.com.br', port: 587, starttls: true },
    { id: 'terra', name: 'Terra', host: 'smtp.terra.com.br', port: 587, starttls: true },
  ],
  zh: [
    { id: 'qq', name: 'QQ Mail', host: 'smtp.qq.com', port: 465, starttls: false, note: 'QQ için yetkilendirme kodu gerekir' },
    { id: '163', name: '163 (NetEase)', host: 'smtp.163.com', port: 465, starttls: false },
    { id: '126', name: '126 Mail', host: 'smtp.126.com', port: 465, starttls: false },
  ],
  pl: [
    { id: 'wp', name: 'WP.pl', host: 'smtp.wp.pl', port: 465, starttls: false },
    { id: 'onet', name: 'Onet', host: 'smtp.poczta.onet.pl', port: 587, starttls: true },
    { id: 'interia', name: 'Interia', host: 'poczta.interia.pl', port: 465, starttls: false },
    { id: 'o2', name: 'o2', host: 'poczta.o2.pl', port: 465, starttls: false },
  ],
  nl: [
    { id: 'ziggo', name: 'Ziggo', host: 'smtp.ziggo.nl', port: 587, starttls: true },
    { id: 'kpn', name: 'KPN', host: 'smtp.kpnmail.nl', port: 587, starttls: true },
    { id: 'xs4all', name: 'XS4ALL', host: 'smtp.xs4all.nl', port: 587, starttls: true },
  ],
  ru: [
    { id: 'yandex', name: 'Yandex Mail', host: 'smtp.yandex.com', port: 465, starttls: false, note: 'Yandex için uygulama şifresi gerekir' },
    { id: 'mailru', name: 'Mail.ru', host: 'smtp.mail.ru', port: 465, starttls: false },
  ],
  ar: [
    { id: 'yahoo', name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', port: 465, starttls: false },
    { id: 'zoho', name: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, starttls: false },
  ],
};

/** Seçili ülke için önerilen API sağlayıcı sırası (ilk = önerilen). */
export const RECOMMENDED_PROVIDERS: Partial<Record<Locale, EmailProviderId[]>> = {
  tr: ['smtp', 'emailjs', 'brevo', 'resend'],
  en: ['resend', 'sendgrid', 'mailgun', 'smtp'],
  es: ['brevo', 'mailjet', 'sendgrid', 'smtp'],
  de: ['brevo', 'mailjet', 'smtp', 'resend'],
  fr: ['brevo', 'mailjet', 'smtp', 'resend'],
  it: ['mailjet', 'brevo', 'smtp', 'sendgrid'],
  pt: ['sendgrid', 'smtp2go', 'brevo', 'smtp'],
  zh: ['smtp', 'sendgrid', 'smtp2go', 'resend'],
  pl: ['smtp', 'brevo', 'mailjet', 'resend'],
  ro: ['smtp', 'brevo', 'mailjet', 'sendgrid'],
  el: ['smtp', 'brevo', 'mailjet', 'resend'],
  nl: ['brevo', 'mailjet', 'smtp', 'resend'],
  ar: ['smtp', 'smtp2go', 'sendgrid', 'resend'],
  ru: ['smtp', 'mailjet', 'smtp2go', 'sendgrid'],
};

/** Seçili ülke için SMTP hazır ayarları + global ayarlar. */
export function smtpPresetsFor(locale: Locale): SmtpPreset[] {
  return [...GLOBAL_SMTP_PRESETS, ...(SMTP_PRESETS[locale] ?? [])];
}

/** Sağlayıcı bilgisini getirir. */
export function providerInfo(id: string): EmailProviderInfo | undefined {
  return EMAIL_PROVIDERS.find((p) => p.id === id);
}
