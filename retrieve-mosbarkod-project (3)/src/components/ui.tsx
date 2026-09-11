import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';

type BtnVariant = 'primary' | 'mint' | 'danger' | 'ghost' | 'subtle';

export function Btn({
  v = 'ghost',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { v?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-amber text-[#1a1102] hover:bg-amber2 font-semibold',
    mint: 'bg-gradient-to-r from-[#149c6f] to-[#2fd6a5] text-[#04211a] hover:brightness-110 font-bold',
    danger: 'bg-red/10 text-red border border-red/40 hover:bg-red/20',
    ghost: 'border border-line2 bg-panel2/50 text-txt hover:border-amber/60 hover:text-amber2',
    subtle: 'bg-panel3 text-mut hover:text-txt hover:bg-line',
  };
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] transition-all disabled:pointer-events-none disabled:opacity-40',
        styles[v],
        className
      )}
    />
  );
}

export const Inp = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...p}
    className={cn(
      'w-full rounded-lg border border-line2 bg-ink/70 px-3 py-2 text-[13px] text-txt placeholder:text-mut2 outline-none transition-colors focus:border-amber/70 focus:ring-2 focus:ring-amber/15',
      className
    )}
  />
);

export const Sel = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...p}
    className={cn(
      'w-full appearance-none rounded-lg border border-line2 bg-ink/70 px-3 py-2 text-[13px] text-txt outline-none transition-colors focus:border-amber/70 focus:ring-2 focus:ring-amber/15',
      className
    )}
  >
    {children}
  </select>
);

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-mut">{label}</span>
      {children}
    </label>
  );
}

export function Modal({
  title,
  icon,
  onClose,
  children,
  footer,
  w = 'max-w-lg',
}: {
  title: string;
  icon?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  w?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={cn(
          'anim-pop flex max-h-[92vh] w-full flex-col rounded-xl border border-line2 bg-panel shadow-2xl shadow-black/60',
          w
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          {icon && <span className="text-amber">{icon}</span>}
          <h3 className="font-mono text-[13px] font-semibold tracking-wide">{title}</h3>
          {onClose && (
            <button onClick={onClose} className="ml-auto rounded p-1 text-mut transition-colors hover:bg-red/10 hover:text-red">
              <Ic n="x" c="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({
  title,
  msg,
  label = 'Onayla',
  onCancel,
  onOk,
}: {
  title: string;
  msg: string;
  label?: string;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      title={title}
      icon={<Ic n="alert" c="h-4.5 w-4.5" />}
      onClose={onCancel}
      w="max-w-sm"
      footer={
        <>
          <Btn v="ghost" onClick={onCancel}>
            Vazgeç
          </Btn>
          <Btn v="danger" onClick={onOk}>
            {label}
          </Btn>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-mut">{msg}</p>
    </Modal>
  );
}

const TONES: Record<string, string> = {
  txt: 'text-txt',
  mint: 'text-mint',
  amber: 'text-amber2',
  red: 'text-red',
  blue: 'text-blue',
};

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = 'txt',
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-panel p-3.5">
      {icon && (
        <div className="rounded-lg border border-line2 bg-panel3 p-2 text-mut">{icon}</div>
      )}
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-mut">{label}</div>
        <div className={cn('mt-0.5 truncate font-mono text-lg font-bold leading-tight', TONES[tone])}>{value}</div>
        {sub && <div className="mt-0.5 truncate text-[11px] text-mut2">{sub}</div>}
      </div>
    </div>
  );
}

const BADGE: Record<string, string> = {
  ok: 'bg-mint/10 text-mint border-mint/30',
  warn: 'bg-amber/10 text-amber2 border-amber/30',
  bad: 'bg-red/10 text-red border-red/30',
  info: 'bg-blue/10 text-blue border-blue/30',
  mut: 'bg-panel3 text-mut border-line2',
};

export function Badge({ tone = 'mut', children, className }: { tone?: keyof typeof BADGE; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide',
        BADGE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Empty({ icon = 'box', title, sub, note }: { icon?: string; title: string; sub?: string; note?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line2 px-6 py-10 text-center">
      <div className="rounded-xl border border-line2 bg-panel3 p-3 text-mut2">
        <Ic n={icon} c="h-7 w-7" />
      </div>
      <div className="mt-1 text-[13px] font-medium text-mut">{title}</div>
      {sub && <div className="max-w-[280px] text-[11.5px] leading-relaxed text-mut2">{sub}</div>}
      {note && (
        <div className="mt-2 rounded-md border border-line bg-ink/60 px-3 py-1.5 font-mono text-[10px] tracking-wide text-mut2">
          {note}
        </div>
      )}
    </div>
  );
}

export function ScreenHead({
  title,
  icon,
  desc,
  actions,
}: {
  title: string;
  icon: string;
  desc: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg border border-amber/40 bg-amber/10 p-2 text-amber">
          <Ic n={icon} c="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-mono text-[15px] font-bold tracking-wide">{title}</h2>
          <p className="text-[11px] text-mut2">{desc}</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn('whitespace-nowrap px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-mut2', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2.5 align-middle text-[12.5px]', className)}>{children}</td>;
}
