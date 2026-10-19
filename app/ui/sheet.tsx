"use client";

import { useEffect, useRef, type ReactNode, type TouchEvent } from "react";

const CLOSE_DISTANCE = 90;

// A modal: a bottom sheet on mobile, a centred panel from sm up. Esc, the
// backdrop and onClose all close it; on phones, so does swiping it down.
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
  const drag = useRef<{ startY: number; dy: number } | null>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Swipe down from the top of the sheet's content to close it.
  function onTouchStart(e: TouchEvent<HTMLDialogElement>) {
    const el = e.currentTarget;
    if (el.scrollTop > 0 || !window.matchMedia("(max-width: 639px)").matches) return;
    drag.current = { startY: e.touches[0].clientY, dy: 0 };
    el.style.transition = "none";
  }

  function onTouchMove(e: TouchEvent<HTMLDialogElement>) {
    if (!drag.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.startY);
    e.currentTarget.style.transform = `translateY(${drag.current.dy}px)`;
  }

  function onTouchEnd(e: TouchEvent<HTMLDialogElement>) {
    if (!drag.current) return;
    const el = e.currentTarget;
    const closing = drag.current.dy > CLOSE_DISTANCE;
    drag.current = null;
    el.style.transition = "transform 150ms ease-out";
    el.style.transform = "";
    if (closing) onClose();
  }

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className="mx-0 mt-auto mb-0 rounded-t-[20px] sm:rounded-[20px] max-h-[90dvh] w-full max-w-none overflow-y-auto overscroll-contain bg-cream p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink backdrop:bg-ink/50 sm:m-auto sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:p-6"
    >
      <span aria-hidden className="mx-auto mb-3 block h-1 w-10 bg-gold-mid sm:hidden" />
      {open && children}
    </dialog>
  );
}
