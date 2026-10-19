// Placeholders shown while a page's data loads: cream with a slow gold sheen.

export function PeopleSkeleton() {
  return (
    <ul aria-hidden className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="skeleton h-[164px]" />
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
          <li key={i} className="flex flex-col bg-cream">
            <span className="skeleton block aspect-square w-full" />
            <span className="flex flex-col gap-2 p-3">
              <span className="skeleton block h-5 w-3/4" />
              <span className="skeleton block h-6 w-12" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
