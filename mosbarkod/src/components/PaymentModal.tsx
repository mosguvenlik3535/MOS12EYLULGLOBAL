import { useEffect, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Inp, Modal, Sel } from './ui';
import {
  dstr,
  fmt,
  METHOD_META,
  fromTRY,
  round2,
  toTRY,
  tstr,
  type Customer,
  type PayMethod,
  type Sale,
  type Settings,
} from '../data';
import { printSale } from '../lib/printReceipt';
import { buildReceiptText } from '../lib/share';

export interface PayPayload {
  method: PayMethod;
  received: number;
  change: number;
  cash: number;
  pos: number;
  customerId?: string;
  newCustomerName?: string;
  /** Satışa işlenecek müşteri adı / açıklama (tüm ödeme türlerinde) */
  customerName?: string;
  receiptOpt: 'bilgi' | 'mali' | 'print' | 'whatsapp';
}

const QUICK = [5, 10, 20, 50, 100, 200, 500];

export function PaymentModal({
  total,
  customers,
  onClose,
  onConfirm,
}: {
  total: number;
  customers: Customer[];
  onClose: () => void;
  onConfirm: (p: PayPayload) => void;
}) {
  const [method, setMethod] = useState<PayMethod>('nakit');
  const [received, setReceived] = useState(fromTRY(total).toFixed(2));
  const [cash, setCash] = useState('');
  const [pos, setPos] = useState('');
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  /* Satışa işlenecek müşteri adı / açıklama */
  const [saleName, setSaleName] = useState('');
  const [opt, setOpt] = useState<'bilgi' | 'mali' | 'print' | 'whatsapp'>('bilgi');

  /* Veresiyede seçilen/yazılan müşteri, satış adı alanına da yansır. */
  useEffect(() => {
    if (method !== 'veresiye') return;
    const secili = customers.find((c) => c.id === customerId)?.name ?? '';
    setSaleName(newName.trim() || secili);
  }, [method, customerId, newName, customers]);

  const rec = Number(received.replace(',', '.')) || 0;
  const csh = Number(cash.replace(',', '.')) || 0;
  const ps = Number(pos.replace(',', '.')) || 0;

  let valid = true;
  let change = 0;
  const totalD = fromTRY(total);
  if (method === 'nakit') {
    valid = rec >= totalD - 1e-9;
    change = toTRY(round2(rec - totalD));
  } else if (method === 'nakit+pos') {
    valid = csh + ps >= totalD - 1e-9 && csh >= 0 && ps >= 0;
    change = 0;
  } else if (method === 'kart') {
    valid = true;
  } else {
    valid = Boolean(customerId || newName.trim());
  }

  const confirm = () => {
    if (!valid) return;
    onConfirm({
      method,
      received: method === 'nakit' ? toTRY(rec) : method === 'nakit+pos' ? toTRY(round2(csh + ps)) : total,
      change,
      cash: method === 'nakit' ? total : method === 'nakit+pos' ? toTRY(csh) : 0,
      pos: method === 'kart' ? total : method === 'nakit+pos' ? toTRY(ps) : 0,
      customerId: method === 'veresiye' && !newName.trim() ? customerId || undefined : undefined,
      newCustomerName: method === 'veresiye' ? newName.trim() || undefined : undefined,
      customerName: saleName.trim() || undefined,
      receiptOpt: opt,
    });
  };

  const methodBtn = (m: PayMethod, label: string, icon: string) => (
    <button
      key={m}
      onClick={() => setMethod(m)}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg border px-2 py-2.5 text-[12px] font-semibold transition-all',
        method === m
          ? 'border-amber bg-amber/15 text-amber2'
          : 'border-line2 bg-ink/40 text-mut hover:text-txt'
      )}
    >
      <Ic n={icon} c="h-4 w-4" /> {label}
    </button>
  );

  return (
    <Modal
      title="Satış Kapatma / Ödeme Al"
      icon={<Ic n="card" c="h-4.5 w-4.5" />}
      onClose={onClose}
      w="max-w-xl"
      footer={
        <>
          <Btn v="ghost" onClick={onClose} className="flex-1">
            Geri Dön
          </Btn>
          <Btn v="mint" onClick={confirm} disabled={!valid} className="flex-1 gap-2">
            <Ic n="check" c="h-4 w-4" /> Satışı Onayla
          </Btn>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-widest text-mut">Toplam Tutar</div>
        <div className="rounded-lg border border-mint/30 bg-mint/10 px-3 py-1.5 font-mono text-lg font-bold text-mint tabular-nums">
          {fmt(total)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {methodBtn('nakit', 'Nakit', 'banknote')}
        {methodBtn('kart', 'Kredi Kartı', 'card')}
        {methodBtn('nakit+pos', 'Nakit + POS', 'wallet')}
        {methodBtn('veresiye', 'Veresiye', 'scale')}
      </div>

      {/* Müşteri adı / açıklama — satış hareketlerinde görünür, sonradan da eklenebilir */}
      <div className="mt-3">
        <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wider text-mut">
          Müşteri Adı / Açıklama <span className="normal-case text-mut2">(isteğe bağlı)</span>
        </label>
        <input
          list="mos-musteri-listesi"
          value={saleName}
          onChange={(e) => setSaleName(e.target.value)}
          placeholder="Örn. Ahmet Yılmaz"
          autoComplete="off"
          title="Müşteri adını yazın veya listeden seçin"
          className="w-full rounded-lg border border-line2 bg-ink/70 px-3.5 py-2.5 font-mono text-[13px] font-semibold outline-none placeholder:font-normal placeholder:text-mut2/60 focus:border-amber/70"
        />
        <datalist id="mos-musteri-listesi">
          {customers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-panel2/60 p-3.5">
        {method === 'nakit' && (
          <div>
            <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-mut">
              Alınan Nakit Tutar (₺):
            </div>
            <input
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-line2 bg-ink/70 px-3.5 py-3 font-mono text-2xl font-bold outline-none focus:border-amber/70"
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => setReceived(String(q))}
                  className="rounded-md border border-line2 bg-panel3 px-2.5 py-1.5 font-mono text-[11.5px] font-semibold text-mut transition-colors hover:border-amber/50 hover:text-amber2"
                >
                  {q} ₺
                </button>
              ))}
              <button
                onClick={() => setReceived(fromTRY(total).toFixed(2))}
                className="rounded-md border border-mint/40 bg-mint/10 px-2.5 py-1.5 font-mono text-[11.5px] font-bold text-mint transition-colors hover:bg-mint/20"
              >
                Tam Tutar
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-ink/50 px-3.5 py-2.5">
              <span className="text-[12px] text-mut">Para Üstü:</span>
              <span
                className={cn(
                  'font-mono text-xl font-bold tabular-nums',
                  rec >= total ? 'text-mint' : 'text-red'
                )}
              >
                {rec >= totalD ? fmt(toTRY(round2(rec - totalD))) : `Eksik: ${fmt(toTRY(round2(totalD - rec)))}`}
              </span>
            </div>
          </div>
        )}

        {method === 'kart' && (
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-blue/30 bg-blue/10 p-2.5 text-blue">
              <Ic n="card" c="h-6 w-6" />
            </div>
            <div>
              <div className="text-[13px] font-semibold">Kart POS cihazında terminalize edilir</div>
              <div className="mt-0.5 font-mono text-[11.5px] text-mut">
                {fmt(total)} — tek çekim, para üstü verilmez
              </div>
            </div>
          </div>
        )}

        {method === 'nakit+pos' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-mut">Nakit (₺)</span>
                <input
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-lg border border-line2 bg-ink/70 px-3 py-2.5 font-mono text-lg font-bold outline-none focus:border-amber/70"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-mut">POS (₺)</span>
                <input
                  value={pos}
                  onChange={(e) => setPos(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-lg border border-line2 bg-ink/70 px-3 py-2.5 font-mono text-lg font-bold outline-none focus:border-amber/70"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setCash(fromTRY(total).toFixed(2))}
                className="rounded-md border border-line2 bg-panel3 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-mut hover:text-amber2"
              >
                Nakit = Tam
              </button>
              <button
                onClick={() => setPos(Math.max(0, round2(totalD - csh)).toFixed(2))}
                className="rounded-md border border-line2 bg-panel3 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-mut hover:text-amber2"
              >
                Kalanı Karta
              </button>
              <span
                className={cn(
                  'ml-auto font-mono text-[12px] font-bold tabular-nums',
                  csh + ps >= total ? 'text-mint' : 'text-red'
                )}
              >
                {csh + ps >= totalD ? `Toplam: ${fmt(toTRY(round2(csh + ps)))}` : `Eksik: ${fmt(toTRY(round2(totalD - csh - ps)))}`}
              </span>
            </div>
          </div>
        )}

        {method === 'veresiye' && (
          <div className="space-y-2.5">
            <div className="flex items-start gap-2 rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-[12px] text-red">
              <Ic n="alert" c="mt-0.5 h-4 w-4 shrink-0" />
              Tutar seçili müşterinin veresiye defterine işlenir.
            </div>
            <Sel value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Müşteri seç…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — bakiye {fmt(c.balance)}
                </option>
              ))}
            </Sel>
            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-line2" />
              <span className="font-mono text-[10px] uppercase text-mut2">veya yeni müşteri</span>
              <span className="h-px flex-1 bg-line2" />
            </div>
            <Inp placeholder="Yeni müşteri adı" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-mut">Fiş Seçenekleri</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {(
            [
              { id: 'bilgi', label: 'Bilgi Fişi', icon: 'file' },
              { id: 'mali', label: 'Mali Değerli Fiş', icon: 'check' },
              { id: 'print', label: 'Yazdır', icon: 'print' },
              { id: 'whatsapp', label: 'WhatsApp', icon: 'phone' },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setOpt(o.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-[10.5px] font-semibold transition-all',
                opt === o.id
                  ? 'border-amber bg-amber/10 text-amber2'
                  : 'border-line2 bg-ink/40 text-mut hover:text-txt'
              )}
            >
              <Ic n={o.icon} c="h-4.5 w-4.5" />
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- receipt ---------------- */

export function ReceiptModal({
  sale,
  opt,
  settings,
  onDone,
}: {
  sale: Sale;
  opt: string;
  settings: Settings;
  onDone: () => void;
}) {
  const [printState, setPrintState] = useState<'idle' | 'printing' | 'done' | 'error'>('idle');
  const [printMsg, setPrintMsg] = useState('');
  const [waState, setWaState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [waMsg, setWaMsg] = useState('');

  /** Fişi düz metin olarak paylaş (WhatsApp / SMS / e-posta — telefon için en kullanışlısı). */
  const sendWhatsApp = async () => {
    setWaState('sending');
    const text = buildReceiptText(sale, settings);
    try {
      const n = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
      if (typeof n.share === 'function') {
        await n.share({ title: `Fiş ${sale.no}`, text });
        setWaState('done');
        setWaMsg('Fiş paylaşıldı (WhatsApp seçebilirsiniz)');
        return;
      }
      await navigator.clipboard.writeText(text);
      setWaState('done');
      setWaMsg('Fiş metni kopyalandı — WhatsApp’a yapıştırıp gönderin');
    } catch (e) {
      const name = (e as { name?: string }).name ?? '';
      if (name === 'AbortError') {
        setWaState('idle');
        return;
      }
      setWaState('error');
      setWaMsg('Paylaşılamadı — fişi elle kopyalayın');
    }
  };

  const doPrint = async () => {
    setPrintState('printing');
    setPrintMsg('');
    const r = await printSale(sale, settings);
    if (r.ok) {
      setPrintState('done');
      setPrintMsg(r.via === 'escpos' ? 'Fiş yazıcıya gönderildi' : 'Sistem yazdırma penceresi açıldı');
    } else {
      setPrintState('error');
      setPrintMsg(r.error || 'Yazdırma başarısız');
    }
  };

  useEffect(() => {
    if (opt === 'print') {
      const t = setTimeout(doPrint, 400);
      return () => clearTimeout(t);
    }
    if (opt === 'whatsapp') {
      const t = setTimeout(() => void sendWhatsApp(), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opt]);

  const m = METHOD_META[sale.method];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDone();
      }}
    >
      <div className="anim-pop flex max-h-[94vh] w-full max-w-[380px] flex-col overflow-hidden rounded-xl border border-line2 bg-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Ic n="check" c="h-4.5 w-4.5 text-mint" />
          <span className="font-mono text-[13px] font-bold">SATIŞ TAMAMLANDI</span>
          <span className="ml-auto font-mono text-[11px] text-mut2">{sale.no}</span>
        </div>
        <div className="overflow-y-auto p-4">
          <div
            id="receipt-area"
            className="mx-auto rounded-md bg-[#f2efe6] px-5 py-4 font-mono text-[11.5px] leading-relaxed text-[#23262c] shadow-lg"
          >
            <div className="text-center">
              <div className="text-[14px] font-extrabold tracking-[0.12em]">{settings.storeName}</div>
              {settings.receiptHeader && (
                <div className="mt-0.5 text-[9px] font-bold tracking-wider">{settings.receiptHeader}</div>
              )}
              <div className="mt-0.5 text-[10px]">{settings.address}</div>
              <div className="text-[10px]">Tel: {settings.phone}</div>
            </div>
            <div className="my-2 border-t border-dashed border-[#9a948a]" />
            <div className="flex justify-between">
              <span>BARKOD FİŞİ</span>
              <span className="font-bold">{sale.no}</span>
            </div>
            <div className="flex justify-between text-[10.5px]">
              <span>
                {dstr(sale.date)} {tstr(sale.date)}
              </span>
              <span>Kasa {sale.register} · {sale.cashier}</span>
            </div>
            {sale.customer && (
              <div className="text-[10.5px]">
                Müşteri: <span className="font-bold">{sale.customer}</span>
              </div>
            )}
            <div className="my-2 border-t border-dashed border-[#9a948a]" />
            {sale.items.map((it, i) => (
              <div key={i} className="mb-1">
                <div className="truncate">{it.name}</div>
                <div className="flex justify-between">
                  <span>
                    {it.qty} {it.unit} x {it.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="font-bold">
                    {(it.qty * it.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
            <div className="my-2 border-t border-dashed border-[#9a948a]" />
            <div className="flex justify-between">
              <span>ARA TOPLAM</span>
              <span>{sale.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </div>
            {sale.discountPct > 0 && (
              <div className="flex justify-between">
                <span>%{sale.discountPct} İSKONTO</span>
                <span>-{sale.discountAmt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-[14px] font-extrabold">
              <span>ÖDENEN</span>
              <span>{sale.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </div>
            <div className="flex justify-between text-[10.5px]">
              <span>YÖNTEM: {m.label.toUpperCase()}</span>
              {sale.received > 0 && (
                <span>ALINAN: {sale.received.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              )}
            </div>
            {sale.change > 0 && (
              <div className="flex justify-between text-[10.5px]">
                <span>PARA ÜSTÜ</span>
                <span>{sale.change.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
              </div>
            )}
            <div className="my-2 border-t border-dashed border-[#9a948a]" />
            <div className="text-center text-[10px]">{settings.receiptFooter}</div>
            <div className="mt-1 text-center text-[9px] tracking-widest text-[#6b665c]">
              MOSBARKOD V1.5 · X100 UYUMLU
            </div>
          </div>
        </div>
        <div className="border-t border-line p-3">
          {printState !== 'idle' && (
            <div
              className={cn(
                'mb-2 rounded-md px-3 py-1.5 font-mono text-[11px]',
                printState === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-mint/10 text-mint'
              )}
            >
              {printState === 'printing' ? 'Yazdırılıyor...' : printMsg}
            </div>
          )}
          {waState !== 'idle' && (
            <div
              className={cn(
                'mb-2 rounded-md px-3 py-1.5 font-mono text-[11px]',
                waState === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-mint/10 text-mint'
              )}
            >
              {waState === 'sending' ? 'Paylaşılıyor...' : waMsg}
            </div>
          )}
          <div className="flex gap-2">
            <Btn v="ghost" className="flex-1" onClick={() => void sendWhatsApp()} disabled={waState === 'sending'}>
              <Ic n="phone" c="h-4 w-4" /> WhatsApp
            </Btn>
            <Btn v="ghost" className="flex-1" onClick={doPrint} disabled={printState === 'printing'}>
              <Ic n="print" c="h-4 w-4" /> Yazdır
            </Btn>
            <Btn v="mint" className="flex-1 gap-2" onClick={onDone}>
              Yeni Satış <Ic n="arrowR" c="h-4 w-4" />
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
