import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export function Dialog({ title, children, onClose, busy = false, wide = false }: {
  title: string; children: React.ReactNode; onClose: () => void; busy?: boolean; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} aria-labelledby="dialog-title" className={`app-dialog ${wide ? 'app-dialog-wide' : ''}`} onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter((element) => element.offsetParent !== null);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><Icon name="close" /></button>
      </div>
      {children}
    </dialog>
  );
}
