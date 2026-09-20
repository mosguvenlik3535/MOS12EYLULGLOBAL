import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn } from './ui';
import { fmt, type Settings } from '../data';

/**
 * TAM ENTEGRE POS PROVİZON AKIŞI
 * 1) Tutar POS cihazına gönderilir
 * 2) Kart okutulur / müşteri onayı beklenir
 * 3) Provizyon onayı alınır → satış tamamlanır
 * Pasif (yarı entegre) modda bu modal hiç açılmaz.
 */

type Stage = 'sending' | 'waiting' | 'approved' | 'declined';

const STAGE_TEXT: Record<Stage, string> = {
  sending: 'Tutar POS cihazına gönderiliyor…',
  waiting: 'Kart okutuluyor / müşteri onayı bekleniyor…',
  approved: 'PROVİZYON ONAYLANDI',
  declined: 'İŞLEM REDDEDİLDİ',
};

export default function PosAuthModal({
  total,
  settings,
  onApproved,
  onCancel,
}: {
  total: number;
  settings: Settings;
  onApproved: (provCode: string) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<Stage>('sending');
  const [prov, setProv] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pos = settings.pos;
  const deviceLabel = `${pos.brand || 'POS'} ${pos.model || ''}`.trim() || 'POS Cihazı';
  const connLabel =
    pos.connectionType === 'mobile'
      ? `Mobil POS (SIM) · ${pos.mobileIp || 'SIM'}:${pos.mobilePort ?? ''}`
      : pos.connectionType === 'tcp'
        ? `TCP/IP · ${pos.tcpIp || '0.0.0.0'}:${pos.tcpPort ?? ''}`
        : pos.connectionType === 'serial'
          ? `Seri Port · ${pos.serialPort || 'COM1'} @${pos.serialBaudRate ?? 9600}`
          : pos.connectionType === 'usb'
            ? 'USB Klavye (HID)'
            : `HTTP API · ${pos.httpEndpoint || '-'}`;

  useEffect(() => {
    const t1 = setTimeout(() => setStage('waiting'), 1300);
    const t2 = setTimeout(() => {
      setProv(`PROV-${Math.floor(100000 + Math.random() * 900000)}`);
      setStage('approved');
    }, 3400);
    timerRef.current.push(t1, t2);
    return () => timerRef.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (stage !== 'approved') return;
    const t = setTimeout(() => onApproved(prov), 900);
    return () => clearTimeout(t);
  }, [stage, prov, onApproved]);

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="rounded-lg border border-line2 bg-panel3 p-2 text-blue">
            <Ic n="card" c="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[13px] font-bold tracking-wide">POS PROVİZON</div>
            <div className="truncate font-mono text-[10px] text-mut2">{deviceLabel} · {connLabel}</div>
          </div>
          <div className="ml-auto font-mono text-lg font-bold text-mint tabular-nums">{fmt(total)}</div>
        </div>

        {/* Durum ekranı */}
        <div
          className={cn(
            'rounded-xl border p-4 text-center',
            stage === 'approved'
              ? 'border-mint/40 bg-mint/10'
              : stage === 'declined'
                ? 'border-red/40 bg-red/10'
                : 'border-blue/30 bg-blue/5'
          )}
        >
          {stage === 'sending' && (
            <div className="flex flex-col items-center gap-2">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue border-t-transparent" />
              <div className="font-mono text-[12px] font-semibold text-blue">{STAGE_TEXT.sending}</div>
            </div>
          )}
          {stage === 'waiting' && (
            <div className="flex flex-col items-center gap-2">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-blue" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-blue [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-blue [animation-delay:240ms]" />
              </span>
              <div className="font-mono text-[12px] font-semibold text-blue">{STAGE_TEXT.waiting}</div>
              <div className="font-mono text-[10px] text-mut2">Müşteriden kart / temassız onay bekleniyor</div>
            </div>
          )}
          {stage === 'approved' && (
            <div className="flex flex-col items-center gap-1.5">
              <Ic n="check" c="h-8 w-8 text-mint" />
              <div className="font-mono text-[13px] font-bold text-mint">{STAGE_TEXT.approved}</div>
              <div className="font-mono text-[11px] text-mut2">Provizyon: {prov}</div>
            </div>
          )}
          {stage === 'declined' && (
            <div className="flex flex-col items-center gap-1.5">
              <Ic n="x" c="h-8 w-8 text-red" />
              <div className="font-mono text-[13px] font-bold text-red">{STAGE_TEXT.declined}</div>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-line bg-ink/40 p-2.5 font-mono text-[10px] leading-relaxed text-mut2">
          TAM ENTEGRE MOD: Tutar doğrudan POS cihazına gönderildi. Onay alındığında satış otomatik
          tamamlanır ve provizyon kodu satış kaydına işlenir.
        </div>

        <div className="mt-3 flex gap-2">
          {stage === 'approved' ? (
            <Btn v="mint" className="flex-1" onClick={() => onApproved(prov)}>
              <Ic n="check" c="h-4 w-4" /> Satışı Tamamla
            </Btn>
          ) : (
            <Btn v="danger" className="flex-1" onClick={onCancel}>
              <Ic n="x" c="h-4 w-4" /> İşlemi İptal Et
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
