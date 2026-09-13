import { useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Modal } from './ui';
import { fmt, toTRY } from '../data';

export default function ImkartModal({
  limit,
  onClose,
  onConfirm,
}: {
  limit: number;
  onClose: () => void;
  onConfirm: (amount: number, via: 'nakit' | 'pos', cardNo: string) => void;
}) {
  const [cardNo, setCardNo] = useState('');
  const [amount, setAmount] = useState('');
  const [via, setVia] = useState<'nakit' | 'pos'>('nakit');

  const amt = Number(amount.replace(',', '.')) || 0;
  const valid = amt > 0 && amt <= limit;

  return (
    <Modal title="Ulaşım Kartı Bakiye Yükleme" icon={<Ic n="card" c="h-4.5 w-4.5" />} onClose={onClose} w="max-w-md">
      <p className="-mt-1 mb-3 text-[12px] text-mut2">Kart dolum işlemini tamamlayıp ciroya kaydedin.</p>

      <div className="flex items-center justify-between rounded-xl border border-blue/30 bg-blue/8 px-4 py-3">
        <span className="text-[12.5px] text-mut">Aktif Dolum Limitiniz:</span>
        <span className="font-mono text-lg font-bold text-blue tabular-nums">{fmt(limit)}</span>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">
          Ulaşım Kartı No (Opsiyonel)
        </span>
        <input
          value={cardNo}
          onChange={(e) => setCardNo(e.target.value)}
          placeholder="Örn: 01234567890"
          className="w-full rounded-xl border border-line2 bg-ink/70 px-3.5 py-2.5 text-center font-mono text-[14px] tracking-widest outline-none focus:border-blue/70"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Dolum Tutarı (₺) *</span>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-xl border border-line2 bg-ink/70 px-3.5 py-3 text-center font-mono text-2xl font-bold outline-none focus:border-blue/70"
          />
        </div>
        {amt > limit && <span className="mt-1 block text-[11px] font-semibold text-red">Tutar aktif limiti aşıyor.</span>}
      </label>

      <div className="mt-3">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Ödeme Türü *</span>
        <div className="grid grid-cols-2 gap-2">
          {(['nakit', 'pos'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setVia(m)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-[13px] font-bold transition-all',
                via === m ? 'border-blue bg-blue text-[#04121f]' : 'border-line2 bg-ink/40 text-mut hover:text-txt'
              )}
            >
              {m === 'nakit' ? 'Nakit' : 'POS'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-line2 bg-ink/50 px-3 py-3 text-[13px] font-semibold text-txt transition-colors hover:bg-panel3"
        >
          İptal
        </button>
        <button
          onClick={() => valid && onConfirm(toTRY(amt), via, cardNo.trim())}
          disabled={!valid}
          className="rounded-xl bg-blue px-3 py-3 text-[13px] font-bold text-[#04121f] transition-all hover:brightness-110 disabled:pointer-events-none disabled:opacity-40"
        >
          Dolumu Onayla
        </button>
      </div>
    </Modal>
  );
}
