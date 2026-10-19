// Placeholders shown while a page's data loads: a slow gold sheen.

export function PeopleSkeleton() {
  return (
    <ul aria-hidden className="grid grid-cols-2 gap-x-3 gap-y-8 pt-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex flex-col items-center gap-3">
          <span className="skeleton block size-[72px] rounded-full sm:size-24" />
          <span className="skeleton block h-5 w-20" />
        </li>
      ))}
    </ul>
  );
}

export function PersonSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-8 pt-2">
      <div className="h-11" />
      <div className="flex items-center gap-4">
        <span className="skeleton block size-[72px] shrink-0 rounded-full" />
        <span className="skeleton block h-9 w-40" />
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex flex-col bg-card shadow-[0_0_0_1px_var(--color-card-line)]">
            <span className="skeleton block aspect-square w-full" />
            <span className="flex flex-col gap-2 p-3">
              <span className="skeleton block h-5 w-3/4" />
              <span className="skeleton block h-6 w-14 rounded-full" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
