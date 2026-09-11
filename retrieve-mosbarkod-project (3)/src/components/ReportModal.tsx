import { useState } from 'react';
import { Ic } from '../icons';
import { Btn, Modal } from './ui';
import { waLink } from '../lib/report';

export default function ReportModal({
  title,
  text,
  phone,
  onClose,
}: {
  title: string;
  text: string;
  phone: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal
      title={title}
      icon={<Ic n="phone" c="h-4.5 w-4.5" />}
      onClose={onClose}
      w="max-w-md"
      footer={
        <>
          <Btn
            v="ghost"
            onClick={() => {
              navigator.clipboard?.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            <Ic n={copied ? 'check' : 'file'} c="h-4 w-4" /> {copied ? 'Kopyalandı' : 'Kopyala'}
          </Btn>
          <Btn v="mint" onClick={() => window.open(waLink(phone, text), '_blank')}>
            <Ic n="phone" c="h-4 w-4" /> WhatsApp'ta Aç
          </Btn>
        </>
      }
    >
      <div className="rounded-xl bg-[#0b141a] p-3">
        <div className="mx-auto max-w-[320px] rounded-lg rounded-tl-none bg-[#005c4b] p-3 shadow-lg">
          <div className="mb-1.5 flex items-center gap-2 border-b border-white/10 pb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25d366] font-mono text-[11px] font-bold text-[#06231a]">
              WA
            </span>
            <div>
              <div className="text-[11.5px] font-bold text-white">
                {phone.replace(/\D/g, '').replace(/^90/, '+90 ')}
              </div>
              <div className="text-[9px] text-white/60">online</div>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed text-[#d6f5e9]">
            {text}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
