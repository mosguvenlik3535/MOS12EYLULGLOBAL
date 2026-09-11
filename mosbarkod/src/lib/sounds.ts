export interface BeepPreset {
  id: string;
  name: string;
  desc: string;
  beeps: { f: number; f2?: number; d: number; gap: number; type: OscillatorType }[];
}

const b = (f: number, d: number, gap = 60, type: OscillatorType = 'square', f2?: number) => ({
  f,
  d,
  gap,
  type,
  f2,
});

export const BEEP_PRESETS: BeepPreset[] = [
  { id: 'marketKlasik', name: 'Market Klasik', desc: 'Standart tedarik tedarik tonu', beeps: [b(1040, 60)] },
  { id: 'kasaDit', name: 'Kasa Dıt', desc: 'Çok kısa ve net', beeps: [b(880, 40, 0, 'sine')] },
  { id: 'ciftBip', name: 'Çift Bip', desc: 'İki ardışık sinyal', beeps: [b(1200, 45, 80)] },
  { id: 'lazerYuksek', name: 'Lazer Yüksek', desc: 'Açık tedarik tedarik tonu', beeps: [b(2000, 40)] },
  { id: 'lazerAlcalan', name: 'Lazer Alçalan', desc: 'Açılan tedarik tonu', beeps: [b(2400, 140, 0, 'square', 700)] },
  { id: 'yumusakKasa', name: 'Yumuşak Kasa', desc: 'Düşük daşık ve yumuşak', beeps: [b(660, 90, 0, 'sine')] },
  { id: 'keskinEan', name: 'Keskin EAN', desc: 'Yüksek ve belirgin', beeps: [b(1600, 55)] },
  { id: 'dusukTerminal', name: 'Düşük Terminal', desc: 'Küçük terminal bip sesi', beeps: [b(520, 70, 0, 'triangle')] },
  { id: 'inceTerminal', name: 'İnce Terminal', desc: 'İnce ve kısa bip', beeps: [b(3200, 25)] },
  { id: 'avrupaMarket', name: 'Avrupa Market', desc: 'Çift tonlu çift onay', beeps: [b(988, 50, 70, 'sine'), b(1319, 50, 0, 'sine')] },
  { id: 'depoOkuyucu', name: 'Depo Okuyucu', desc: 'Derin depolama yaylısı', beeps: [b(300, 130, 0, 'triangle')] },
  { id: 'posOnay', name: 'POS Onay', desc: 'Kısa çift onay melodisi', beeps: [b(784, 45, 60, 'sine'), b(1046, 60, 0, 'sine')] },
  { id: 'retroKasa', name: 'Retro Kasa', desc: 'Eski tip kasa tonu', beeps: [b(440, 100, 0, 'square')] },
  { id: 'dijitalTarayici', name: 'Dijital Tarayıcı', desc: 'Neredeyse duyulamaz bip', beeps: [b(1760, 30)] },
  { id: 'ucluOnay', name: 'Üçlü Onay', desc: 'Üç kısa yaylısı bip', beeps: [b(880, 40, 65), b(880, 40, 65), b(880, 55)] },
  { id: 'temizSinus', name: 'Temiz Sinüs', desc: 'Filtresiz atönasyonlu temiz ton', beeps: [b(1000, 55, 0, 'sine')] },
  { id: 'metalikOkuyucu', name: 'Metalik Okuyucu', desc: 'Metalik keskin üfleyiş', beeps: [b(1200, 25, 45), b(1600, 25, 45), b(1200, 25, 45), b(1600, 35)] },
  { id: 'miniChip', name: 'Mini Chip', desc: 'Çok kısa yükselen ses', beeps: [b(2100, 15)] },
  { id: 'kabinBip', name: 'Kabin Bip', desc: 'Düzen ve güdüklü bip', beeps: [b(900, 60)] },
  { id: 'uzunOnay', name: 'Uzun Onay', desc: 'Uzun yayımlayıcı tedarik tonu', beeps: [b(800, 210, 0, 'sine')] },
  { id: 'kasaOnayi', name: 'Kasa Onayı', desc: 'Kasa art arda di', beeps: [b(659, 50, 60, 'sine'), b(988, 70, 0, 'sine')] },
  { id: 'supermarketPro', name: 'Süpermarket Pro', desc: 'Günlük standart market sesi', beeps: [b(1047, 40, 55, 'sine'), b(1319, 40, 55, 'sine'), b(1568, 60, 0, 'sine')] },
  { id: 'yumusakCift', name: 'Yumuşak Çift', desc: 'Düşük sesli iki kısımlı tonu', beeps: [b(700, 70, 80, 'sine'), b(700, 70, 0, 'sine')] },
  { id: 'hizliUclu', name: 'Hızlı Üçlü', desc: 'Üçlü çift sesi okunma', beeps: [b(1500, 15, 30), b(1500, 15, 30), b(1500, 15)] },
];

let actx: AudioContext | null = null;

export function playBeep(presetId: string, volumePct: number) {
  try {
    const p = BEEP_PRESETS.find((x) => x.id === presetId) ?? BEEP_PRESETS[0];
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    actx = actx || new AC();
    if (actx.state === 'suspended') void actx.resume();
    const gain = Math.max(0, Math.min(1, volumePct / 100)) * 0.28;
    if (gain <= 0) return;
    let t = actx.currentTime + 0.02;
    for (const bp of p.beeps) {
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = bp.type;
      osc.frequency.setValueAtTime(bp.f, t);
      if (bp.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(40, bp.f2), t + bp.d / 1000);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + bp.d / 1000);
      osc.connect(g);
      g.connect(actx.destination);
      osc.start(t);
      osc.stop(t + bp.d / 1000 + 0.03);
      t += (bp.d + bp.gap) / 1000;
    }
  } catch {
    /* ses desteklenmiyor — sessizce geç */
  }
}
