"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A modal: a bottom sheet on mobile, a centred panel from sm up. Esc, the
// backdrop and onClose all close it.
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-0 mt-auto mb-0 max-h-[90dvh] w-full max-w-none overflow-y-auto bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink backdrop:bg-ink/50 sm:m-auto sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:p-6"
    >
      {open && children}
    </dialog>
  );
}
