import { useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Badge, Btn, Confirm, Field, Inp, Modal, Sel, Stat } from '../components/ui';
import { ProLockedPanel } from '../components/ProGate';
import { USERS, USER_THEMES, dstr, fmt, round2, tstr, uid, type Staff } from '../data';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

const ROLES = ['Kasiyer', 'Depo Sorumlusu', 'Satış Temsilcisi', 'Müdür Yardımcısı', 'Yönetici'];
const monthKey = () => new Date().toISOString().slice(0, 7);

const monthPaid = (s: Staff, type: 'maas' | 'avans') =>
  (s.pays ?? []).filter((p) => p.type === type && p.date.slice(0, 7) === monthKey()).reduce((a, p) => a + p.amount, 0);

/* ---------------- KULLANICI PIN YÖNETİMİ (yalnızca Admin) ---------------- */

function PinPanel({
  pins,
  onPinsChange,
  isAdmin,
  toast,
}: {
  pins: Record<string, string>;
  onPinsChange: (pins: Record<string, string>) => void;
  isAdmin: boolean;
  toast: Toast;
}) {
  const [edit, setEdit] = useState<string | null>(null);
  const [np, setNp] = useState('');
  const [np2, setNp2] = useState('');

  if (!isAdmin) {
    return (
      <section className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-panel p-4">
        <div className="rounded-lg border border-line2 bg-panel3 p-2 text-mut2">
          <Ic n="lock" c="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">Kullanıcı PIN Yönetimi</div>
          <p className="mt-0.5 text-[11px] text-mut2">
            PIN tanımlama ve değiştirme yalnızca yönetici (Admin) hesabında yapılabilir.
          </p>
        </div>
      </section>
    );
  }

  const save = () => {
    if (!edit) return;
    if (!/^\d{4}$/.test(np)) return toast('PIN 4 rakamdan oluşmalıdır', 'err');
    if (np !== np2) return toast('PIN tekrarı eşleşmiyor', 'err');
    const dup = Object.entries(pins).find(([id, v]) => id !== edit && v === np);
    if (dup) return toast(`Bu PIN zaten ${USERS.find((u) => u.id === dup[0])?.name} kullanıcısında tanımlı`, 'err');
    onPinsChange({ ...pins, [edit]: np });
    toast(`${USERS.find((u) => u.id === edit)?.name} PIN kodu güncellendi`);
    setEdit(null);
    setNp('');
    setNp2('');
  };

  return (
    <section className="mt-4 rounded-xl border border-amber/25 bg-panel p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="rounded-lg border border-amber/40 bg-amber/10 p-2 text-amber">
          <Ic n="lock" c="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="font-mono text-[12.5px] font-bold uppercase tracking-widest text-amber2">
            Kullanıcı PIN Yönetimi
          </h3>
          <p className="mt-0.5 text-[11px] text-mut2">
            Giriş ekranı ve kullanıcı geçişlerinde kullanılan 4 haneli PIN kodlarını buradan tanımlayın.
          </p>
        </div>
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        {USERS.map((u) => {
          const t = USER_THEMES[u.id];
          const has = /^\d{4}$/.test(pins[u.id] ?? '');
          return (
            <div key={u.id} className="rounded-xl border p-3" style={{ background: t.bg, borderColor: `${t.border}55` }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 bg-black/30" style={{ borderColor: t.border }}>
                  <Ic n="user" c="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-mono text-[12.5px] font-bold" style={{ color: t.text }}>
                    {u.name}
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.18em] text-white/50">{t.label}</div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded-lg border border-white/15 bg-black/30 px-2.5 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/55">PIN</span>
                <span className="font-mono text-[14px] font-bold tracking-[0.35em] text-white/80">
                  {has ? '••••' : '—'}
                </span>
              </div>

              <Btn
                v="ghost"
                className="mt-2.5 w-full border-white/25 text-white/85"
                onClick={() => {
                  setEdit(u.id);
                  setNp('');
                  setNp2('');
                }}
              >
                <Ic n="edit" c="h-3.5 w-3.5" /> PIN Değiştir
              </Btn>
            </div>
          );
        })}
      </div>

      {edit && (
        <Modal
          title={`PIN Değiştir — ${USERS.find((u) => u.id === edit)?.name}`}
          icon={<Ic n="lock" c="h-4.5 w-4.5" />}
          onClose={() => setEdit(null)}
          w="max-w-sm"
          footer={
            <>
              <Btn v="ghost" onClick={() => setEdit(null)}>
                Vazgeç
              </Btn>
              <Btn v="primary" onClick={save}>
                <Ic n="check" c="h-4 w-4" /> Kaydet
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Yeni PIN (4 rakam)">
              <Inp
                value={np}
                onChange={(e) => setNp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="****"
                inputMode="numeric"
                autoFocus
                className="text-center font-mono text-lg font-bold tracking-[0.4em]"
              />
            </Field>
            <Field label="Yeni PIN (tekrar)">
              <Inp
                value={np2}
                onChange={(e) => setNp2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="****"
                inputMode="numeric"
                className="text-center font-mono text-lg font-bold tracking-[0.4em]"
              />
            </Field>
            {np && np2 && np !== np2 && (
              <p className="text-[11px] font-semibold text-red">PIN tekrarı eşleşmiyor.</p>
            )}
            <p className="rounded-lg border border-line bg-ink/40 px-3 py-2 text-[10.5px] leading-relaxed text-mut2">
              PIN kodu yalnızca burada değiştirilir ve hiçbir ekranda açık olarak gösterilmez. Kaybedilmesi durumunda
              yönetici tarafından yeniden tanımlanmalıdır.
            </p>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default function StaffScreen({
  staff,
  save,
  pay,
  remove,
  pins,
  onPinsChange,
  isAdmin,
  toast,
  proLocked = false,
  onRequirePro,
}: {
  staff: Staff[];
  save: (s: Staff) => void;
  pay: (s: Staff, amount: number, type: 'maas' | 'avans', note: string) => void;
  remove: (id: string) => void;
  pins: Record<string, string>;
  proLocked?: boolean;
  onRequirePro?: () => void;
  onPinsChange: (pins: Record<string, string>) => void;
  isAdmin: boolean;
  toast: Toast;
}) {
  const monthLabel = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const [paying, setPaying] = useState<Staff | null>(null);
  const [del, setDel] = useState<Staff | null>(null);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Kasiyer', phone: '', salary: '' });
  const [editForm, setEditForm] = useState({ name: '', role: 'Kasiyer', phone: '', salary: '' });

  if (proLocked) {
    return (
      <ProLockedPanel
        icon="users"
        title="Personel Yönetimi"
        desc="Personel kayıtları ile maaş ve avans takibi PRO abonelik gerektirir. Satış, kasa ve stok işlemleriniz ücretsiz sürümde çalışmaya devam eder."
        features={['Sınırsız personel kaydı', 'Maaş & avans takibi', 'Personel bazında satış dağılımı']}
        onUpgrade={() => onRequirePro?.()}
      />
    );
  }

  const totalSalary = staff.reduce((s, x) => s + x.salary, 0);
  const paidThisMonth = staff.reduce((a, s) => a + monthPaid(s, 'maas'), 0);
  const avansThisMonth = staff.reduce((a, s) => a + monthPaid(s, 'avans'), 0);

  const doAdd = () => {
    const sal = Number(form.salary.replace(',', '.'));
    if (!form.name.trim() || !sal || sal <= 0) {
      toast('Ad ve geçerli maaş zorunludur', 'err');
      return;
    }
    save({
      id: 's' + uid(),
      name: form.name.trim(),
      role: form.role,
      phone: form.phone.trim(),
      salary: sal,
      paidMonth: null,
      pays: [],
    });
    setOpen(false);
    setForm({ name: '', role: 'Kasiyer', phone: '', salary: '' });
    toast('Personel eklendi');
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* başlık */}
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg border border-amber/40 bg-amber/10 p-2 text-amber">
            <Ic n="users" c="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-mono text-[16px] font-bold tracking-wide">Personel Kadrosu & Maaş Takibi</h2>
            <p className="max-w-[540px] text-[11.5px] leading-relaxed text-mut2">
              Çalışan personellerinizi kaydedebilir, maaş hak edişlerini ve yapılan maaş ödemelerini (tam, kısmi ve
              avans) buradan yönetebilirsiniz.
            </p>
          </div>
        </div>
        <Btn v="primary" className="ml-auto" onClick={() => setOpen(true)}>
          <Ic n="plus" c="h-4 w-4" /> Yeni Personel Ekle
        </Btn>
      </div>

      {/* özet */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Personel Sayısı" value={String(staff.length)} icon={<Ic n="users" c="h-4 w-4" />} />
        <Stat label={`Aylık Maaş (${monthLabel})`} value={fmt(totalSalary)} tone="amber" icon={<Ic n="banknote" c="h-4 w-4" />} />
        <Stat
          label="Bu Ay Ödenen (Maaş + Avans)"
          value={fmt(round2(paidThisMonth + avansThisMonth))}
          tone="mint"
          icon={<Ic n="check" c="h-4 w-4" />}
          sub={`avans: ${fmt(avansThisMonth)}`}
        />
      </div>

      {/* PIN yönetimi — yalnızca Admin */}
      <PinPanel pins={pins} onPinsChange={onPinsChange} isAdmin={isAdmin} toast={toast} />

      {/* personel kartları */}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((s) => {
          const maas = monthPaid(s, 'maas');
          const avans = monthPaid(s, 'avans');
          const paid = round2(maas + avans);
          const kalan = round2(s.salary - paid);
          const done = maas >= s.salary - 1e-9;
          return (
            <section key={s.id} className="anim-pop flex flex-col rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line2 bg-panel3 text-mut">
                  <Ic n="user" c="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-bold">{s.name}</span>
                    {done && <Badge tone="ok">Ödendi</Badge>}
                  </div>
                  <span className="mt-1 inline-block rounded-md border border-line2 bg-ink/50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-mut">
                    {s.role}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditing(s);
                      setEditForm({ name: s.name, role: s.role, phone: s.phone, salary: String(s.salary) });
                    }}
                    className="ml-auto rounded-md border border-line2 p-1.5 text-mut2 transition-colors hover:border-amber/50 hover:text-amber2"
                    title="Personeli / maaşı düzenle"
                  >
                    <Ic n="edit" c="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setDel(s)}
                  className={cn('rounded-md border border-line2 p-1.5 text-mut2 transition-colors hover:border-red/50 hover:text-red', !isAdmin && 'ml-auto')}
                  title="Sil"
                >
                  <Ic n="trash" c="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-1.5 rounded-lg border border-line bg-ink/40 p-3 font-mono text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-mut">Sabit Maaş:</span>
                  <span className="font-bold tabular-nums">{fmt(s.salary)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mut">Bu Ay Ödenen:</span>
                  <span className={cn('font-bold tabular-nums', paid > 0 ? 'text-mint' : 'text-mut2')}>{fmt(paid)}</span>
                </div>
                {avans > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-mut">• Avans:</span>
                    <span className="font-bold text-amber2 tabular-nums">{fmt(avans)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-line/70 pt-1.5">
                  <span className="text-mut">Kalan:</span>
                  <span className={cn('font-bold tabular-nums', kalan > 0 ? 'text-red' : 'text-mint')}>
                    {kalan > 0 ? fmt(kalan) : 'Tamamlandı'}
                  </span>
                </div>
              </div>

              <Btn
                v="mint"
                className="mt-3 w-full"
                disabled={done}
                onClick={() => setPaying(s)}
              >
                <Ic n="banknote" c="h-4 w-4" /> {done ? 'Bu Ay Maaşı Ödendi' : 'Maaş Ödemesi Yap'}
              </Btn>
            </section>
          );
        })}
        {staff.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-line2 py-10 text-center font-mono text-[12px] text-mut2">
            Personel kaydı yok.
          </div>
        )}
      </div>

      {/* ödeme modalı */}
      {paying && (
        <PayModal
          s={paying}
          onClose={() => setPaying(null)}
          onPay={(amt, type, note) => {
            pay(paying, amt, type, note);
            setPaying(null);
            toast(
              type === 'maas'
                ? `${paying.name} — ${fmt(amt)} maaş ödemesi yapıldı`
                : `${paying.name} — ${fmt(amt)} avans ödendi`
            );
          }}
        />
      )}

      {del && (
        <Confirm
          title="Personeli Sil"
          msg={`${del.name} personeli silinecek. Ödeme geçmişi korunur ama kart kaldırılır. Devam edilsin mi?`}
          label="Sil"
          onCancel={() => setDel(null)}
          onOk={() => {
            remove(del.id);
            setDel(null);
            toast('Personel silindi', 'err');
          }}
        />
      )}

      {editing && (
        <Modal
          title={`Personel Düzenle — ${editing.name}`}
          icon={<Ic n="edit" c="h-4.5 w-4.5" />}
          onClose={() => setEditing(null)}
          w="max-w-sm"
          footer={
            <>
              <Btn v="ghost" onClick={() => setEditing(null)}>
                Vazgeç
              </Btn>
              <Btn
                v="primary"
                onClick={() => {
                  const sal = Number(editForm.salary.replace(',', '.'));
                  if (!editForm.name.trim() || !sal || sal <= 0) {
                    toast('Ad ve geçerli maaş zorunludur', 'err');
                    return;
                  }
                  save({
                    ...editing,
                    name: editForm.name.trim(),
                    role: editForm.role,
                    phone: editForm.phone.trim(),
                    salary: sal,
                  });
                  setEditing(null);
                  toast('Personel bilgileri ve maaşı güncellendi');
                }}
              >
                <Ic n="check" c="h-4 w-4" /> Kaydet
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Ad Soyad">
              <Inp value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label="Görev">
              <Sel value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </Sel>
            </Field>
            <Field label="Telefon">
              <Inp value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="font-mono" />
            </Field>
            <Field label="Aylık Maaş (₺)">
              <Inp type="number" value={editForm.salary} onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}

      {open && (
        <Modal
          title="Yeni Personel"
          icon={<Ic n="user" c="h-4.5 w-4.5" />}
          onClose={() => setOpen(false)}
          w="max-w-sm"
          footer={
            <>
              <Btn v="ghost" onClick={() => setOpen(false)}>
                Vazgeç
              </Btn>
              <Btn v="primary" onClick={doAdd}>
                <Ic n="check" c="h-4 w-4" /> Ekle
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Ad Soyad">
              <Inp value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ad Soyad" />
            </Field>
            <Field label="Görev">
              <Sel value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Sel>
            </Field>
            <Field label="Telefon">
              <Inp value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xx xxx xx xx" className="font-mono" />
            </Field>
            <Field label="Aylık Maaş (₺)">
              <Inp type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="0" />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- maaş ödemesi (tam / kısmi / avans) ---------------- */

function PayModal({
  s,
  onClose,
  onPay,
}: {
  s: Staff;
  onClose: () => void;
  onPay: (amount: number, type: 'maas' | 'avans', note: string) => void;
}) {
  const maas = monthPaid(s, 'maas');
  const avans = monthPaid(s, 'avans');
  const kalan = round2(s.salary - round2(maas + avans));
  const [tab, setTab] = useState<'tam' | 'kismi' | 'avans'>('tam');
  const [amt, setAmt] = useState(kalan > 0 ? String(kalan) : '');
  const [note, setNote] = useState('');

  const pick = (t: 'tam' | 'kismi' | 'avans') => {
    setTab(t);
    if (t === 'tam') setAmt(String(Math.max(0, kalan)));
    else if (t === 'kismi') setAmt(kalan > 0 ? String(Math.round(kalan / 2 * 100) / 100) : '');
    else setAmt('');
  };

  const a = Number(amt.replace(',', '.')) || 0;
  const maxA = tab === 'avans' ? s.salary : kalan;
  const valid = a > 0 && a <= maxA + 0.009;

  return (
    <Modal
      title={`Maaş Ödemesi — ${s.name}`}
      icon={<Ic n="banknote" c="h-4.5 w-4.5" />}
      onClose={onClose}
      w="max-w-md"
      footer={
        <>
          <Btn v="ghost" onClick={onClose}>
            Vazgeç
          </Btn>
          <Btn v="mint" disabled={!valid} onClick={() => onPay(a, tab === 'avans' ? 'avans' : 'maas', note.trim())}>
            <Ic n="check" c="h-4 w-4" /> Ödemeyi Kaydet
          </Btn>
        </>
      }
    >
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        {[
          { l: 'Sabit Maaş', v: s.salary, c: 'text-txt' },
          { l: 'Bu Ay Ödenen', v: round2(maas + avans), c: 'text-mint' },
          { l: 'Kalan', v: kalan, c: kalan > 0 ? 'text-red' : 'text-mint' },
        ].map((x) => (
          <div key={x.l} className="rounded-lg border border-line bg-ink/40 px-2 py-2.5">
            <div className="font-mono text-[9px] uppercase tracking-widest text-mut2">{x.l}</div>
            <div className={cn('mt-1 font-mono text-[14px] font-bold tabular-nums', x.c)}>{fmt(x.v)}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {(
          [
            { id: 'tam', label: 'Tam Ödeme', icon: 'check' },
            { id: 'kismi', label: 'Kısmi Ödeme', icon: 'percent' },
            { id: 'avans', label: 'Avans', icon: 'banknote' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-[11px] font-semibold transition-all',
              tab === t.id
                ? t.id === 'avans'
                  ? 'border-amber bg-amber/10 text-amber2'
                  : 'border-mint bg-mint/10 text-mint'
                : 'border-line2 bg-ink/40 text-mut hover:text-txt'
            )}
          >
            <Ic n={t.icon} c="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <Field label={tab === 'avans' ? 'Avans Tutarı (₺) *' : 'Ödenecek Tutar (₺) *'}>
        <Inp
          type="number"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder="0,00"
          className="py-3 font-mono text-lg font-bold"
        />
      </Field>
      {a > maxA + 0.009 && (
        <p className="mt-1.5 text-[11px] font-semibold text-red">
          {tab === 'avans' ? 'Avans, aylık maaşı geçemez.' : `Kalan tutar: ${fmt(kalan)}`}
        </p>
      )}
      <div className="mt-3">
        <Field label="Not (opsiyonel)">
          <Inp value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn: yarım maaş, evlilik avansı…" />
        </Field>
      </div>

      {(s.pays ?? []).length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-mut2">Bu Ay İşlemler</div>
          <div className="max-h-[130px] space-y-1 overflow-y-auto">
            {[...s.pays]
              .filter((p) => p.date.slice(0, 7) === mkLocal())
              .reverse()
              .map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md border border-line bg-panel2/50 px-2.5 py-1.5">
                  <Badge tone={p.type === 'maas' ? 'ok' : 'warn'}>{p.type === 'maas' ? 'Maaş' : 'Avans'}</Badge>
                  <span className="truncate text-[10.5px] text-mut2">
                    {dstr(p.date)} {tstr(p.date)}
                    {p.note ? ` · ${p.note}` : ''}
                  </span>
                  <span className="ml-auto font-mono text-[11.5px] font-bold tabular-nums">{fmt(p.amount)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <p className="mt-3 rounded-lg border border-line bg-ink/40 px-3 py-2 text-[10.5px] leading-relaxed text-mut2">
        Ödeme <span className="font-semibold text-mut">Masraf Defteri → Personel</span> kategorisine de otomatik
        işlenir.
      </p>
    </Modal>
  );
}

function mkLocal() {
  return new Date().toISOString().slice(0, 7);
}
