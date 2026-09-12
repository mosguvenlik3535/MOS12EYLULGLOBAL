import { useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Field, Inp, Sel } from '../components/ui';
import ReportModal from '../components/ReportModal';
import { buildReport, waLink } from '../lib/report';
import { sendEmail } from '../lib/email';
import { printTest } from '../lib/printReceipt';
import { useLocale } from '../locales/i18n';
import {
  DEFAULT_ENABLED_DEVICES,
  HARDWARE_DEVICES,
  hardwareCountryName,
  hardwareRegionModels,
} from '../lib/hardware';
import {
  EMAIL_PROVIDERS,
  RECOMMENDED_PROVIDERS,
  smtpPresetsFor,
  type EmailProviderId,
  type SmtpPreset,
} from '../lib/emailProviders';
import {
  ALL_REPORT_IDS,
  REPORT_ITEMS,
  dstr,
  fmt,
  tstr,
  type AppState,
  type Imkart,
  type Settings,
} from '../data';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

function Card({
  icon,
  title,
  color = 'text-amber',
  desc,
  children,
  right,
}: {
  icon: string;
  title: string;
  color?: string;
  desc?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-3.5 flex items-start gap-2.5">
        <span className={cn('rounded-lg border border-line2 bg-panel3 p-2', color)}>
          <Ic n={icon} c="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn('font-mono text-[12.5px] font-bold uppercase tracking-widest', color)}>{title}</h3>
          {desc && <p className="mt-0.5 text-[11px] leading-relaxed text-mut2">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ---------------- WHATSAPP ---------------- */

export function WhatsAppCard({
  settings,
  onPatch,
  toast,
}: {
  settings: Settings;
  onPatch: (p: Partial<Settings>) => void;
  toast: Toast;
}) {
  const [phone, setPhone] = useState(settings.waPhone);
  const [tpl, setTpl] = useState(settings.waDebtTemplate);
  return (
    <Card
      icon="phone"
      title="WhatsApp Entegrasyon Ayarları"
      color="text-mint"
      desc="Veresiye borç hatırlatma ve gün sonu raporları için"
    >
      <div className="space-y-3">
        <Field label="Dükkan WhatsApp Telefon Numarası *">
          <Inp value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono" placeholder="05xx xxx xx xx" />
        </Field>
        <Field label="Veresiye Borç Hatırlatma Şablonu (WhatsApp) *">
          <textarea
            value={tpl}
            onChange={(e) => setTpl(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-line2 bg-ink/70 px-3 py-2 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-mint/60 focus:ring-2 focus:ring-mint/15"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-mut2">Dinamik Etiketler:</span>
          <code className="rounded border border-mint/30 bg-mint/10 px-1.5 py-0.5 font-mono text-[10.5px] text-mint">
            [MUSTERI_ADI]
          </code>
          <code className="rounded border border-mint/30 bg-mint/10 px-1.5 py-0.5 font-mono text-[10.5px] text-mint">
            [BORC_TUTARI]
          </code>
        </div>
        <div className="flex gap-2">
          <Btn
            v="ghost"
            className="flex-1 border-mint/40 text-mint"
            onClick={() => {
              const text = tpl
                .replace('[MUSTERI_ADI]', 'Deneme Müşteri')
                .replace('[BORC_TUTARI]', fmt(250));
              window.open(waLink(phone, text), '_blank');
            }}
          >
            <Ic n="phone" c="h-4 w-4" /> Test Mesajı Gönder
          </Btn>
          <Btn
            v="primary"
            className="flex-1"
            onClick={() => {
              if (!phone.replace(/\D/g, '')) {
                toast('WhatsApp numarası zorunludur', 'err');
                return;
              }
              onPatch({ waPhone: phone, waDebtTemplate: tpl });
              toast('WhatsApp ayarları kaydedildi');
            }}
          >
            <Ic n="check" c="h-4 w-4" /> Kaydet
          </Btn>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- ULAŞIM KARTI ---------------- */

export function ImkartCard({
  imkart,
  onDeposit,
  toast,
}: {
  imkart: Imkart;
  onDeposit: (amount: number) => void;
  toast: Toast;
}) {
  const [amt, setAmt] = useState('');
  const recent = [...imkart.txns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return (
    <Card
      icon="card"
      title="Ulaşım Kartı Entegrasyon Ayarları"
      color="text-blue"
      desc="Müşteri kart dolum limiti yönetimi"
    >
      <div className="flex items-center justify-between rounded-lg border border-blue/30 bg-blue/5 px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-mut">Mevcut Aktif Dolum Limiti:</div>
          <div className="font-mono text-2xl font-bold text-blue tabular-nums">{fmt(imkart.limit)}</div>
        </div>
        <p className="max-w-[210px] text-right text-[10.5px] leading-relaxed text-mut2">
          Banka depozito ödemesi yapıldıkça limit artar, kart dolumları yapıldıkça limit azalır.
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-ink/40 p-3">
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-mut">
          Banka Depositosu Öde (Limit Satın Al)
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-mut2">
              ₺
            </span>
            <Inp
              type="number"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              placeholder="Örn: 2000"
              className="pl-7 font-mono"
            />
          </div>
          <Btn
            v="ghost"
            className="flex-none border-blue/50 bg-blue/10 text-blue hover:bg-blue/20"
            onClick={() => {
              const a = Number(amt.replace(',', '.'));
              if (!a || a <= 0) {
                toast('Geçerli bir depozito tutarı girin', 'err');
                return;
              }
              onDeposit(a);
              setAmt('');
              toast(`${fmt(a)} depozito kaydedildi — limit artırıldı`);
            }}
          >
            <Ic n="check" c="h-4 w-4" /> Depozitoyu Kaydet
          </Btn>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-mut2">
          <Ic n="alert" c="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber2" />
          Kaydedildiğinde ödeme tutarı kasadan nakit (çıkış) olarak düşer ve Ulaşım Kartı dolum limitine
          otomatik eklenir.
        </p>
      </div>

      {recent.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-mut2">Son Hareketler</div>
          <div className="space-y-1">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-md border border-line bg-panel2/50 px-2.5 py-1.5">
                <Ic n={t.type === 'depozito' ? 'banknote' : 'card'} c={cn('h-3.5 w-3.5', t.type === 'depozito' ? 'text-blue' : 'text-mint')} />
                <span className="font-mono text-[10px] text-mut2">
                  {dstr(t.date)} {tstr(t.date)}
                </span>
                <span className="text-[11px] text-mut">{t.type === 'depozito' ? 'Limit Satın Alımı' : `Dolum (${t.via ?? 'nakit'})`}</span>
                <span className={cn('ml-auto font-mono text-[12px] font-bold tabular-nums', t.type === 'depozito' ? 'text-blue' : 'text-mint')}>
                  {t.type === 'depozito' ? '+' : '−'}
                  {fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------------- GÜN SONU RAPORU ---------------- */

export function ReportCard({
  settings,
  onPatch,
  state,
  toast,
}: {
  settings: Settings;
  onPatch: (p: Partial<Settings>) => void;
  state: AppState;
  toast: Toast;
}) {
  const r = settings.report;
  const [draft, setDraft] = useState({ ...r });
  const [preview, setPreview] = useState<string | null>(null);
  const [test, setTest] = useState<string | null>(null);

  const toggleItem = (id: string) =>
    setDraft((d) => ({
      ...d,
      items: d.items.includes(id) ? d.items.filter((x) => x !== id) : [...d.items, id],
    }));

  const save = () => {
    onPatch({ report: { ...draft, items: draft.items } });
    toast(
      draft.enabled ? `Otomatik rapor aktif — her gün ${draft.sendTime}'de gönderilecek` : 'Rapor ayarları kaydedildi'
    );
  };

  return (
    <Card
      icon="sparkles"
      title="Otomatik WhatsApp Gün Sonu Raporu"
      color="text-blue"
      desc="Kapanıştan 10 dakika sonra işletme sahibine günlük performans raporu gönderir."
      right={
        <span className="rounded-full border border-mint/40 bg-mint/10 px-2.5 py-1 font-mono text-[10px] font-bold text-mint">
          {r.closeTime} → {r.sendTime}
        </span>
      }
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Otomatik Rapor">
          <Sel value={draft.enabled ? 'aktif' : 'kapali'} onChange={(e) => setDraft({ ...draft, enabled: e.target.value === 'aktif' })}>
            <option value="kapali">Kapalı</option>
            <option value="aktif">Aktif (Günlük)</option>
          </Sel>
        </Field>
        <Field label="İşyeri Sahibi WhatsApp Numarası">
          <Inp value={draft.ownerPhone} onChange={(e) => setDraft({ ...draft, ownerPhone: e.target.value })} className="font-mono" placeholder="05xx xxx xx xx" />
        </Field>
        <Field label="İşyeri Kapanış Saati">
          <Inp type="time" value={draft.closeTime} onChange={(e) => setDraft({ ...draft, closeTime: e.target.value })} className="font-mono" />
        </Field>
        <Field label="Rapor Gönderim Saati">
          <Inp type="time" value={draft.sendTime} onChange={(e) => setDraft({ ...draft, sendTime: e.target.value })} className="font-mono" />
        </Field>
        <Field label="Gönderim Sağlayıcısı">
          <Sel value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value as typeof draft.provider })}>
            <option value="meta">Meta WhatsApp Cloud API</option>
            <option value="web">WhatsApp Web (wa.me bağlantısı)</option>
            <option value="webhook">Webhook (alternatif)</option>
          </Sel>
        </Field>
        <Field label="Cloud API Phone Number ID">
          <Inp value={draft.phoneId} onChange={(e) => setDraft({ ...draft, phoneId: e.target.value })} className="font-mono" placeholder="Meta Phone Number ID" />
        </Field>
        <Field label="Cloud API Kalıcı Erişim Anahtarı" className="sm:col-span-2">
          <Inp value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} className="font-mono" placeholder="EAA…" />
        </Field>
        <Field label="Onaylı Şablon Adı (İşletme Bağlı)">
          <Inp value={draft.template} onChange={(e) => setDraft({ ...draft, template: e.target.value })} className="font-mono" placeholder="gun_sonu_raporu" />
        </Field>
        <Field label="Webhook Adresi (Alternatif)">
          <Inp value={draft.webhook} onChange={(e) => setDraft({ ...draft, webhook: e.target.value })} className="font-mono" placeholder="https://…" />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div>
          <div className="text-[12.5px] font-bold">Raporlama Eklenecek Olaylar</div>
          <div className="text-[10.5px] text-mut2">WhatsApp raporunda görmek istediğiniz kalemleri işaretleyin.</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="font-mono text-[10.5px] text-mint">
            {draft.items.length} / {REPORT_ITEMS.length} seçildi
          </span>
          <Btn v="subtle" className="px-2 py-1 text-[10.5px]" onClick={() => setDraft({ ...draft, items: ALL_REPORT_IDS })}>
            Tümünü Seç
          </Btn>
          <Btn v="subtle" className="px-2 py-1 text-[10.5px]" onClick={() => setDraft({ ...draft, items: [] })}>
            Temizle
          </Btn>
        </div>
      </div>

      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
        {REPORT_ITEMS.map((it) => {
          const on = draft.items.includes(it.id);
          return (
            <button
              key={it.id}
              onClick={() => toggleItem(it.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all',
                on ? 'border-mint/50 bg-mint/8' : 'border-line bg-ink/40 opacity-60 hover:opacity-90'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                  on ? 'border-mint bg-mint text-[#04211a]' : 'border-line2'
                )}
              >
                {on && <Ic n="check" c="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className={cn('block truncate text-[12px] font-semibold', on ? 'text-mint' : 'text-mut')}>{it.label}</span>
                <span className="block truncate text-[10px] text-mut2">{it.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-line bg-ink/40 px-3 py-2 text-[10.5px] leading-relaxed text-mut2">
        <span className="font-semibold text-mut">Gönderim bilgisi:</span> Yalnızca işaretlediğiniz olaylar rapora
        eklenir. Net kâr = brüt kâr − günlük masraflar. Cloud API seçiliyse Meta işletme hesabı ve onaylı şablon
        önerilir.
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-mut2">
          Son otomatik gönderim:{' '}
          <span className="font-mono text-mut">{r.lastSent ? `${dstr(r.lastSent)} ${tstr(r.lastSent)}` : 'Henüz yapılmadı.'}</span>
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Btn v="ghost" onClick={() => setPreview(buildReport(state, draft.items))}>
            <Ic n="search" c="h-4 w-4" /> Raporu Önizle
          </Btn>
          <Btn
            v="ghost"
            onClick={() =>
              setTest(
                `TEST MESAJI — ${state.settings.storeName} WhatsApp entegrasyonu çalışıyor. ${new Date().toLocaleString('tr-TR')}`
              )
            }
          >
            <Ic n="phone" c="h-4 w-4" /> WhatsApp Testi
          </Btn>
          <Btn v="mint" onClick={save}>
            <Ic n="check" c="h-4 w-4" /> Entegrasyonu Kaydet
          </Btn>
        </div>
      </div>

      {preview && <ReportModal title="Rapor Önizleme" text={preview} phone={draft.ownerPhone || settings.waPhone} onClose={() => setPreview(null)} />}
      {test && <ReportModal title="WhatsApp Test Mesajı" text={test} phone={draft.ownerPhone || settings.waPhone} onClose={() => setTest(null)} />}
    </Card>
  );
}

/* ---------------- EMAIL ENTEGRASYONU ---------------- */

export function EmailCard({
  settings,
  onPatch,
  state,
  toast,
}: {
  settings: Settings;
  onPatch: (p: Partial<Settings>) => void;
  state: AppState;
  toast: Toast;
}) {
  const e = settings.email;
  const { locale } = useLocale();
  const [draft, setDraft] = useState({ ...e });
  const [newTimeInput, setNewTimeInput] = useState('');

  const provider = (draft.provider ?? 'emailjs') as EmailProviderId;
  const info = EMAIL_PROVIDERS.find((p) => p.id === provider);
  const recommended = RECOMMENDED_PROVIDERS[locale] ?? ['smtp', 'emailjs', 'resend'];
  const presets = smtpPresetsFor(locale);

  const patchProvider = (id: EmailProviderId) =>
    setDraft((d) => ({ ...d, provider: id }));

  const save = () => {
    onPatch({ email: draft });
    toast('E-posta entegrasyonu kaydedildi');
  };

  const normalizeTime = (v: string) => {
    const rawH = Number(v.split(':')[0]) || 0;
    const rawM = Number(v.split(':')[1]) || 0;
    return `${String(rawH).padStart(2, '0')}:${String(rawM).padStart(2, '0')}`;
  };
  const addTime = () => {
    const t = normalizeTime(newTimeInput.trim());
    if (!t || draft.times.includes(t)) return;
    setDraft({ ...draft, times: [...draft.times, t].sort() });
    setNewTimeInput('');
  };
  const removeTime = (t: string) => setDraft({ ...draft, times: draft.times.filter((x) => x !== t) });

  const missing = (): string => {
    if (!draft.toEmail) return 'Alıcı E-posta Adresi gereklidir';
    switch (provider) {
      case 'emailjs':
        if (!draft.serviceId || !draft.templateId || !draft.publicKey) return 'EmailJS için Service ID, Template ID ve Public Key gereklidir';
        break;
      case 'resend':
      case 'sendgrid':
      case 'brevo':
      case 'smtp2go':
        if (!draft.privateKey) return `${info?.name ?? provider} için API Key gereklidir`;
        break;
      case 'mailgun':
        if (!draft.privateKey || !draft.domain) return 'Mailgun için API Key ve Domain gereklidir';
        break;
      case 'mailjet':
        if (!draft.publicKey || !draft.privateKey) return 'Mailjet için API Key ve Secret Key gereklidir';
        break;
      case 'smtp':
        if (!draft.smtpHost || !draft.smtpUser || !draft.smtpPass) return 'SMTP için Sunucu, Kullanıcı Adı ve Şifre gereklidir';
        break;
    }
    return '';
  };

  const testMail = async () => {
    const m = missing();
    if (m) {
      toast(m, 'err');
      return;
    }
    toast('Test e-posta gönderiliyor...');
    const subj = `[MOSBARKOD] Test E-posta — ${new Date().toLocaleString('tr-TR')}`;
    const msg = buildReport(state, (state.settings.report.items ?? []).slice(0, 8));
    const res = await sendEmail({
      provider,
      serviceId: draft.serviceId,
      templateId: draft.templateId,
      publicKey: draft.publicKey,
      privateKey: draft.privateKey,
      subject: subj,
      message: msg,
      fromName: draft.fromName || 'MOSBARKODYAZILIM',
      toEmail: draft.toEmail,
      domain: draft.domain,
      fromEmail: draft.fromEmail,
      smtpHost: draft.smtpHost,
      smtpPort: draft.smtpPort,
      smtpStarttls: draft.smtpStarttls,
      smtpUser: draft.smtpUser,
      smtpPass: draft.smtpPass,
      smtpFrom: draft.smtpFrom,
    });
    if (res.ok) {
      toast('Test e-posta başarıyla gönderildi!');
      save();
    } else {
      toast(`Gönderim başarısız: ${res.error}`, 'err');
    }
  };

  const delayedSend = () => {
    if (!e.enabled) {
      toast('Önce E-posta entegrasyonunu etkinleştirin', 'err');
      return;
    }
    toast(`Otomatik e-posta aktif — her gün ${state.settings.report.sendTime}'de şu kişiye gönderilecek: ${e.toEmail}`);
  };

  return (
    <Card
      icon="mail"
      title="E-posta Entegrasyonu"
      color="text-mint"
      desc="Gün sonu raporunu işletme sahibi mail adresine otomatik gönderir. 8 farklı sağlayıcı — ülkenize göre önerilerle."
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="E-posta Gönderimi">
          <Sel value={draft.enabled ? 'aktif' : 'kapali'} onChange={(ev) => setDraft({ ...draft, enabled: ev.target.value === 'aktif' })}>
            <option value="kapali">Kapalı</option>
            <option value="aktif">Aktif</option>
          </Sel>
        </Field>
        <Field label="Alıcı E-posta Adresi">
          <Inp type="email" value={draft.toEmail} onChange={(ev) => setDraft({ ...draft, toEmail: ev.target.value })} placeholder="owner@firma.com" />
        </Field>

        <Field label="Sağlayıcı" className="sm:col-span-2">
          <Sel value={provider} onChange={(ev) => patchProvider(ev.target.value as EmailProviderId)}>
            {EMAIL_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.freeTier}
                {recommended[0] === p.id ? ' (ÖNERİLEN)' : ''}
              </option>
            ))}
          </Sel>
        </Field>

        {info && (
          <div className="sm:col-span-2 rounded-lg border border-mint/25 bg-mint/5 px-3 py-2.5 text-[11px] leading-relaxed text-mut2">
            <b className="text-mint">{info.name}</b> · {info.blurb}
            {info.docsUrl !== '—' && (
              <span className="text-mut"> · Kayıt: {info.docsUrl}</span>
            )}
          </div>
        )}

        <Field label="Gönderen Adı">
          <Inp value={draft.fromName} onChange={(ev) => setDraft({ ...draft, fromName: ev.target.value })} placeholder="MOSBARKODYAZILIM" />
        </Field>

        {provider !== 'smtp' && provider !== 'emailjs' && (
          <Field label="Gönderici E-posta (doğrulanmış)">
            <Inp
              type="email"
              value={draft.fromEmail}
              onChange={(ev) => setDraft({ ...draft, fromEmail: ev.target.value })}
              className="font-mono"
              placeholder="sender@sizin-domain.com"
            />
          </Field>
        )}

        {provider === 'emailjs' && (
          <>
            <Field label="EmailJS Service ID">
              <Inp value={draft.serviceId} onChange={(ev) => setDraft({ ...draft, serviceId: ev.target.value })} className="font-mono" placeholder="service_abc123" />
            </Field>
            <Field label="EmailJS Template ID">
              <Inp value={draft.templateId} onChange={(ev) => setDraft({ ...draft, templateId: ev.target.value })} className="font-mono" placeholder="template_xyz456" />
            </Field>
            <Field label="EmailJS Public Key" className="sm:col-span-2">
              <Inp value={draft.publicKey} onChange={(ev) => setDraft({ ...draft, publicKey: ev.target.value })} className="font-mono" placeholder="XXXXXXXXXXXX_hedef" />
            </Field>
            <Field label="EmailJS Private API Key (opsiyonel)" className="sm:col-span-2">
              <Inp type="password" value={draft.privateKey} onChange={(ev) => setDraft({ ...draft, privateKey: ev.target.value })} className="font-mono" placeholder="403 hatası alırsanız Private Key ekleyin" />
            </Field>
          </>
        )}

        {(provider === 'resend' || provider === 'sendgrid' || provider === 'brevo' || provider === 'smtp2go') && (
          <Field label={`${info?.name ?? ''} API Key`} className="sm:col-span-2">
            <Inp type="password" value={draft.privateKey} onChange={(ev) => setDraft({ ...draft, privateKey: ev.target.value })} className="font-mono" placeholder={provider === 'resend' ? 're_...' : provider === 'sendgrid' ? 'SG.xxx' : 'API Key'} />
          </Field>
        )}

        {provider === 'mailgun' && (
          <>
            <Field label="Mailgun API Key">
              <Inp type="password" value={draft.privateKey} onChange={(ev) => setDraft({ ...draft, privateKey: ev.target.value })} className="font-mono" placeholder="key-..." />
            </Field>
            <Field label="Mailgun Domain (alan adı)">
              <Inp value={draft.domain} onChange={(ev) => setDraft({ ...draft, domain: ev.target.value })} className="font-mono" placeholder="mg.sizin-domain.com" />
            </Field>
          </>
        )}

        {provider === 'mailjet' && (
          <>
            <Field label="Mailjet API Key">
              <Inp value={draft.publicKey} onChange={(ev) => setDraft({ ...draft, publicKey: ev.target.value })} className="font-mono" placeholder="API Key" />
            </Field>
            <Field label="Mailjet Secret Key">
              <Inp type="password" value={draft.privateKey} onChange={(ev) => setDraft({ ...draft, privateKey: ev.target.value })} className="font-mono" placeholder="Secret Key" />
            </Field>
          </>
        )}

        {provider === 'smtp' && (
          <>
            <div className="sm:col-span-2 rounded-lg border border-blue/25 bg-blue/5 px-3 py-2.5 text-[11px] text-blue">
              <b>Kalıcı SMTP çözüm.</b> Gmail, Outlook, Yahoo, Yandex ve ülkenizdeki yaygın sağlayıcılarla doğrudan gönderim yapar. Nodemailer tabanlıdır, .exe içinden %100 çalışır ve üçüncü parti API bloklarına takılmaz.
            </div>
            <Field label="SMTP Sunucusu">
              <Inp value={draft.smtpHost} onChange={(ev) => setDraft({ ...draft, smtpHost: ev.target.value })} className="font-mono" />
            </Field>
            <Field label="Bağlantı Türü">
              <Sel
                value={draft.smtpStarttls ? 'starttls' : 'ssl465'}
                onChange={(ev) => setDraft({ ...draft, smtpStarttls: ev.target.value === 'starttls', smtpPort: ev.target.value === 'starttls' ? 587 : 465 })}
              >
                <option value="starttls">STARTTLS (587)</option>
                <option value="ssl465">SSL (465)</option>
              </Sel>
            </Field>
            <Field label="SMTP Kullanıcı Adı (E-posta)">
              <Inp type="email" value={draft.smtpUser} onChange={(ev) => setDraft({ ...draft, smtpUser: ev.target.value })} className="font-mono" placeholder="kullanici@gmail.com" />
            </Field>
            <Field label="Şifre / Uygulama Şifresi">
              <Inp type="password" value={draft.smtpPass} onChange={(ev) => setDraft({ ...draft, smtpPass: ev.target.value })} className="font-mono" placeholder="Gmail için App Pass gerek (myaccount.google.com/security)" />
            </Field>
            <Field label="Gönderici E-posta (Reply-To)">
              <Inp type="email" value={draft.smtpFrom} onChange={(ev) => setDraft({ ...draft, smtpFrom: ev.target.value })} className="font-mono" placeholder="boş bırakılırsa kullanıcı adı kullanılır" />
            </Field>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              {presets.map((p: SmtpPreset) => (
                <Btn
                  key={p.id}
                  v="ghost"
                  className="border-blue/50 text-blue"
                  onClick={() => setDraft({ ...draft, smtpHost: p.host, smtpPort: p.port, smtpStarttls: p.starttls })}
                  title={p.note}
                >
                  {p.name} ({p.port})
                </Btn>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-amber/25 bg-amber/5 p-3">
        <div className="mb-1 font-mono text-[10.5px] font-bold uppercase tracking-widest text-amber">
          Ülkenize Göre Önerilen Sağlayıcılar
        </div>
        <p className="mb-2.5 text-[10.5px] text-mut2">
          Her ülkede farklı e-posta hizmetleri yaygındır. Şu an seçili ülkeye göre önerilen sıralama:
        </p>
        <div className="flex flex-wrap gap-2">
          {recommended.map((rid) => {
            const p = EMAIL_PROVIDERS.find((x) => x.id === rid);
            if (!p) return null;
            return (
              <button
                key={p.id}
                onClick={() => patchProvider(p.id)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-left text-[11px] transition-colors',
                  provider === p.id
                    ? 'border-mint bg-mint/15 text-mint'
                    : 'border-line bg-panel2/40 text-mut2 hover:border-mint/40 hover:text-mint'
                )}
              >
                <span className="block font-bold">{p.name}</span>
                <span className="block text-[9.5px] opacity-75">{p.freeTier}</span>
              </button>
            );
          })}
          {recommended[0] === 'smtp' && (
            <span className="rounded-lg border border-blue/30 bg-blue/5 px-3 py-1.5 text-[11px] text-blue">
              SMTP'de ülkenize özel hazır ayarlar aşağıda tek tıkla doldurulur.
            </span>
          )}
        </div>
      </div>

      <div className="mt-3.5 rounded-lg border border-line bg-panel2/40 p-3">
        <div className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-widest text-mint">
          Günlük E-posta Gönderim Saatleri
        </div>
        <p className="mb-2.5 text-[10.5px] text-mut2">
          Günde istediğiniz kadar saat ekleyin, program o saatlerde raporu otomatik e-posta olarak gönderir.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {draft.times.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 font-mono text-sm font-bold text-mint">
              {t}
              <button onClick={() => removeTime(t)} className="text-mint/60 transition-colors hover:text-red" title="Kaldır">
                ×
              </button>
            </span>
          ))}
          {draft.times.length === 0 && <p className="text-[10.5px] text-mut2">Henüz saat eklenmedi</p>}
        </div>
        <div className="flex gap-2">
          <Inp
            type="time"
            value={newTimeInput}
            onChange={(ev) => setNewTimeInput(ev.target.value)}
            className="flex-1 font-mono"
          />
          <Btn v="ghost" onClick={addTime} className="border-mint/50 text-mint">
            <Ic n="plus" c="h-4 w-4" /> Saat Ekle
          </Btn>
          <Btn v="ghost" onClick={() => setDraft({ ...draft, times: ['13:00', '16:00', '20:00', '22:10'] })} className="text-mut2">
            Varsayılan
          </Btn>
        </div>
        <p className="mt-2 text-[10px] text-mut2">
          Günlük gönderim limiti: {draft.times.length * 5} e-posta. Seçili sağlayıcının ücretsiz kotasını ({info?.freeTier ?? '—'}) aşmamak için saat sayısını buna göre ayarlayın.
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-ink/40 px-3 py-2.5 text-[11px] leading-relaxed text-mut2">
          <div className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-widest text-mut">EmailJS Kurulum Adımları:</div>
          <ol className="list-decimal space-y-0.5 pl-4">
            <li>dashboard.emailjs.com adresine gidin</li>
            <li>Email Services &gt; Add New (Gmail/Outlook/Resend)</li>
            <li>Service ID&apos;nizi kopyalayın</li>
            <li>Email Templates &gt; şablon oluşturun, Template ID alın</li>
            <li>Account &gt; General &gt; Public Key kopyalayın</li>
          </ol>
        </div>
        <div className="rounded-lg border border-line bg-ink/40 px-3 py-2.5 text-[11px] leading-relaxed text-mut2">
          <div className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-widest text-mut">Diğer API Sağlayıcıları:</div>
          <ol className="list-decimal space-y-0.5 pl-4 text-[11px]">
            <li><b className="text-mut">Resend.</b> API key 100 mail/gün ücretsiz — resend.com</li>
            <li><b className="text-mut">SendGrid.</b> 100 mail/gün ücretsiz — sendgrid.com</li>
            <li><b className="text-mut">Mailgun.</b> 5.000/ay ücretsiz (3 ay) — mailgun.com</li>
            <li><b className="text-mut">Mailjet.</b> 200 mail/gün ücretsiz — mailjet.com</li>
            <li><b className="text-mut">Brevo.</b> 300 mail/gün ücretsiz — brevo.com</li>
            <li><b className="text-mut">SMTP2GO.</b> 1.000/ay ücretsiz — smtp2go.com</li>
          </ol>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-mut2">
          E-posta Durumu:{' '}
          <span className={e.enabled ? 'font-bold text-mint' : 'font-bold text-mut'}>{e.enabled ? 'AKTİF' : 'DEVREDİŞİ'}</span>
        </span>
        {e.lastSent && (
          <span className="font-mono text-[10px] text-mut2">Son Gönderim: {dstr(e.lastSent)} {tstr(e.lastSent)}</span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Btn v="ghost" onClick={testMail}>
            <Ic n="mail" c="h-4 w-4" /> Test E-posta Gönder
          </Btn>
          <Btn v="ghost" onClick={delayedSend} className="border-blue/50 text-blue">
            <Ic n="check" c="h-4 w-4" /> Aktif E-posta
          </Btn>
          <Btn v="mint" onClick={save}>
            <Ic n="check" c="h-4 w-4" /> Kaydet
          </Btn>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- DONANIM ---------------- */

export function HardwareCard({
  settings,
  onPatch,
  toast,
}: {
  settings: Settings;
  onPatch: (p: Partial<Settings>) => void;
  toast: Toast;
}) {
  const { locale } = useLocale();
  const enabled = settings.hardware?.enabledDevices ?? DEFAULT_ENABLED_DEVICES;
  const country = hardwareCountryName(locale);
  const printer = settings.printer;
  const [testing, setTesting] = useState(false);

  const toggle = (id: string) => {
    const next = enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id];
    onPatch({ hardware: { enabledDevices: next } });
    const d = HARDWARE_DEVICES.find((x) => x.id === id);
    toast(next.includes(id) ? `${d?.name} eklendi` : `${d?.name} çıkarıldı`);
  };

  const patchPrinter = (p: Partial<Settings['printer']>) => onPatch({ printer: { ...printer, ...p } });

  const testPrint = async () => {
    setTesting(true);
    const r = await printTest(settings);
    setTesting(false);
    if (r.ok) {
      toast('Fiş yazıcıya gönderildi');
      patchPrinter({ lastTestAt: new Date().toISOString(), lastTestResult: 'success', lastTestError: undefined });
    } else {
      toast(r.error || 'Yazdırma başarısız', 'err');
      patchPrinter({ lastTestAt: new Date().toISOString(), lastTestResult: 'failed', lastTestError: r.error });
    }
  };

  return (
    <Card
      icon="barcode"
      title="Donanım Bağlantı & Entegrasyon Paneli"
      color="text-mint"
      desc="Barkod okuyucu, fiş yazıcı, barkod etiket yazıcısı, terazi, para çekmecesi ve müşteri ekranı gibi tüm standart ekipmanlarla uyumludur. İhtiyacınız olan ekipmanları ekleyip çıkarabilirsiniz."
    >
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-mint/25 bg-mint/5 px-3 py-2">
        <Ic n="globe" c="h-4 w-4 text-mint" />
        <span className="text-[11px] text-mut">
          Seçili ülke: <b className="text-mint">{country}</b> — aşağıda bu pazarda yaygın modeller önerilir.
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {HARDWARE_DEVICES.map((d) => {
          const active = enabled.includes(d.id);
          return (
            <div
              key={d.id}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                active ? 'border-mint/40 bg-panel2/70' : 'border-line bg-panel2/30 opacity-60'
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                    active ? 'border-mint/40 bg-mint/10 text-mint' : 'border-line2 bg-panel3 text-mut'
                  )}
                >
                  <Ic n={d.icon} c="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-bold">{d.name}</span>
                    <button
                      onClick={() => toggle(d.id)}
                      className={cn(
                        'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
                        active ? 'border-mint bg-mint/80' : 'border-line2 bg-ink/60'
                      )}
                      title={active ? 'Ekipmanı çıkar' : 'Ekipmanı ekle'}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-[#0a0e13] transition-all',
                          active ? 'left-[18px]' : 'left-0.5'
                        )}
                      />
                    </button>
                  </div>
                  <div className="mt-0.5 font-mono text-[9.5px] text-mut2">{d.protocols}</div>
                </div>
              </div>

              <div className="mt-2.5 space-y-1.5">
                <div className="rounded-md border border-line bg-ink/40 px-2 py-1.5 text-[9.5px] leading-relaxed text-mut">
                  <b className="text-mut">🌍 {country}:</b> {hardwareRegionModels(d, locale)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-bold tracking-wider text-mint">
                    {active ? '✓ AKTİF' : 'EKLENMEDİ'}
                  </span>
                  {active && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Fiş Yazıcı (ESC/POS) Ayarı ---- */}
      <div className="mt-4 rounded-xl border border-mint/25 bg-panel2/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[12px] font-bold uppercase tracking-widest text-mint">🧾 Fiş Yazıcı (ESC/POS)</div>
            <div className="mt-0.5 text-[10.5px] text-mut2">
              80mm/58mm termal yazıcı · Ağ (TCP 9100) veya USB. Ayar kaydettikten sonra satışta fiş otomatik basılır.
            </div>
          </div>
          <button
            onClick={() => patchPrinter({ enabled: !printer.enabled })}
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
              printer.enabled ? 'border-mint bg-mint/80' : 'border-line2 bg-ink/60'
            )}
            title={printer.enabled ? 'Fiş yazıcıyı kapat' : 'Fiş yazıcıyı aç'}
          >
            <span
              className={cn(
                'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-[#0a0e13] transition-all',
                printer.enabled ? 'left-[18px]' : 'left-0.5'
              )}
            />
          </button>
        </div>

        {printer.enabled && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Bağlantı Türü">
                <Sel value={printer.connection} onChange={(e) => patchPrinter({ connection: e.target.value as 'tcp' | 'usb' })}>
                  <option value="tcp">Ağ (TCP/IP)</option>
                  <option value="usb">USB (Sistem Yazıcısı)</option>
                </Sel>
              </Field>
              <Field label="Kağıt Genişliği">
                <Sel value={String(printer.paperWidth)} onChange={(e) => patchPrinter({ paperWidth: Number(e.target.value) as 80 | 58 })}>
                  <option value="80">80 mm</option>
                  <option value="58">58 mm</option>
                </Sel>
              </Field>
              {printer.connection === 'tcp' ? (
                <>
                  <Field label="Yazıcı IP Adresi">
                    <Inp
                      placeholder="192.168.1.100"
                      value={printer.ip}
                      onChange={(e) => patchPrinter({ ip: e.target.value })}
                    />
                  </Field>
                  <Field label="Port">
                    <Inp
                      type="number"
                      value={printer.port}
                      onChange={(e) => patchPrinter({ port: Number(e.target.value) || 9100 })}
                    />
                  </Field>
                </>
              ) : (
                <Field label="Yazıcı Adı (Sistem)">
                  <Inp
                    placeholder="EPSON TM-T20II"
                    value={printer.usbName}
                    onChange={(e) => patchPrinter({ usbName: e.target.value })}
                  />
                </Field>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-[12px] text-txt">
                <input
                  type="checkbox"
                  checked={printer.cutPaper}
                  onChange={(e) => patchPrinter({ cutPaper: e.target.checked })}
                  className="accent-[#2fd6a5]"
                />
                Kağıt kes
              </label>
              <label className="flex items-center gap-2 text-[12px] text-txt">
                <input
                  type="checkbox"
                  checked={printer.openDrawer}
                  onChange={(e) => patchPrinter({ openDrawer: e.target.checked })}
                  className="accent-[#2fd6a5]"
                />
                Para çekmecesini aç
              </label>
              <div className="ml-auto flex items-center gap-2">
                {printer.lastTestResult && (
                  <span className={cn('font-mono text-[10px]', printer.lastTestResult === 'success' ? 'text-mint' : 'text-red')}>
                    {printer.lastTestResult === 'success' ? '✓ Son test başarılı' : '✗ Son test başarısız'}
                  </span>
                )}
                <Btn v="mint" onClick={testPrint} disabled={testing || printer.connection !== 'tcp'}>
                  <Ic n="print" c="h-4 w-4" /> {testing ? 'Gönderiliyor...' : 'Test Fişi Yazdır'}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-mut2">
        💡 Barkod okuyucular klavye gibi çalışır (sürücü gerekmez). Fiş yazıcılar ESC/POS, etiket yazıcıları ZPL/TSPL
        protokolüyle yazdırır. Para çekmecesi fiş yazıcısının RJ11 çıkışından, terazi RS232/USB üzerinden bağlanır.
        Dil seçimi değiştiğinde ülkeye özel model önerileri otomatik güncellenir. Ağ fiş yazıcıları varsayılan olarak
        <b> 9100</b> portundan dinler; USB yazıcı işletim sistemine kurulduktan sonra sistem yazdırma penceresiyle basılır.
      </p>
    </Card>
  );
}
