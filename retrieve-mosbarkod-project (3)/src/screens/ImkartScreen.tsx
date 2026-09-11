import { useMemo, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Field, Inp, ScreenHead, Stat, Td, Th } from '../components/ui';
import {
  IMKART_MARGIN,
  dstr,
  fmt,
  isToday,
  round2,
  tstr,
  type Imkart,
  type ImkartTxn,
} from '../data';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

export default function ImkartScreen({
  imkart,
  onDolum,
  onDeposit,
  toast,
}: {
  imkart: Imkart;
  onDolum: (amount: number, via: 'nakit' | 'pos', cardNo: string) => void;
  onDeposit: (amount: number) => void;
  toast: Toast;
}) {
  const [tab, setTab] = useState<'dolum' | 'depozito'>('dolum');
  const [amount, setAmount] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [via, setVia] = useState<'nakit' | 'pos'>('nakit');
  const [depositAmt, setDepositAmt] = useState('');

  const marginPct = round2(IMKART_MARGIN * 100);

  const list: ImkartTxn[] = imkart.txns;

  const stats = useMemo(() => {
    const dolums = list.filter((t) => t.type === 'dolum');
    const deposits = list.filter((t) => t.type === 'depozito');
    const totalDolum = round2(dolums.reduce((a, t) => a + t.amount, 0));
    const totalDeposit = round2(deposits.reduce((a, t) => a + t.amount, 0));
    const todayDolum = round2(dolums.filter((t) => isToday(t.date)).reduce((a, t) => a + t.amount, 0));
    const todayProfit = round2(todayDolum * IMKART_MARGIN);
    const totalProfit = round2(totalDolum * IMKART_MARGIN);
    return { totalDolum, totalDeposit, todayDolum, todayProfit, totalProfit };
  }, [list]);

  const submitDolum = () => {
    const a = Number(amount.replace(',', '.'));
    if (!a || a <= 0) return toast('Geçerli bir tutar girin', 'err');
    if (a > imkart.limit) return toast('Yetersiz dolum limiti', 'err');
    onDolum(a, via, cardNo.trim());
    setAmount('');
    setCardNo('');
  };

  const submitDeposit = () => {
    const a = Number(depositAmt.replace(',', '.'));
    if (!a || a <= 0) return toast('Geçerli bir tutar girin', 'err');
    onDeposit(a);
    setDepositAmt('');
    toast(`${fmt(a)} depozito yatırıldı — dolum limiti artırıldı`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <ScreenHead
        title="Ulaşım Kartı"
        icon="card"
        desc={`Müşteri kart dolumları, banka depozitoları ve %${marginPct} otomatik dolum kâr entegrasyonu`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aktif Dolum Limiti" value={fmt(imkart.limit)} tone="blue" icon={<Ic n="card" c="h-4 w-4" />} sub="Banka depozitosu ile artar" />
        <Stat label="Toplam Dolum" value={fmt(stats.totalDolum)} tone="mint" icon={<Ic n="trend" c="h-4 w-4" />} sub={`Bugün: ${fmt(stats.todayDolum)}`} />
        <Stat
          label={`Toplam Kâr (%${marginPct})`}
          value={fmt(stats.totalProfit)}
          tone="amber"
          icon={<Ic n="sparkles" c="h-4 w-4" />}
          sub={`Bugün: ${fmt(stats.todayProfit)} · Net kâra otomatik eklenir`}
        />
        <Stat label="Toplam Depozito" value={fmt(stats.totalDeposit)} icon={<Ic n="banknote" c="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[420px_1fr]">
        <section className="rounded-xl border border-line bg-panel p-4">
          <div className="mb-3 flex gap-1 rounded-lg border border-line2 bg-ink/40 p-1">
            <button
              onClick={() => setTab('dolum')}
              className={cn('flex-1 rounded-md px-3 py-2 text-[12.5px] font-semibold transition-colors', tab === 'dolum' ? 'bg-blue text-[#04121f]' : 'text-mut hover:text-txt')}
            >
              Kart Dolum
            </button>
            <button
              onClick={() => setTab('depozito')}
              className={cn('flex-1 rounded-md px-3 py-2 text-[12.5px] font-semibold transition-colors', tab === 'depozito' ? 'bg-blue text-[#04121f]' : 'text-mut hover:text-txt')}
            >
              Banka Depozitosu
            </button>
          </div>

          {tab === 'dolum' ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-blue/25 bg-blue/5 px-3 py-2 text-[11.5px] text-mut">
                Kalan dolum limitiniz: <span className="font-bold text-blue">{fmt(imkart.limit)}</span>
              </div>
              <Field label="Kart No (Opsiyonel)">
                <Inp value={cardNo} onChange={(e) => setCardNo(e.target.value)} placeholder="Örn: 01234567890" className="font-mono" />
              </Field>
              <Field label="Dolum Tutarı (₺) *">
                <Inp type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="text-center font-mono text-lg font-bold" />
              </Field>
              <div>
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Ödeme Türü</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['nakit', 'pos'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setVia(m)}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-[12.5px] font-bold transition-colors',
                        via === m ? 'border-blue bg-blue text-[#04121f]' : 'border-line2 bg-ink/40 text-mut hover:text-txt'
                      )}
                    >
                      {m === 'nakit' ? 'Nakit' : 'POS'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-mint/25 bg-mint/5 px-3 py-2 text-[11.5px] text-mut">
                Bu dolumdan bekleyen kâr:{' '}
                <span className="font-bold text-mint">
                  {fmt(round2((Number(amount.replace(',', '.')) || 0) * IMKART_MARGIN))}
                </span>{' '}
                <span className="text-mut2">(otomatik net kâra eklenir)</span>
              </div>
              <Btn v="mint" className="w-full" onClick={submitDolum}>
                <Ic n="check" c="h-4 w-4" /> Dolumu Onayla
              </Btn>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11.5px] leading-relaxed text-mut2">
                Bankaya yatırdığınız depozito tutarını buraya girin. Aktif dolum limitiniz artar; müşterilere bu limit
                kadar dolum satabilirsiniz.
              </p>
              <Field label="Depozito Tutarı (₺) *">
                <Inp type="number" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="0,00" className="text-center font-mono text-lg font-bold" />
              </Field>
              <Btn v="ghost" className="w-full border-blue/50 bg-blue/10 text-blue hover:bg-blue/20" onClick={submitDeposit}>
                <Ic n="check" c="h-4 w-4" /> Depozitoyu Kaydet
              </Btn>
            </div>
          )}
        </section>

        <section className="overflow-x-auto rounded-xl border border-line bg-panel">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Ic n="clock" c="h-4 w-4 text-mut" />
            <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">Hareket Geçmişi</h3>
            <span className="ml-auto font-mono text-[10.5px] text-mut2">{list.length} işlem</span>
          </div>
          <table className="w-full min-w-[620px] border-collapse">
            <thead className="border-b border-line bg-panel2/40">
              <tr>
                <Th>Tarih</Th>
                <Th>İşlem</Th>
                <Th>Yöntem</Th>
                <Th>Açıklama</Th>
                <Th className="text-right">Tutar</Th>
                <Th className="text-right">Kâr</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const profit = t.type === 'dolum' ? round2(t.amount * IMKART_MARGIN) : 0;
                return (
                  <tr key={t.id} className="border-b border-line/60 last:border-0 hover:bg-panel2/50">
                    <Td className="font-mono text-[11px] text-mut">{dstr(t.date)} {tstr(t.date)}</Td>
                    <Td>
                      {t.type === 'dolum' ? (
                        <span className="rounded bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold text-mint">Dolum</span>
                      ) : (
                        <span className="rounded bg-blue/15 px-2 py-0.5 font-mono text-[10px] font-bold text-blue">Depozito</span>
                      )}
                    </Td>
                    <Td className="font-mono text-[11px] text-mut">{t.via ? (t.via === 'pos' ? 'POS' : 'Nakit') : '—'}</Td>
                    <Td className="text-[11.5px] text-mut">{t.note || '—'}</Td>
                    <Td className={cn('text-right font-mono font-bold tabular-nums', t.type === 'dolum' ? 'text-mint' : 'text-blue')}>
                      {fmt(t.amount)}
                    </Td>
                    <Td className="text-right font-mono font-bold text-amber2 tabular-nums">
                      {profit > 0 ? fmt(profit) : '—'}
                    </Td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-mono text-[12px] text-mut2">Henüz Ulaşım Kartı hareketi yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
