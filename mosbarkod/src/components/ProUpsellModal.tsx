import { useState } from 'react';
import { Ic } from '../icons';
import { Btn, Modal } from './ui';
import { FREE_MAX_PRODUCTS, PRO_PRICE, PRO_PRICE_ANNUAL } from '../lib/buildMode';
import { isPlayBillingAvailable, purchasePro, restorePro } from '../lib/playBilling';

const FEATURES = [
  'Sınırsız ürün ve satış kaydı',
  'Görüntü tanıma ile ürün bulma',
  'Bulut yedekleme (Google Drive / Dropbox)',
  'Tüm raporlar, analizler ve stok zekâsı',
  'Çoklu kasa ve personel yönetimi',
  'Raf etiketi ve barkod yazdırma',
  'Excel ile toplu ürün içe aktarma',
];

export default function ProUpsellModal({
  onClose,
  onActivated,
  toast,
}: {
  onClose: () => void;
  onActivated: () => void;
  toast: (msg: string, type?: 'ok' | 'err') => void;
}) {
  const [busy, setBusy] = useState(false);
  const available = isPlayBillingAvailable();

  const buy = async () => {
    setBusy(true);
    const r = await purchasePro();
    setBusy(false);
    if (r === 'ok') {
      toast('Satın alma başlatıldı — onaylandığında PRO aktif olur');
    } else if (r === 'fail') {
      toast('Satın alma başlatılamadı — Google Play hesabınızı kontrol edin', 'err');
    } else {
      toast('Play Billing bu cihazda kullanılamıyor', 'err');
    }
  };

  const restore = async () => {
    setBusy(true);
    const ok = await restorePro();
    setBusy(false);
    if (ok) {
      toast('Satın alım geri yüklendi — PRO aktif');
      onActivated();
    } else {
      toast('Geri yüklenecek aktif abonelik bulunamadı', 'err');
    }
  };

  return (
    <Modal
      title="MOSBARKOD PRO"
      icon={<Ic n="star" c="h-4.5 w-4.5 text-amber2" />}
      onClose={onClose}
      w="max-w-md"
      footer={
        <>
          <Btn v="ghost" onClick={onClose} disabled={busy}>
            Şimdilik Hayır
          </Btn>
          <Btn v="mint" onClick={buy} disabled={busy || !available} className="gap-2">
            <Ic n="star" c="h-4 w-4" />
            {busy ? 'İşleniyor…' : `PRO'ya Yükselt — ${PRO_PRICE}`}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[12.5px] leading-relaxed text-mut">
          Ücretsiz sürümde <b className="text-txt">{FREE_MAX_PRODUCTS} ürüne</b> kadar kullanabilirsiniz.
          Sınırsız kullanım için PRO'ya yükseltin:
        </p>
        <ul className="grid gap-1.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[12.5px] text-txt">
              <Ic n="check" c="h-4 w-4 shrink-0 text-mint" />
              {f}
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-line bg-panel2/40 px-3 py-2.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-mut">Aylık</span>
            <span className="text-lg font-black text-txt">{PRO_PRICE}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-mut">Yıllık</span>
            <span className="text-[13px] font-bold text-mint">{PRO_PRICE_ANNUAL}</span>
          </div>
        </div>
        {!available && (
          <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-1.5 font-mono text-[10.5px] text-amber2">
            ⚠ Bu cihazda Play Billing algılanmadı — satın alma yalnızca Google Play üzerinden kurulan sürümde çalışır.
          </p>
        )}
        <button
          onClick={restore}
          disabled={busy}
          className="w-full text-center font-mono text-[11px] text-mut underline-offset-2 hover:text-txt hover:underline"
        >
          Satın alımı geri yükle
        </button>
      </div>
    </Modal>
  );
}
