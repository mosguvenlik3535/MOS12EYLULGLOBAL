import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Field, Inp, Modal, Sel } from './ui';
import { CATEGORIES, fmt, type Product, type Settings } from '../data';

type LabelFormat = 'shelf_standard' | 'shelf_promo' | 'thermal_barcode' | 'a4_sheet_24' | 'a4_sheet_40';

export default function LabelStudioModal({
  products,
  settings,
  onClose,
}: {
  products: Product[];
  settings: Settings;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<LabelFormat>('shelf_standard');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => products.slice(0, 12).map((p) => p.id));
  const [categoryFilter, setCategoryFilter] = useState('Hepsi');
  const [searchQuery, setSearchQuery] = useState('');

  // Design customizations
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showUnitPrice, setShowUnitPrice] = useState(true);
  const [showStoreName, setShowStoreName] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [originText, setOriginText] = useState('Menşei: TÜRKİYE');
  const [promoText, setPromoText] = useState('SÜPER FİYAT');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'Hepsi' && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.barcode.includes(q) || (p.brand || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, categoryFilter, searchQuery]);

  const selectedProducts = useMemo(() => {
    return products.filter((p) => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllFiltered = () => {
    const ids = filteredProducts.map((p) => p.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllFiltered = () => {
    const ids = new Set(filteredProducts.map((p) => p.id));
    setSelectedIds((prev) => prev.filter((id) => !ids.has(id)));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      title="Raf Etiketi & Barkod Basım Stüdyosu (Label Studio)"
      icon={<Ic n="print" c="h-5 w-5 text-amber" />}
      onClose={onClose}
      w="max-w-5xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="font-mono text-xs text-mut">
            <span className="font-bold text-amber2">{selectedProducts.length}</span> ürün basıma hazır
          </div>
          <div className="flex gap-2">
            <Btn v="ghost" onClick={onClose}>
              Kapat
            </Btn>
            <Btn v="primary" onClick={handlePrint} disabled={selectedProducts.length === 0} className="gap-2 px-5">
              <Ic n="print" c="h-4 w-4" /> Etiketleri Yazdır ({selectedProducts.length})
            </Btn>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Product Selection & Format Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5 border-b lg:border-b-0 lg:border-r border-line pr-0 lg:pr-4">
          {/* Format Selector */}
          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">
              Etiket Formatı & Şablon
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: 'shelf_standard' as const, label: 'Standart Raf Etiketi (60x40mm)', desc: 'Büyük Fiyat + Barkod + Menşei' },
                { id: 'shelf_promo' as const, label: 'İndirim & Kampanya Etiketi', desc: 'Sarı/Kırmızı Vurgulu Fırsat Fiyatı' },
                { id: 'thermal_barcode' as const, label: 'Kompakt Barkod (40x25mm)', desc: 'Rulo Termal Yazıcılar (Zebra/Argox)' },
                { id: 'a4_sheet_24' as const, label: 'A4 Çoklu Tabaka (24’lü)', desc: '3x8 Standart A4 Yapışkanlı Kağıt' },
                { id: 'a4_sheet_40' as const, label: 'A4 Mini Tabaka (40’lı)', desc: '4x10 Küçük Etiket Kağıdı' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    'flex flex-col text-left rounded-xl border p-2.5 transition-all',
                    format === f.id
                      ? 'border-amber bg-amber/15 text-amber2 shadow-md'
                      : 'border-line2 bg-ink/40 text-mut hover:text-txt hover:bg-panel2'
                  )}
                >
                  <span className="text-xs font-bold">{f.label}</span>
                  <span className="text-[10px] text-mut2">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Design Options */}
          <div className="rounded-xl border border-line bg-panel2/50 p-3 space-y-2">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-amber2">
              Tasarım Seçenekleri
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-mut hover:text-txt">
                <input
                  type="checkbox"
                  checked={showBarcode}
                  onChange={(e) => setShowBarcode(e.target.checked)}
                  className="rounded border-line2 accent-[var(--color-amber)]"
                />
                Barkod Göster
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-mut hover:text-txt">
                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={(e) => setShowQr(e.target.checked)}
                  className="rounded border-line2 accent-[var(--color-amber)]"
                />
                Kare Kod (QR)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-mut hover:text-txt">
                <input
                  type="checkbox"
                  checked={showUnitPrice}
                  onChange={(e) => setShowUnitPrice(e.target.checked)}
                  className="rounded border-line2 accent-[var(--color-amber)]"
                />
                Birim / KDV
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-mut hover:text-txt">
                <input
                  type="checkbox"
                  checked={showOrigin}
                  onChange={(e) => setShowOrigin(e.target.checked)}
                  className="rounded border-line2 accent-[var(--color-amber)]"
                />
                Menşei Bilgisi
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-mut hover:text-txt">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="rounded border-line2 accent-[var(--color-amber)]"
                />
                Mağaza Başlığı
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-mut hover:text-txt">
                <input
                  type="checkbox"
                  checked={showDate}
                  onChange={(e) => setShowDate(e.target.checked)}
                  className="rounded border-line2 accent-[var(--color-amber)]"
                />
                Baskı Tarihi
              </label>
            </div>

            {format === 'shelf_promo' && (
              <Field label="Kampanya Rozet Metni">
                <Inp value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="SÜPER FİYAT" />
              </Field>
            )}

            <Field label="Menşei Metni">
              <Inp value={originText} onChange={(e) => setOriginText(e.target.value)} placeholder="Menşei: TÜRKİYE" />
            </Field>
          </div>

          {/* Product Filter and Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-mut">Basılacak Ürünler</span>
              <div className="flex gap-1">
                <button
                  onClick={selectAllFiltered}
                  className="rounded border border-line2 px-2 py-0.5 font-mono text-[9.5px] text-mint hover:bg-mint/10"
                >
                  Tümünü Seç
                </button>
                <button
                  onClick={deselectAllFiltered}
                  className="rounded border border-line2 px-2 py-0.5 font-mono text-[9.5px] text-red hover:bg-red/10"
                >
                  Kaldır
                </button>
              </div>
            </div>

            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Inp
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ürün veya barkod ara…"
                  className="py-1 text-xs"
                />
              </div>
              <Sel value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-28 py-1 text-xs">
                <option value="Hepsi">Tüm Kat.</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Sel>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-line bg-ink/40 p-1.5 space-y-1 [scrollbar-width:thin]">
              {filteredProducts.map((p) => {
                const isChecked = selectedIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg p-2 cursor-pointer text-xs transition-colors',
                      isChecked ? 'bg-amber/10 text-amber2' : 'hover:bg-panel2 text-mut'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded accent-[var(--color-amber)]"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="font-mono text-[11px] font-bold text-mint">{fmt(p.p1)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Label Preview Canvas (8 cols) */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber2">
              Canlı Önizleme & Baskı Alanı ({selectedProducts.length} adet)
            </span>
            <span className="text-[11px] text-mut2">Yazıcıdan birebir bu görünümde çıkar</span>
          </div>

          <div
            id="label-print-area"
            className="flex-1 overflow-y-auto max-h-[60vh] rounded-2xl border border-line bg-[#0d1218] p-4 [scrollbar-width:thin]"
          >
            {selectedProducts.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-mut2">
                <Ic n="print" c="h-10 w-10 mb-2 opacity-50" />
                <p className="text-xs">Soldaki listeden en az bir ürün seçin.</p>
              </div>
            ) : (
              <div
                className={cn(
                  'grid gap-3',
                  format === 'a4_sheet_24'
                    ? 'grid-cols-3'
                    : format === 'a4_sheet_40'
                    ? 'grid-cols-4'
                    : format === 'thermal_barcode'
                    ? 'grid-cols-2 sm:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2'
                )}
              >
                {selectedProducts.map((p) => (
                  <SingleLabelCard
                    key={p.id}
                    product={p}
                    format={format}
                    settings={settings}
                    showBarcode={showBarcode}
                    showQr={showQr}
                    showUnitPrice={showUnitPrice}
                    showStoreName={showStoreName}
                    showDate={showDate}
                    showOrigin={showOrigin}
                    originText={originText}
                    promoText={promoText}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SingleLabelCard({
  product,
  format,
  settings,
  showBarcode,
  showQr,
  showUnitPrice,
  showStoreName,
  showDate,
  showOrigin,
  originText,
  promoText,
}: {
  product: Product;
  format: LabelFormat;
  settings: Settings;
  showBarcode: boolean;
  showQr: boolean;
  showUnitPrice: boolean;
  showStoreName: boolean;
  showDate: boolean;
  showOrigin: boolean;
  originText: string;
  promoText: string;
}) {
  const isPromo = format === 'shelf_promo';
  const isThermal = format === 'thermal_barcode';
  const oldPrice = product.p3 > product.p1 ? product.p3 : Math.round(product.p1 * 1.25 * 100) / 100;
  const dateStr = new Date().toLocaleDateString('tr-TR');

  return (
    <div
      className={cn(
        'label-card relative overflow-hidden rounded-xl bg-white text-[#101828] p-3 shadow-md flex flex-col justify-between transition-all select-none',
        isPromo
          ? 'border-2 border-[#e11d48] ring-2 ring-[#e11d48]/20 bg-gradient-to-b from-[#fff5f5] to-white'
          : isThermal
          ? 'border border-[#101828] p-2 text-[10px]'
          : 'border border-[#d0d5dd]'
      )}
      style={{ minHeight: isThermal ? '110px' : '150px' }}
    >
      {/* Promo Banner if applicable */}
      {isPromo && (
        <div className="absolute top-0 inset-x-0 bg-[#e11d48] text-white py-0.5 text-center font-mono font-black text-[10px] tracking-wider uppercase">
          ★ {promoText || 'SÜPER FİYAT'} ★
        </div>
      )}

      {/* Header Info */}
      <div className={cn(isPromo ? 'mt-3' : '')}>
        {showStoreName && !isThermal && (
          <div className="flex justify-between items-center text-[9px] font-bold text-[#667085] uppercase tracking-wider border-b border-[#e4e7ec] pb-1 mb-1">
            <span className="truncate">{settings.storeName}</span>
            {showDate && <span>{dateStr}</span>}
          </div>
        )}

        <div className="font-extrabold text-[12px] leading-tight text-[#101828] line-clamp-2">
          {product.name}
        </div>

        {product.brand && (
          <div className="text-[9.5px] font-medium text-[#475467]">{product.brand} {product.gram ? `· ${product.gram}` : ''}</div>
        )}
      </div>

      {/* Center Price Area */}
      <div className="my-1.5 flex items-baseline justify-between gap-1">
        {isPromo && (
          <div className="text-left">
            <span className="text-[9px] text-[#98a2b3] line-through font-mono block">
              {fmt(oldPrice)}
            </span>
            <span className="text-[9px] font-bold text-[#e11d48] uppercase">İNDİRİM</span>
          </div>
        )}

        <div className="text-right ml-auto">
          <div
            className={cn(
              'font-mono font-black tracking-tight leading-none text-right',
              isPromo ? 'text-2xl sm:text-3xl text-[#e11d48]' : 'text-2xl sm:text-3xl text-[#101828]'
            )}
          >
            {fmt(product.p1)}
          </div>
          {showUnitPrice && (
            <div className="text-[9px] font-bold text-[#475467] text-right mt-0.5 font-mono">
              Birim: {fmt(product.p1)} / {product.unit} (KDV Dahil)
            </div>
          )}
        </div>
      </div>

      {/* Footer: Barcode & Origin */}
      <div className="pt-1.5 border-t border-[#e4e7ec] flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {showBarcode && product.barcode ? (
            <div>
              {/* Simulated crisp Barcode SVG lines */}
              <div className="flex h-6 items-center gap-[1px] overflow-hidden bg-white">
                {product.barcode.split('').map((ch, i) => {
                  const code = parseInt(ch, 10) || 1;
                  return (
                    <span
                      key={i}
                      className="h-full bg-black shrink-0"
                      style={{
                        width: `${(code % 3) + 1.2}px`,
                        marginRight: `${(i % 2) * 0.8}px`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="font-mono text-[9px] font-bold tracking-widest text-[#101828]">
                {product.barcode}
              </div>
            </div>
          ) : (
            <span className="font-mono text-[9px] text-[#98a2b3]">{product.id}</span>
          )}

          {showOrigin && !isThermal && (
            <div className="text-[8px] font-bold text-[#667085] mt-0.5 uppercase tracking-wide">
              {originText || 'Menşei: TÜRKİYE'}
            </div>
          )}
        </div>

        {showQr && !isThermal && product.barcode && (
          <div className="shrink-0 p-0.5 bg-white border border-[#e4e7ec] rounded">
            <QRCodeSVG value={product.barcode} size={28} marginSize={0} />
          </div>
        )}
      </div>
    </div>
  );
}
