import { useEffect, useMemo, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Field, Inp, Sel, Td, Th } from '../components/ui';
import Flag from '../components/Flag';
import { ensureLicenseChain } from '../lib/license';
import { POS_BRANDS, POS_COUNTRIES, brandsForCountry, brandForCountry, countryById, type PosBrand } from '../lib/posCatalog';
import { fmt, dstr, tstr, type Sale, type Settings } from '../data';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

const CONN_TYPES: { id: 'mobile' | 'tcp' | 'serial' | 'usb' | 'http'; name: string; icon: string; desc: string }[] = [
  { id: 'mobile', name: 'Mobil POS (SIM Kart)', icon: 'phone', desc: 'SIM kartlı mobil POS (GPRS/4G). Statik IP ve APN girin.' },
  { id: 'tcp', name: 'TCP/IP (Kablo / Ağ)', icon: 'monitor', desc: 'Ethernet veya Wi-Fi üzerinden sabit IP + port.' },
  { id: 'serial', name: 'Seri Port (RS232)', icon: 'gear', desc: 'RS232 seri port; baud, parity, stop bit ayarları.' },
  { id: 'usb', name: 'USB Klavye (HID)', icon: 'monitor', desc: 'POS klavye modunda; tutar otomatik tuşlanır.' },
  { id: 'http', name: 'HTTP API', icon: 'globe', desc: 'REST API üzerinden provizyon isteği.' },
];

export default function PosIntegrationScreen({
  settings,
  onPatch,
  sales,
  toast,
}: {
  settings: Settings;
  onPatch: (p: Partial<Settings>) => void;
  sales: Sale[];
  toast: Toast;
}) {
  const pos = settings.pos;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);

  // POS Entegrasyonu lisans kilidi — anahtar KODDA YOKTUR; masaüstü userData'da tutulur.
  const [chain, setChain] = useState<{ key: string; codes: number[] } | null>(null);
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return localStorage.getItem('mosbarkod_pos_unlocked') === '1';
    } catch {
      return false;
    }
  });
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseErr, setLicenseErr] = useState(false);

  useEffect(() => {
    void ensureLicenseChain().then((c) => {
      setChain(c);
      // Dosyada kayıtlı kilit açılışı varsa anında açılır
      if (localStorage.getItem('mosbarkod_pos_unlocked') === '1') setUnlocked(true);
    });
  }, []);

  const activateLicense = () => {
    if (!chain) return;
    if (licenseInput.trim().toUpperCase() === chain.key.toUpperCase()) {
      try {
        // Anahtarı kalıcı olarak da sakla (eski davranışla birebir aynı)
        localStorage.setItem('mosbarkod_pos_license', chain.key);
        localStorage.setItem('mosbarkod_pos_unlocked', '1');
        window.mosStore?.set('mosbarkod_pos_unlocked', true);
      } catch {
        /* yoksay */
      }
      setUnlocked(true);
      setLicenseErr(false);
      toast('POS Entegrasyonu lisansı etkinleştirildi');
    } else {
      setLicenseErr(true);
      setLicenseInput('');
      toast('Geçersiz lisans anahtarı', 'err');
    }
  };

  const setPos = (patch: Partial<Settings['pos']>) => onPatch({ pos: { ...pos, ...patch } });

  const brand = brandForCountry(pos.country, pos.brand);
  const conn = CONN_TYPES.find((c) => c.id === pos.connectionType) ?? CONN_TYPES[0];
  const country = countryById(pos.country);

  // Marka seçilince önerilen bağlantı ayarlarını otomatik uygula
  const applyBrandDefaults = (b: PosBrand | undefined): Partial<Settings['pos']> => {
    const patch: Partial<Settings['pos']> = {};
    if (!b) return patch;
    patch.connectionType = b.defaultConn;
    if (b.defaultPort) {
      if (b.defaultConn === 'tcp') patch.tcpPort = b.defaultPort;
      if (b.defaultConn === 'mobile') patch.mobilePort = b.defaultPort;
    }
    if (b.defaultEncoding) patch.encoding = b.defaultEncoding;
    return patch;
  };

  // Marka listesi: ülke seçiliyse o ülke; değilse tümü (eski kayıtlarla uyumlu)
  const brandGroups = useMemo(() => {
    const source = pos.country ? brandsForCountry(pos.country) : POS_BRANDS;
    const map = new Map<string, PosBrand[]>();
    for (const b of source) {
      const arr = map.get(b.country) ?? [];
      arr.push(b);
      map.set(b.country, arr);
    }
    return Array.from(map.entries()).map(([cid, list]) => ({ country: countryById(cid), list }));
  }, [pos.country]);

  const provSales = sales.filter((s) => s.posAuth).slice(0, 12);

  const testConn = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      if (!pos.country) {
        setTestResult({ ok: false, msg: 'Önce ülke/bölge seçin.' });
        toast('Test başarısız: bölge seçilmedi', 'err');
        return;
      }
      if (!pos.brand) {
        setTestResult({ ok: false, msg: 'Önce marka/model seçin.' });
        toast('Test başarısız: marka seçilmedi', 'err');
        return;
      }
      if (pos.connectionType === 'tcp' && !pos.tcpIp) {
        setTestResult({ ok: false, msg: 'TCP/IP seçili ancak IP adresi boş.' });
        toast('Test başarısız: IP adresi girin', 'err');
        return;
      }
      if (pos.connectionType === 'mobile' && !pos.mobileIp) {
        setTestResult({ ok: false, msg: 'Mobil POS seçili ancak statik IP boş.' });
        toast('Test başarısız: statik IP girin', 'err');
        return;
      }
      setTestResult({ ok: true, msg: `Bağlantı başarılı — ${brand?.name ?? 'POS'} ${pos.model || ''} yanıt verdi (simülasyon).` });
      toast('POS bağlantı testi başarılı');
    }, 1200);
  };

  // Zincir arka planda yüklensin — hiçbir bilgi ekranı yok, eski kilit aynen çalışır
  if (!chain) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <span className="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-amber border-t-transparent" />
          <p className="font-mono text-[11px] text-mut2">Lisans kontrol ediliyor…</p>
        </div>
      </div>
    );
  }

  // Lisans kilidi — eski açıcı pencere (anahtar dosyadan karşılaştırmalı)
  if (!unlocked) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-4">
        <section className="anim-pop w-full max-w-[380px] rounded-2xl border border-amber/30 bg-gradient-to-b from-[#161511] via-[#0d1424] to-[#090d1b] p-5 text-center shadow-2xl">
          <div className="amber-license-glow mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber/50 bg-ink/90 text-amber2">
            <Ic n="lock" c="h-8 w-8" />
          </div>
          <div className="mt-4 font-mono text-[15px] font-bold tracking-[0.14em] text-amber2">MOSBARKODYAZILIM</div>
          <div className="mt-1 text-[11px] text-mut2">POS Entegrasyonu — Lisans Anahtarı Gerekli</div>

          <div className="mt-5 text-left">
            <label className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-widest text-mut">
              8 Haneli Lisans Anahtarı
            </label>
            <input
              value={licenseInput}
              onChange={(e) => {
                setLicenseInput(e.target.value.replace(/\D/g, '').slice(0, 8));
                setLicenseErr(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && activateLicense()}
              placeholder="••••••••"
              inputMode="numeric"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              className={cn(
                'w-full rounded-lg border bg-ink/80 px-3 py-3 text-center font-mono text-[20px] font-bold tracking-[0.4em] text-amber2 outline-none transition-colors placeholder:tracking-[0.3em] placeholder:text-mut2/60',
                licenseErr ? 'border-red/70' : 'border-amber/40 focus:border-amber'
              )}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-[9px] text-mut2">{licenseInput.length} / 8 hane</span>
              {licenseErr && <span className="font-mono text-[9px] font-bold text-red">Geçersiz lisans anahtarı</span>}
            </div>
          </div>

          <button
            onClick={activateLicense}
            disabled={licenseInput.length !== 8}
            className={cn(
              'mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-bold transition-all',
              licenseInput.length === 8 ? 'bg-amber text-[#1a1102] hover:brightness-110' : 'cursor-not-allowed bg-panel3 text-mut2'
            )}
          >
            <Ic n="lock" c="h-4 w-4" /> KİLİDİ AÇ
          </button>

          <div className="mt-4 rounded-lg border border-amber/30 bg-amber/10 p-3 space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber2">
              <Ic n="mail" c="h-4 w-4" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest">Lisans Anahtarı & Destek</span>
            </div>
            <div>
              <a
                href="mailto:m.ortayayla@gmail.com"
                className="block text-center font-mono text-[15px] font-extrabold tracking-[0.06em] text-amber2 transition-colors hover:text-amber hover:underline"
              >
                m.ortayayla@gmail.com
              </a>
            </div>
            <div className="text-center text-[9.5px] text-mut2">Lisans anahtarı ve destek için e-posta gönderiniz</div>
          </div>

          <p className="mt-3 text-[9px] italic leading-relaxed text-mut2">
            Bu bölüm yalnızca yetkili lisans anahtarı ile açılır. Anahtar bir kez girildikten sonra tekrar istenmez.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg border border-blue/40 bg-blue/10 p-2 text-blue">
            <Ic n="card" c="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-mono text-[16px] font-bold tracking-wide">POS Entegrasyonu</h2>
            <p className="max-w-[560px] text-[11.5px] leading-relaxed text-mut2">
              Tam entegre modda satış tutarı doğrudan POS cihazına gönderilir, provizyon onayı beklenir.
              Mod kapalıyken program yarı entegre (manuel tutar girişli) çalışır.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-mut">Tam Entegre Mod</span>
          <button
            role="switch"
            aria-checked={pos.enabled}
            onClick={() => {
              setPos({ enabled: !pos.enabled });
              toast(pos.enabled ? 'POS entegrasyonu kapatıldı — yarı entegre moda dönüldü' : 'POS entegrasyonu açıldı — tam entegre mod aktif');
            }}
            className={cn('relative h-6 w-11 rounded-full border transition-colors', pos.enabled ? 'border-transparent bg-mint' : 'border-line2 bg-ink')}
          >
            <span className={cn('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all', pos.enabled ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>
      </div>

      {/* Durum şeridi */}
      <div className={cn('mb-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5', pos.enabled ? 'border-mint/30 bg-mint/5' : 'border-line bg-panel')}>
        <span className={cn('h-2.5 w-2.5 rounded-full', pos.enabled ? 'blink-dot bg-mint' : 'bg-mut2')} />
        <span className="font-mono text-[12px] font-semibold">
          {pos.enabled ? 'TAM ENTEGRE — provizyon otomatik' : 'YARI ENTEGRE — manuel tutar girişi'}
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-mut2">
          {brand ? `${brand.name} ${pos.model || ''}` : 'Cihaz seçilmedi'} · {conn.name}
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        {/* Sol: cihaz + bağlantı */}
        <div className="space-y-3">
          <section className="rounded-xl border border-line bg-panel p-4">
            {/* ADIM 1 — Ülke */}
            <h3 className="mb-2 flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber/15 font-mono text-[11px] text-amber2">1</span>
              Ülke / Bölge Seçin
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {POS_COUNTRIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setPos({ country: c.id, brand: '', model: '' });
                    toast(`Bölge seçildi: ${c.name} — marka listesi bu bölgeye göre güncellendi`);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors',
                    pos.country === c.id ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut hover:border-line hover:text-txt'
                  )}
                >
                  <Flag code={c.id} className="h-3.5 w-[18px]" />
                  <span className="font-mono text-[11px] font-semibold">{c.name}</span>
                </button>
              ))}
            </div>
            {country && (
              <div className="mt-2 rounded-lg border border-line bg-ink/40 px-3 py-2 text-[10.5px] leading-relaxed text-mut2">
                <b className="text-amber2">{country.name}:</b> {country.tip}
              </div>
            )}

            {/* ADIM 2 — Marka & Model */}
            <h3 className="mb-2 mt-4 flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber/15 font-mono text-[11px] text-amber2">2</span>
              Marka &amp; Model
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Marka">
                <Sel
                  value={pos.brand}
                  onChange={(e) => {
                    const bid = e.target.value;
                    const b = brandForCountry(pos.country, bid);
                    setPos({ brand: bid, model: '', ...applyBrandDefaults(b) });
                    if (b) toast(`"${b.name}" seçildi — önerilen bağlantı ayarları uygulandı`);
                  }}
                >
                  <option value="">-- Marka Seçin --</option>
                  {brandGroups.map((g) => (
                    <optgroup key={g.country?.id ?? 'x'} label={g.country?.name ?? ''}>
                      {g.list.map((b) => (
                        <option key={`${g.country?.id}-${b.id}`} value={b.id}>{b.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </Sel>
              </Field>
              <Field label="Model">
                <Sel value={pos.model} onChange={(e) => setPos({ model: e.target.value })} disabled={!brand}>
                  <option value="">-- Model Seçin --</option>
                  {(brand?.models ?? []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Sel>
              </Field>
            </div>
            {brand?.tip && (
              <div className="mt-2 rounded-lg border border-blue/30 bg-blue/5 px-3 py-2 text-[10.5px] leading-relaxed text-mut2">
                <b className="text-blue">Kurulum ipucu:</b> {brand.tip}
              </div>
            )}

            <div className="mt-3">
              <span className="mb-1.5 flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber/15 font-mono text-[11px] text-amber2">3</span>
                Bağlantı Yöntemi
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {CONN_TYPES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setPos({ connectionType: c.id })}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors',
                      pos.connectionType === c.id ? 'border-blue bg-blue/10' : 'border-line2 bg-ink/40 hover:border-line'
                    )}
                  >
                    <Ic n={c.icon} c={cn('mt-0.5 h-4 w-4 shrink-0', pos.connectionType === c.id ? 'text-blue' : 'text-mut2')} />
                    <span className="min-w-0">
                      <span className={cn('block text-[12px] font-semibold', pos.connectionType === c.id ? 'text-blue' : 'text-txt')}>{c.name}</span>
                      <span className="block text-[10px] leading-snug text-mut2">{c.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bağlantıya özel alanlar */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {pos.connectionType === 'tcp' && (
                <>
                  <Field label="Statik IP Adresi">
                    <Inp value={pos.tcpIp ?? ''} onChange={(e) => setPos({ tcpIp: e.target.value })} placeholder="192.168.1.50" className="font-mono" />
                  </Field>
                  <Field label="Port">
                    <Inp type="number" value={String(pos.tcpPort ?? 2030)} onChange={(e) => setPos({ tcpPort: Number(e.target.value) || 0 })} className="font-mono" />
                  </Field>
                </>
              )}
              {pos.connectionType === 'mobile' && (
                <>
                  <Field label="Statik IP (Mobil POS)">
                    <Inp value={pos.mobileIp ?? ''} onChange={(e) => setPos({ mobileIp: e.target.value })} placeholder="10.0.0.25" className="font-mono" />
                  </Field>
                  <Field label="Port">
                    <Inp type="number" value={String(pos.mobilePort ?? 2030)} onChange={(e) => setPos({ mobilePort: Number(e.target.value) || 0 })} className="font-mono" />
                  </Field>
                  <Field label="APN">
                    <Inp value={pos.mobileApn ?? ''} onChange={(e) => setPos({ mobileApn: e.target.value })} placeholder="internet" className="font-mono" />
                  </Field>
                </>
              )}
              {pos.connectionType === 'serial' && (
                <>
                  <Field label="Seri Port">
                    <Sel value={pos.serialPort ?? ''} onChange={(e) => setPos({ serialPort: e.target.value })}>
                      <option value="">-- Seçin --</option>
                      {['COM1', 'COM2', 'COM3', 'COM4', '/dev/ttyS0', '/dev/ttyUSB0'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </Sel>
                  </Field>
                  <Field label="Baud Rate">
                    <Sel value={String(pos.serialBaudRate ?? 9600)} onChange={(e) => setPos({ serialBaudRate: Number(e.target.value) })}>
                      {[9600, 19200, 38400, 57600, 115200].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </Sel>
                  </Field>
                  <Field label="Data Bits">
                    <Sel value={String(pos.serialDataBits ?? 8)} onChange={(e) => setPos({ serialDataBits: Number(e.target.value) as 7 | 8 })}>
                      <option value={7}>7</option>
                      <option value={8}>8</option>
                    </Sel>
                  </Field>
                  <Field label="Parity">
                    <Sel value={pos.serialParity ?? 'none'} onChange={(e) => setPos({ serialParity: e.target.value as 'none' | 'even' | 'odd' })}>
                      <option value="none">None</option>
                      <option value="even">Even</option>
                      <option value="odd">Odd</option>
                    </Sel>
                  </Field>
                  <Field label="Stop Bits">
                    <Sel value={String(pos.serialStopBits ?? 1)} onChange={(e) => setPos({ serialStopBits: Number(e.target.value) as 1 | 2 })}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </Sel>
                  </Field>
                </>
              )}
              {pos.connectionType === 'http' && (
                <>
                  <Field label="API Endpoint">
                    <Inp value={pos.httpEndpoint ?? ''} onChange={(e) => setPos({ httpEndpoint: e.target.value })} placeholder="https://pos.api/v1/sale" className="font-mono" />
                  </Field>
                  <Field label="API Anahtarı">
                    <Inp value={pos.httpApiKey ?? ''} onChange={(e) => setPos({ httpApiKey: e.target.value })} placeholder="API key" className="font-mono" />
                  </Field>
                </>
              )}
              {pos.connectionType === 'usb' && (
                <div className="sm:col-span-2 rounded-lg border border-line bg-ink/40 p-3 text-[11px] leading-relaxed text-mut2">
                  USB Klavye (HID) modunda POS cihazı klavye gibi davranır; provizyon sonucu otomatik tuşlanır.
                  Ek ayar gerekmez.
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Kodlama">
                <Sel value={pos.encoding ?? 'cp857'} onChange={(e) => setPos({ encoding: e.target.value as 'utf8' | 'cp857' | 'cp1254' })}>
                  <option value="cp857">CP857 (Türkçe)</option>
                  <option value="cp1254">CP1254</option>
                  <option value="utf8">UTF-8</option>
                </Sel>
              </Field>
              <ToggleRow label="Fiş Kes" on={pos.cutPaper ?? true} onChange={(v) => setPos({ cutPaper: v })} />
              <ToggleRow label="Bip Sesi" on={pos.beepOnPrint ?? true} onChange={(v) => setPos({ beepOnPrint: v })} />
              <ToggleRow label="Çekmece Aç" on={pos.openDrawer ?? false} onChange={(v) => setPos({ openDrawer: v })} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber/15 font-mono text-[11px] text-amber2">4</span>
                Bağlantı Testi
              </span>
              <Btn v="ghost" className="border-blue/40 text-blue" onClick={testConn} disabled={testing}>
                {testing ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Ic n="card" c="h-4 w-4" />
                )}
                Bağlantıyı Test Et
              </Btn>
              {brand && (
                <button
                  type="button"
                  onClick={() => {
                    setPos(applyBrandDefaults(brand));
                    toast('Önerilen bağlantı ayarları yeniden uygulandı');
                  }}
                  className="rounded-lg border border-mint/40 bg-mint/10 px-2.5 py-2 font-mono text-[11px] font-semibold text-mint transition-colors hover:bg-mint/20"
                >
                  <Ic n="sparkles" c="h-3.5 w-3.5 inline" /> Önerilen ayarları uygula
                </button>
              )}
              {testResult && (
                <span className={cn('font-mono text-[11px] font-semibold', testResult.ok ? 'text-mint' : 'text-red')}>
                  {testResult.msg}
                </span>
              )}
            </div>
          </section>
        </div>

        {/* Sağ: provizyon geçmişi */}
        <div className="space-y-3">
          <section className="rounded-xl border border-line bg-panel">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Ic n="card" c="h-4 w-4 text-blue" />
              <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">Provizyon Geçmişi</h3>
              <span className="ml-auto font-mono text-[10.5px] text-mut2">{provSales.length} kayıt</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="border-b border-line bg-ink/30">
                  <tr>
                    <Th>Tarih</Th>
                    <Th>Fiş</Th>
                    <Th className="text-right">Tutar</Th>
                    <Th>Provizyon</Th>
                  </tr>
                </thead>
                <tbody>
                  {provSales.map((s) => (
                    <tr key={s.id} className="border-b border-line/60 last:border-0">
                      <Td className="font-mono text-[10.5px] text-mut">{dstr(s.date)} {tstr(s.date)}</Td>
                      <Td className="font-mono text-[10.5px] text-amber2">{s.no}</Td>
                      <Td className="text-right font-mono font-bold tabular-nums text-mint">{fmt(s.total)}</Td>
                      <Td className="font-mono text-[10px] text-mut2">{s.posAuth}</Td>
                    </tr>
                  ))}
                  {provSales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center font-mono text-[11px] text-mut2">
                        Henüz provizyon kaydı yok. Tam entegre modda yapılan kart satışları burada listelenir.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-panel p-4">
            <h3 className="mb-2 font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">Nasıl Çalışır?</h3>
            <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-mut">
              <li>Önce <b className="text-mut">ülke/bölgeyi</b> seçin — marka listesi o bölgenin yaygın cihazlarına göre filtrelenir.</li>
              <li>Marka seçtiğinizde önerilen bağlantı türü, port ve kodlama otomatik uygulanır.</li>
              <li>Tam Entegre Mod'u açın ve Bağlantıyı Test Et ile bağlantıyı doğrulayın.</li>
              <li>Hızlı Satış'ta kart/nakit+POS ödemesi seçildiğinde tutar cihaza gider, provizyon onayı beklenir.</li>
              <li>Onay gelince satış tamamlanır, provizyon kodu satışa işlenir; mod kapatılırsa yarı entegre (manuel) moda döner.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2">
      <span className="text-[11px] font-semibold text-mut">{label}</span>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn('relative h-5 w-9 rounded-full border transition-colors', on ? 'border-transparent bg-mint' : 'border-line2 bg-ink')}
      >
        <span className={cn('absolute top-0.5 h-[14px] w-[14px] rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </div>
  );
}
