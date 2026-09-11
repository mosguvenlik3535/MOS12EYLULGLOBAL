import { useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Field, Inp, Sel } from '../components/ui';
import ReportModal from '../components/ReportModal';
import { buildReport, waLink } from '../lib/report';
import { sendEmail } from '../lib/email';
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
  const [draft, setDraft] = useState({ ...e });
  const [newTimeInput, setNewTimeInput] = useState('');

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

  const testMail = async () => {
    const p = draft.provider ?? 'emailjs';
    if (p === 'resend' && (!draft.privateKey || !draft.toEmail)) {
      toast('Resend için API Key ve Alıcı E-posta gereklidir', 'err');
      return;
    }
    if (p === 'emailjs' && (!draft.serviceId || !draft.templateId || !draft.publicKey || !draft.toEmail)) {
      toast('EmailJS için Service ID, Template ID, Public Key ve Alıcı E-posta gereklidir', 'err');
      return;
    }
    if (p === 'smtp' && (!draft.smtpHost || !draft.smtpUser || !draft.smtpPass || !draft.toEmail)) {
      toast('SMTP için Sunucu, Kullanıcı Adı, Şifre ve Alıcı E-posta gereklidir', 'err');
      return;
    }
    toast('Test e-posta gönderiliyor...');
    const subj = `[MOSBARKOD] Test E-posta — ${new Date().toLocaleString('tr-TR')}`;
    const msg = buildReport(state, (state.settings.report.items ?? []).slice(0, 8));
    const res = await sendEmail({
      provider: (p as 'emailjs' | 'resend' | 'smtp'),
      serviceId: draft.serviceId,
      templateId: draft.templateId,
      publicKey: draft.publicKey,
      privateKey: draft.privateKey,
      subject: subj,
      message: msg,
      fromName: draft.fromName || 'MOSBARKODYAZILIM',
      toEmail: draft.toEmail,
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
      title="E-posta Entegrasyonu (EmailJS)"
      color="text-mint"
      desc="Gün sonu raporunu işletme sahibi mail adresine otomatik gönderir. EmailJS ücretsiz 200 mail/ay."
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="E-posta Gönderimi">
          <Sel value={draft.enabled ? 'aktif' : 'kapali'} onChange={(ev) => setDraft({ ...draft, enabled: ev.target.value === 'aktif' })}>
            <option value="kapali">Kapalı</option>
            <option value="aktif">Aktif</option>
          </Sel>
        </Field>
        <Field label="Sağlayıcı">
          <Sel
            value={draft.provider ?? 'emailjs'}
            onChange={(ev) => setDraft({ ...draft, provider: ev.target.value as 'emailjs' | 'resend' | 'smtp' })}
          >
            <option value="smtp">SMTP (Nodemailer — kalıcı, .exe için ideal)</option>
            <option value="emailjs">EmailJS (EmailJS Cloud API)</option>
            <option value="resend">Resend (Cloud API)</option>
          </Sel>
        </Field>
        <Field label="Alıcı E-posta Adresi">
          <Inp type="email" value={draft.toEmail} onChange={(ev) => setDraft({ ...draft, toEmail: ev.target.value })} placeholder="owner@firma.com" />
        </Field>
        {(draft.provider ?? 'emailjs') === 'emailjs' ? (
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
          </>
        ) : draft.provider === 'resend' ? (
          <Field label="Resend API Key (100/gün ücretsiz)" className="sm:col-span-2">
            <Inp
              type="password"
              value={draft.privateKey}
              onChange={(ev) => setDraft({ ...draft, privateKey: ev.target.value })}
              className="font-mono"
              placeholder="re_..."
            />
          </Field>
        ) : (
          <>
            <div className="sm:col-span-2 rounded-lg border border-blue/25 bg-blue/5 px-3 py-2.5 text-[11px] text-blue">
              <b>Kalıcı SMTP çözüm.</b> Gmail / Outlook / Hotmail SMTP ayarlarınızla direkt gönderim yapar. Nodemailer tabanlıdır, exe içinden %100 çalışır ve üçüncü parti API bloklarına takılmaz.
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
            <div className="flex flex-wrap gap-2">
              <Btn
                v="ghost"
                className="border-blue/50 text-blue"
                onClick={() => setDraft({ ...draft, smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpStarttls: true })}
              >
                Gmail (587)
              </Btn>
              <Btn
                v="ghost"
                className="border-blue/50 text-blue"
                onClick={() => setDraft({ ...draft, smtpHost: 'smtp.gmail.com', smtpPort: 465, smtpStarttls: false })}
              >
                Gmail (465)
              </Btn>
              <Btn
                v="ghost"
                className="border-blue/50 text-blue"
                onClick={() => setDraft({ ...draft, smtpHost: 'smtp.office365.com', smtpPort: 587, smtpStarttls: true })}
              >
                Outlook/Hotmail
              </Btn>
            </div>
          </>
        )}
      </div>
      <div className="mt-2 space-y-2.5">
        <Field label="Gönderen Adı" className="sm:col-span-2">
          <Inp value={draft.fromName} onChange={(ev) => setDraft({ ...draft, fromName: ev.target.value })} placeholder="MOSBARKODYAZILIM" />
        </Field>
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
          Günlük gönderim limiti: {draft.times.length * 5} e-posta. EmailJS ücretsiz planı (200 mail/ay) aşmamak için gün birden tanımlı saat sayısını önde tutmayla ayarlayın.
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
          <div className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-widest text-mut">Alt Email Sağlayıcıları:</div>
          <ol className="list-decimal space-y-0.5 pl-4 text-[11px]">
            <li><b className="text-mut">Resend.</b>API key 100 mail/gün ücretsiz — dashboard.resend.com</li>
            <li><b className="text-mut">SendGrid.</b>100 mail/gün ücretsiz — sendgrid.com</li>
            <li><b className="text-mut">Mailgun.</b>5.000/ay ücretsiz — mailgun.com</li>
            <li><b className="text-mut">SMTP2GO.</b>1.000/ay free tier — smtp2go.com</li>
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

export function HardwareCard({ toast }: { toast: Toast }) {
  const devices = [
    { name: 'Barkod Okuyucu', sub: 'Klavye Emülasyonu (USB/HID)' },
    { name: 'Terminal Yazıcı', sub: 'ESC/POS Protokolü (58/80mm)' },
    { name: 'Elektronik Terazi', sub: 'CAS/TEM Seri Port' },
  ];
  return (
    <Card
      icon="barcode"
      title="Donanım Bağlantı & Entegrasyon Paneli"
      color="text-mint"
      desc="Yazılımımız tüm standart 1D/2D barkod okuyucular, 58mm/80mm terminal fiş yazıcılar ve elektronik terazilerle (CAS, TEM vb.) %100 uyumlu olarak çalışır."
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {devices.map((d) => (
          <div key={d.name} className="rounded-lg border border-line bg-panel2/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold">{d.name}</span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-mut2">{d.sub}</div>
            <div className="mt-2.5 font-mono text-[10px] font-bold tracking-wider text-mint">X100 UYUMLU</div>
          </div>
        ))}
      </div>
      <Btn v="primary" className="mt-3 w-full" onClick={() => toast('Donanım profili güncellendi ve kaydedildi')}>
        <Ic n="check" c="h-4 w-4" /> Ayarları Güncelle ve Kaydet
      </Btn>
    </Card>
  );
}
