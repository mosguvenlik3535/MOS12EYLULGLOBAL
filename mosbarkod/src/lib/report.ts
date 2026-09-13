import { fmt, isToday, round2, type AppState } from '../data';
import { APP_VERSION } from './buildMode';

export function buildReport(s: AppState, itemIds?: string[]): string {
  const sel = itemIds ?? [];
  const has = (id: string) => sel.includes(id);
  const todaySales = s.sales.filter((x) => isToday(x.date));
  const ciro = round2(todaySales.reduce((a, x) => a + x.total, 0));
  const costMap = new Map(s.products.map((p) => [p.name.toLowerCase(), p.cost || 0]));
  const costToday = round2(
    todaySales.reduce(
      (a, x) => a + (x.isRefund ? -1 : 1) * x.items.reduce((b, it) => b + it.qty * (costMap.get(it.name.toLowerCase()) ?? 0), 0),
      0
    )
  );
  const brutKar = round2(ciro - costToday);
  const masrafBugun = s.expenses.filter((e) => isToday(e.date));
  const masrafToplam = round2(masrafBugun.reduce((a, e) => a + e.amount, 0));
  const posPara = round2(
    todaySales.reduce((a, x) => a + (x.pos || 0), 0) +
      s.posCloses.filter((p) => isToday(p.date)).reduce((a, p) => a + p.amount, 0)
  );
  const nakitSatis = round2(todaySales.reduce((a, x) => a + x.cash, 0));
  // Ulaşım Kartı dolum/depozito hareketleri ve kârı genel kasa/net kâra dahil edilmez — yalnızca Ulaşım Kartı sekmesinde izlenir.
  const imDolum = round2(
    s.imkart.txns.filter((t) => t.type === 'dolum' && isToday(t.date)).reduce((a, t) => a + t.amount, 0)
  );
  const netKar = round2(brutKar - masrafToplam);
  const imDepozito = round2(
    s.imkart.txns.filter((t) => t.type === 'depozito' && isToday(t.date)).reduce((a, t) => a + t.amount, 0)
  );
  const kasaNakit = round2(s.settings.openingCash + nakitSatis - masrafToplam);
  const gunlukVeresiye = round2(
    todaySales.filter((x) => x.method === 'veresiye').reduce((a, x) => a + x.total, 0)
  );
  const veresiyeBakiye = round2(s.customers.reduce((a, c) => a + c.balance, 0));
  const bugunFaturalar = s.invoices.filter((i) => isToday(i.date));
  const alisToplam = round2(bugunFaturalar.reduce((a, i) => a + i.total, 0));
  const kahveNames = new Set(
    s.products.filter((p) => p.category === 'Kahve & Çay').map((p) => p.name.toLowerCase())
  );
  const kahveSatis = round2(
    todaySales.reduce(
      (a, x) => a + x.items.reduce((b, it) => b + (kahveNames.has(it.name.toLowerCase()) ? it.qty * it.unitPrice : 0), 0),
      0
    )
  );
  const qtyMap = new Map<string, number>();
  for (const x of todaySales) for (const it of x.items) qtyMap.set(it.name, (qtyMap.get(it.name) ?? 0) + it.qty);
  const top5 = [...qtyMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catMap = new Map<string, number>();
  for (const e of masrafBugun) catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);

  const L: string[] = [];
  if (has('ciro')) L.push(`» Toplam Satış Ciro: ${fmt(ciro)}`);
  if (has('brutKar')) L.push(`» Brüt Kâr: ${fmt(brutKar)}`);
  if (has('netKar')) L.push(`» Net Kâr: ${fmt(netKar)}`);
  if (has('kasaNakit')) L.push(`» Kasadaki Nakit: ${fmt(kasaNakit)}`);
  if (has('posPara')) L.push(`» POS Tahsilat: ${fmt(posPara)}`);
  if (has('gunlukVeresiye')) L.push(`» Günlük Veresiye Satış: ${fmt(gunlukVeresiye)}`);
  if (has('veresiyeBakiye')) L.push(`» Toplam Veresiye Bakiyesi: ${fmt(veresiyeBakiye)}`);
  if (has('imkartDolum')) L.push(`» Ulaşım Kartı Dolum: ${fmt(imDolum)}`);
  if (has('imkartSatis')) L.push(`» Ulaşım Kartı Limit Satın Alımı: ${fmt(imDepozito)}`);
  if (has('masrafToplam')) L.push(`» Günlük Masraf Toplamı: ${fmt(masrafToplam)}`);
  if (has('masrafKalemleri')) {
    if (catMap.size) {
      L.push('» Masraf Kalemleri:');
      for (const [c, v] of catMap) L.push(`   • ${c}: ${fmt(v)}`);
    } else L.push('» Masraf Kalemleri: Bugün kayıt yok');
  }
  if (has('alisFatura')) L.push(`» Günlük Alış Fatura Toplamı: ${fmt(alisToplam)}`);
  if (has('stokEkleme')) {
    const parts = bugunFaturalar.flatMap((i) => i.lines.map((l) => `${l.qty}x ${l.name}`));
    L.push(`» Stoğa Eklenen: ${parts.length ? parts.join(', ') : 'Bugün giriş yok'}`);
  }
  if (has('kahveSatis')) L.push(`» Kahve & Çay Satışları: ${fmt(kahveSatis)}`);
  if (has('fisAdedi')) L.push(`» Fiş Adedi: ${todaySales.length}`);
  if (has('enCokSatilan')) {
    L.push(
      `» En Çok Satanlar: ${
        top5.length ? top5.map(([n, q], i) => `${i + 1}) ${n} (${q})`).join(', ') : 'Bugün satış yok'
      }`
    );
  }

  const date = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  return [
    `*GÜN SONU RAPORU*`,
    `${date} • ${s.settings.storeName}`,
    '────────────────────',
    ...L,
    '────────────────────',
    `Otomatik rapor — MOSBARKOD v${APP_VERSION}`,
  ].join('\n');
}

export function waLink(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = '9' + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
