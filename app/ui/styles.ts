// Ink pill: the main action. Lightens on hover; faded only when disabled.
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 py-2.5 text-gold-text transition-colors hover:bg-ink-hover disabled:opacity-60 disabled:hover:bg-ink";

// Outlined pill, for toggles like Plan and Filter; filled when on.
export const pillClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-ink px-5 py-2.5 transition-colors hover:bg-ink/8";

// 16px text, so iOS doesn't zoom in on focus.
export const fieldClass =
  "min-h-11 w-full rounded-[10px] border border-gold-mid bg-white px-3 py-2.5 text-base text-ink focus:outline-2 focus:outline-ink";

// Text links and text buttons, with a tap area of at least 44px.
export const linkButtonClass = "inline-flex min-h-11 min-w-11 items-center text-ink hover:underline focus-visible:underline disabled:opacity-60";
