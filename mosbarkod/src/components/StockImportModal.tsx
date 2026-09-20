import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Modal, Sel } from './ui';
import { fmtN, type Product, type Settings } from '../data';
import {
  IMPORT_FIELDS,
  PROGRAM_PRESETS,
  buildImportRows,
  detectPreset,
  guessColumns,
  parseCsvText,
  type BuildResult,
  type FieldKey,
} from '../lib/stockImport';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

interface SheetData {
  name: string;
  header: (string | number)[];
  rows: (string | number)[][];
}

/** Dosyayı (xlsx/xls/csv/txt) okuyup sayfa listesine dönüştürür. */
async function readSheets(file: File): Promise<SheetData[]> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const buf = await file.arrayBuffer();

  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    return wb.SheetNames.map((n) => {
      const ws = wb.Sheets[n];
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
      return { name: n, header: rows[0] ?? [], rows };
    });
  }

  let text: string;
  const b = new Uint8Array(buf);
  if (b.length > 2 && b[0] === 0xff && b[1] === 0xfe) text = new TextDecoder('utf-16le').decode(b.subarray(2));
  else if (b.length > 2 && b[0] === 0xfe && b[1] === 0xff) text = new TextDecoder('utf-16be').decode(b.subarray(2));
  else text = new TextDecoder('utf-8').decode(b);
  const rows = parseCsvText(text);
  return [{ name: file.name, header: rows[0] ?? [], rows }];
}

export default function StockImportModal({
  products,
  settings,
  onApply,
  onClose,
  toast,
}: {
  products: Product[];
  settings: Settings;
  onApply: (list: Product[]) => void;
  onClose: () => void;
  toast: Toast;
}) {
  const [sheets, setSheets] = useState<SheetData[] | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [presetId, setPresetId] = useState('generic');
  const [mapping, setMapping] = useState<Record<FieldKey, number>>({} as Record<FieldKey, number>);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sheet: SheetData | undefined = sheets?.[sheetIdx];
  const header = sheet?.header ?? [];

  const applySheet = (list: SheetData[], idx: number) => {
    const s = list[idx];
    if (!s) return;
    const preset = detectPreset(s.header);
    const presetObj = PROGRAM_PRESETS.find((p) => p.id === preset) ?? PROGRAM_PRESETS[0];
    setPresetId(preset);
    setMapping(guessColumns(s.header, presetObj.patterns));
  };

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const list = await readSheets(f);
      setSheets(list);
      setSheetIdx(0);
      applySheet(list, 0);
      if (list.length > 1) toast(`${list.length} sayfa bulundu — ilk sayfa seçildi`);
    } catch {
      toast('Dosya okunamadı — bozulmamış bir Excel/CSV dosyası seçin', 'err');
    } finally {
      setBusy(false);
    }
  };

  const changeSheet = (i: number) => {
    setSheetIdx(i);
    if (sheets) applySheet(sheets, i);
  };

  const changePreset = (id: string) => {
    setPresetId(id);
    const presetObj = PROGRAM_PRESETS.find((p) => p.id === id) ?? PROGRAM_PRESETS[0];
    setMapping(guessColumns(header, presetObj.patterns));
  };

  const setField = (key: FieldKey, col: number) => setMapping((m) => ({ ...m, [key]: col }));

  const result: BuildResult | null = useMemo(() => {
    if (!sheet || !mapping || !mapping.name || mapping.name < 0) return null;
    return buildImportRows(sheet.rows, {
      existing: products,
      mapping,
      criticalDefault: settings.criticalDefault,
    });
  }, [sheet, mapping, products, settings.criticalDefault]);

  const apply = () => {
    if (!result) return;
    onApply(result.products);
    toast(
      `İçe aktarıldı: ${result.added} yeni eklendi, ${result.updated} güncellendi${result.skipped ? `, ${result.skipped} satır atlandı` : ''}`
    );
    onClose();
  };

  const headerCell = (i: number) => {
    const h = String(header[i] ?? '').trim();
    return `${i + 1}: ${h || '(boş)'}`;
  };

  const previewRows = sheet ? sheet.rows.slice(1, 7) : [];
  const nameCol = mapping?.name;

  return (
    <Modal
      title="Stok Yükleme Sihirbazı"
      icon={<Ic n="file" c="h-4.5 w-4.5 text-mint" />}
      onClose={onClose}
      w="max-w-4xl"
      footer={
        <>
          <Btn v="ghost" onClick={onClose}>
            Vazgeç
          </Btn>
          <Btn v="mint" onClick={apply} disabled={!result || result.added + result.updated === 0} className="gap-2">
            <Ic n="check" c="h-4 w-4" />
            {result ? `İçe Aktar (${result.added} yeni · ${result.updated} güncelle)` : 'İçe Aktar'}
          </Btn>
        </>
      }
    >
      {/* 1) Dosya seçimi */}
      <div className="mb-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line2 bg-panel2/40 px-4 py-6 text-[12.5px] text-mut transition-colors hover:border-mint/50 hover:text-txt disabled:opacity-50"
        >
          <Ic n="download" c="h-5 w-5" />
          {busy ? 'Okunuyor…' : sheets ? 'Başka Dosya Seç (.xlsx / .xls / .csv / .txt)' : 'Dosya Seç — Excel / CSV (Mikro, Logo, Paraşüt, Nebim, Zirve, SAP…)'}
        </button>
      </div>

      {sheet && (
        <>
          {/* 2) Sayfa seçimi */}
          {sheets && sheets.length > 1 && (
            <div className="mb-3 flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-mut">Sayfa:</span>
              <div className="flex flex-wrap gap-1.5">
                {sheets.map((s, i) => (
                  <button
                    key={s.name + i}
                    onClick={() => changeSheet(i)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 font-mono text-[11px]',
                      i === sheetIdx ? 'border-mint/60 bg-mint/15 text-mint' : 'border-line2 bg-ink/50 text-mut hover:text-txt'
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3) Program şablonu + sütun eşleme */}
          <div className="mb-3 rounded-xl border border-line bg-panel2/40 p-3">
            <div className="mb-2 flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-mut">
                  Program Şablonu (sütunları otomatik eşler)
                </span>
                <Sel value={presetId} onChange={(e) => changePreset(e.target.value)}>
                  {PROGRAM_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.hint}
                    </option>
                  ))}
                </Sel>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2">
                  <span className={cn('w-28 shrink-0 font-mono text-[10px]', f.required ? 'text-amber2' : 'text-mut')}>
                    {f.label}
                    {f.required ? ' *' : ''}
                  </span>
                  <Sel
                    value={String(mapping[f.key] ?? -1)}
                    onChange={(e) => setField(f.key, Number(e.target.value))}
                    className={cn('py-1.5 text-[11px]', (mapping[f.key] ?? -1) >= 0 && 'border-mint/50 text-mint')}
                  >
                    <option value={-1}>— atla —</option>
                    {header.map((_, i) => (
                      <option key={i} value={i}>
                        {headerCell(i)}
                      </option>
                    ))}
                  </Sel>
                </label>
              ))}
            </div>
          </div>

          {/* 4) Önizleme */}
          <div className="rounded-xl border border-line bg-panel2/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-mut">Önizleme (ilk satırlar)</span>
              {result && (
                <span className="font-mono text-[10px] text-mut2">
                  <b className="text-mint">{result.added}</b> yeni · <b className="text-amber2">{result.updated}</b> güncelle ·{' '}
                  <b className="text-red">{result.skipped}</b> atlandı
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[11px]">
                <thead>
                  <tr>
                    <th className="border-b border-line px-2 py-1 text-left text-mut">Alan</th>
                    {previewRows.map((_, i) => (
                      <th key={i} className="border-b border-line px-2 py-1 text-right text-mut">
                        Satır {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {IMPORT_FIELDS.filter((f) => (mapping[f.key] ?? -1) >= 0).map((f) => {
                    const col = mapping[f.key];
                    return (
                      <tr key={f.key}>
                        <td className="border-b border-line/50 px-2 py-1 text-mut">{f.label}</td>
                        {previewRows.map((r, i) => (
                          <td key={i} className="border-b border-line/50 px-2 py-1 text-right text-txt">
                            {f.key === 'stock' || f.key === 'cost' || f.key.startsWith('p') || f.key === 'critical'
                              ? fmtN(Number(String(r[col] ?? '').replace(',', '.')) || 0)
                              : String(r[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {nameCol >= 0 && previewRows.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-2 py-3 text-mut2">
                        Dosyada veri satırı yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {(mapping?.name ?? -1) < 0 && (
              <div className="mt-2 rounded-md border border-amber/40 bg-amber/10 px-3 py-1.5 font-mono text-[10.5px] text-amber2">
                ⚠ "Ürün Adı" alanı zorunludur — bir sütuna eşleyin.
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
