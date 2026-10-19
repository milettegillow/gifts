// A box with an arrow out of it: opens in a new tab.
export function LinkIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M11 3h6v6M17 3l-8 8M14 12v4.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5H8" />
    </svg>
  );
}
