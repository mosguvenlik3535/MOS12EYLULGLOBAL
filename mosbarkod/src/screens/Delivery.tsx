import { useMemo, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Empty, Field, Inp, ScreenHead, Sel } from '../components/ui';
import { fmt, lineNet, toTRY, uid, type CartLine, type DeliveryOrder, type Product, type Settings, type Staff } from '../data';
import { waLink } from '../lib/report';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

const STEPS: { id: DeliveryOrder['status']; label: string; tone: string }[] = [
  { id: 'yeni', label: 'Yeni', tone: 'text-blue' },
  { id: 'hazirlaniyor', label: 'Hazırlanıyor', tone: 'text-amber2' },
  { id: 'hazir', label: 'Hazır', tone: 'text-mint' },
  { id: 'kurye-yolda', label: 'Kurye Yolda', tone: 'text-[#c084fc]' },
  { id: 'teslim-edildi', label: 'Teslim Edildi', tone: 'text-mint' },
];

function sourceLabel(s: DeliveryOrder['source']) {
  return s === 'telefon' ? 'Telefon' : 'WhatsApp';
}

function nextStatus(s: DeliveryOrder['status']): DeliveryOrder['status'] | null {
  if (s === 'yeni') return 'hazirlaniyor';
  if (s === 'hazirlaniyor') return 'hazir';
  if (s === 'hazir') return 'kurye-yolda';
  return null;
}

export default function DeliveryScreen({
  products,
  deliveries,
  staff,
  settings,
  createOrder,
  updateOrder,
  finalizeOrder,
  toast,
}: {
  products: Product[];
  deliveries: DeliveryOrder[];
  staff: Staff[];
  settings: Settings;
  createOrder: (o: DeliveryOrder) => void;
  updateOrder: (id: string, patch: Partial<DeliveryOrder>) => void;
  finalizeOrder: (id: string) => void;
  toast: Toast;
}) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [courier, setCourier] = useState('');
  const [source, setSource] = useState<DeliveryOrder['source']>('telefon');
  const [payMethod, setPayMethod] = useState<DeliveryOrder['payMethod']>('nakit');
  const [cashPart, setCashPart] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('0');

  const couriers = staff.filter((s) => /kurye|kasiyer|depo|satış/i.test(s.role) || true);

  const list = products.filter((p) =>
    search.trim() === ''
      ? true
      : p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );

  const addItem = (p: Product) => {
    setItems((x) => {
      const idx = x.findIndex((i) => i.productId === p.id);
      if (idx >= 0) {
        const out = [...x];
        out[idx] = { ...out[idx], qty: out[idx].qty + 1 };
        return out;
      }
      return [
        ...x,
        {
          id: uid(),
          productId: p.id,
          name: p.name,
          unit: p.unit,
          unitPrice: p.p1,
          qty: 1,
          level: 'f1',
          mode: 'f1',
          p1: p.p1,
          p2: p.p2,
          p3: p.p3,
          lineDiscount: 0,
        },
      ];
    });
  };

  const setQty = (id: string, d: number) => setItems((x) => x.flatMap((i) => {
    if (i.id !== id) return [i];
    const n = i.qty + d;
    return n > 0 ? [{ ...i, qty: n }] : [];
  }));

  const subtotal = useMemo(() => items.reduce((a, i) => a + lineNet(i), 0), [items]);
  const fee = toTRY(Number(deliveryFee.replace(',', '.')) || 0);
  const total = subtotal + fee;
  const cash = payMethod === 'nakit' ? total : payMethod === 'kart' ? 0 : toTRY(Number(cashPart.replace(',', '.')) || 0);
  const pos = payMethod === 'kart' ? total : payMethod === 'nakit' ? 0 : Math.max(0, total - cash);

  const create = () => {
    if (!customerName.trim() || !phone.trim() || !address.trim() || items.length === 0) {
      toast('Müşteri, telefon, adres ve en az 1 ürün zorunludur', 'err');
      return;
    }
    if (payMethod === 'nakit+pos' && Math.abs(cash + pos - total) > 0.01) {
      toast('Nakit + POS toplamı sipariş tutarını karşılamalı', 'err');
      return;
    }
    createOrder({
      id: uid(),
      no: `PK-${new Date().getFullYear()}-${String(deliveries.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString(),
      source,
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim() || undefined,
      courier: courier || undefined,
      status: 'yeni',
      payMethod,
      cashPart: cash,
      posPart: pos,
      items,
      subtotal,
      discountPct: 0,
      discountAmt: 0,
      deliveryFee: fee,
      total,
      paid: false,
    });
    setItems([]);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setNote('');
    setCourier('');
    setDeliveryFee('0');
    setCashPart('');
    toast('Paket sipariş oluşturuldu');
  };

  const filteredOrders = deliveries.filter((o) => {
    const s = q.trim().toLowerCase();
    return s === '' || o.customerName.toLowerCase().includes(s) || o.phone.includes(s) || o.no.toLowerCase().includes(s);
  });

  const active = deliveries.filter((o) => o.status !== 'teslim-edildi' && o.status !== 'iptal').length;
  const deliveredToday = deliveries.filter((o) => o.status === 'teslim-edildi' && o.deliveredAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const paketCiroToday = deliveries.filter((o) => o.status === 'teslim-edildi' && o.deliveredAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((a, o) => a + o.total, 0);

  return (
    <div className="h-full overflow-y-auto">
      <ScreenHead title="PAKET SİPARİŞ" icon="bag" desc="Telefon ve WhatsApp üzerinden gelen siparişleri hazırlayın, kurye ile gönderin ve teslimatta ödeme alın." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMini label="Aktif Sipariş" value={String(active)} tone="text-amber2" />
        <StatMini label="Hazırlanan" value={String(deliveries.filter((o) => o.status === 'hazirlaniyor' || o.status === 'hazir').length)} tone="text-blue" />
        <StatMini label="Bugün Teslim" value={String(deliveredToday)} tone="text-mint" />
        <StatMini label="Bugünkü Paket Ciro" value={fmt(paketCiroToday)} tone="text-mint" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[420px_1fr]">
        <section className="rounded-xl border border-line bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Ic n="plus" c="h-4 w-4 text-amber" />
            <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">Yeni Paket Sipariş</h3>
          </div>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Sipariş Kaynağı">
                <Sel value={source} onChange={(e) => setSource(e.target.value as DeliveryOrder['source'])}>
                  <option value="telefon">Telefon</option>
                  <option value="whatsapp">WhatsApp</option>
                </Sel>
              </Field>
              <Field label="Ödeme Türü">
                <Sel value={payMethod} onChange={(e) => setPayMethod(e.target.value as DeliveryOrder['payMethod'])}>
                  <option value="nakit">Nakit</option>
                  <option value="kart">Kredi Kartı / POS</option>
                  <option value="nakit+pos">Nakit + POS</option>
                </Sel>
              </Field>
            </div>
            <Field label="Müşteri Adı"><Inp value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ad Soyad" /></Field>
            <Field label="Telefon"><Inp value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" className="font-mono" /></Field>
            <Field label="Adres"><Inp value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mahalle, cadde, bina no, daire" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Kurye">
                <Sel value={courier} onChange={(e) => setCourier(e.target.value)}>
                  <option value="">Kurye seç…</option>
                  {couriers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Sel>
              </Field>
              <Field label="Servis Ücreti (₺)"><Inp type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} /></Field>
            </div>
            {payMethod === 'nakit+pos' && (
              <Field label="Nakit Kısmı (kalan POS'a gider)"><Inp type="number" value={cashPart} onChange={(e) => setCashPart(e.target.value)} /></Field>
            )}
            <Field label="Not"><Inp value={note} onChange={(e) => setNote(e.target.value)} placeholder="Zil çalışmıyor, kapıya bırakma, sipariş notu…" /></Field>

            <div className="rounded-xl border border-line bg-ink/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Ic n="search" c="h-4 w-4 text-mut2" />
                <Inp value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün adı veya barkod ara…" />
              </div>
              <div className="max-h-[180px] space-y-1 overflow-y-auto">
                {list.slice(0, 18).map((p) => (
                  <button key={p.id} onClick={() => addItem(p)} className="flex w-full items-center gap-2 rounded-lg border border-line bg-panel2/50 px-2.5 py-2 text-left transition-colors hover:border-amber/50 hover:bg-panel2">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{p.name}</span>
                    <span className="font-mono text-[11px] text-mint">{fmt(p.p1)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-panel2/50 p-3">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-mut2">Sipariş Kalemleri</div>
              <div className="space-y-1.5">
                {items.length === 0 ? <Empty icon="bag" title="Sepet boş" sub="Soldan ürün ekleyin." /> : items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-lg border border-line bg-ink/40 px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold">{i.name}</div>
                      <div className="font-mono text-[10px] text-mut2">{fmt(i.unitPrice)} / {i.unit}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(i.id, -1)} className="h-6 w-6 rounded border border-line2 text-mut hover:text-amber2">−</button>
                      <span className="w-10 text-center font-mono text-[12px] font-bold">{i.qty}</span>
                      <button onClick={() => setQty(i.id, 1)} className="h-6 w-6 rounded border border-line2 text-mut hover:text-amber2">+</button>
                    </div>
                    <span className="font-mono text-[12px] font-bold text-mint">{fmt(lineNet(i))}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t border-line pt-2 font-mono text-[12px]">
                <div className="flex justify-between"><span className="text-mut">Ara Toplam</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-mut">Servis Ücreti</span><span>{fmt(fee)}</span></div>
                <div className="flex justify-between text-[14px] font-bold"><span className="text-txt">TOPLAM</span><span className="text-mint">{fmt(total)}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Btn v="ghost" onClick={() => phone && window.open(waLink(phone, `Merhaba ${customerName || ''}, ${settings.storeName} paket siparişiniz oluşturuldu. Toplam: ${fmt(total)}.`), '_blank')} disabled={!phone}>
                <Ic n="phone" c="h-4 w-4" /> WhatsApp Özeti
              </Btn>
              <Btn v="primary" onClick={create}><Ic n="check" c="h-4 w-4" /> Siparişi Oluştur</Btn>
            </div>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-panel">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Ic n="bag" c="h-4 w-4 text-amber" />
            <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">Sipariş Akışı</h3>
            <div className="ml-auto w-[240px]"><Inp value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sipariş no, müşteri, telefon ara…" /></div>
          </div>
          <div className="grid h-[calc(100vh-220px)] min-h-[520px] grid-cols-1 gap-3 overflow-x-auto p-3 xl:grid-cols-5">
            {STEPS.map((s) => {
              const col = filteredOrders.filter((o) => o.status === s.id);
              return (
                <div key={s.id} className="flex min-w-[220px] flex-col rounded-xl border border-line bg-ink/30">
                  <div className={cn('border-b border-line px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest', s.tone)}>{s.label} · {col.length}</div>
                  <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                    {col.length === 0 ? <div className="rounded-lg border border-dashed border-line2 px-3 py-6 text-center font-mono text-[10.5px] text-mut2">Kayıt yok</div> : col.map((o) => {
                      const nxt = nextStatus(o.status);
                      return (
                        <div key={o.id} className="rounded-xl border border-line bg-panel2/60 p-3">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold text-amber2">{o.no}</span>
                                <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold', o.source === 'telefon' ? 'bg-blue/10 text-blue' : 'bg-mint/10 text-mint')}>{sourceLabel(o.source)}</span>
                              </div>
                              <div className="mt-1 truncate text-[12px] font-semibold">{o.customerName}</div>
                              <div className="font-mono text-[10px] text-mut2">{o.phone}</div>
                            </div>
                            <span className="font-mono text-[12px] font-bold text-mint">{fmt(o.total)}</span>
                          </div>
                          <div className="mt-2 rounded-lg bg-ink/50 px-2 py-1 text-[10px] leading-relaxed text-mut2">{o.address}</div>
                          {o.courier && <div className="mt-1 text-[10px] text-mut2">Kurye: <span className="font-semibold text-txt">{o.courier}</span></div>}
                          <div className="mt-1 text-[10px] text-mut2">Ödeme: <span className="font-semibold text-txt">{o.payMethod === 'kart' ? 'POS / Kart' : o.payMethod === 'nakit' ? 'Nakit' : 'Nakit + POS'}</span></div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Btn v="ghost" className="px-2 py-1 text-[10.5px]" onClick={() => window.open(waLink(o.phone, `${o.customerName}, sipariş durumunuz: ${s.label}. Toplam: ${fmt(o.total)}`), '_blank')}>
                              <Ic n="phone" c="h-3.5 w-3.5" /> WA
                            </Btn>
                            {nxt && <Btn v="ghost" className="px-2 py-1 text-[10.5px]" onClick={() => updateOrder(o.id, { status: nxt, ...(nxt === 'hazirlaniyor' ? { preparedAt: new Date().toISOString() } : {}), ...(nxt === 'kurye-yolda' ? { sentAt: new Date().toISOString() } : {}) })}><Ic n="arrowR" c="h-3.5 w-3.5" /> {nxt === 'hazirlaniyor' ? 'Hazırlamaya Al' : nxt === 'hazir' ? 'Hazırla' : 'Kuryeye Ver'}</Btn>}
                            {o.status === 'kurye-yolda' && !o.saleId && <Btn v="mint" className="px-2 py-1 text-[10.5px]" onClick={() => finalizeOrder(o.id)}><Ic n="check" c="h-3.5 w-3.5" /> Teslim Et & Ödeme Al</Btn>}
                            {o.status !== 'teslim-edildi' && o.status !== 'iptal' && <Btn v="danger" className="px-2 py-1 text-[10.5px]" onClick={() => updateOrder(o.id, { status: 'iptal' })}><Ic n="x" c="h-3.5 w-3.5" /> İptal</Btn>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatMini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut2">{label}</div>
      <div className={cn('mt-1 font-mono text-xl font-bold leading-none tabular-nums', tone)}>{value}</div>
    </div>
  );
}
