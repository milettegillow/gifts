// Gradients and shadow for the ribbon. Ids are prefixed so several SVGs can
// sit on one page.
export function ribbonIds(prefix: string) {
  const id = (name: string) => `${prefix}-${name}`;
  return {
    gold: id("gold"),
    sat: id("sat"),
    shL: id("shL"),
    shR: id("shR"),
    shK: id("shK"),
    ds: id("ds"),
  };
}

export type RibbonIds = ReturnType<typeof ribbonIds>;

export function RibbonDefs({ ids }: { ids: RibbonIds }) {
  return (
    <defs>
      <linearGradient id={ids.gold} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="340" y2="480">
        <stop offset="0" stopColor="#a8782a" />
        <stop offset=".3" stopColor="#f3d68a" />
        <stop offset=".5" stopColor="#c9973e" />
        <stop offset=".72" stopColor="#f7e3a6" />
        <stop offset="1" stopColor="#a8782a" />
      </linearGradient>
      <linearGradient
        id={ids.sat}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2="110"
        y2="70"
        spreadMethod="reflect"
      >
        <stop offset="0" stopColor="#8a1324" />
        <stop offset=".55" stopColor="#a3182c" />
        <stop offset=".82" stopColor="#c93449" />
        <stop offset="1" stopColor="#d9475b" />
      </linearGradient>
      <linearGradient id={ids.shL} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#3a0008" stopOpacity=".12" />
        <stop offset=".6" stopColor="#3a0008" stopOpacity="0" />
        <stop offset="1" stopColor="#3a0008" stopOpacity=".45" />
      </linearGradient>
      <linearGradient id={ids.shR} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#3a0008" stopOpacity=".12" />
        <stop offset=".6" stopColor="#3a0008" stopOpacity="0" />
        <stop offset="1" stopColor="#3a0008" stopOpacity=".45" />
      </linearGradient>
      <linearGradient id={ids.shK} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#3a0008" stopOpacity=".4" />
        <stop offset=".5" stopColor="#3a0008" stopOpacity="0" />
        <stop offset="1" stopColor="#3a0008" stopOpacity=".4" />
      </linearGradient>
      <filter id={ids.ds}>
        <feDropShadow dx="1" dy="3" stdDeviation="2.5" floodColor="#3d1a00" floodOpacity=".3" />
      </filter>
    </defs>
  );
}
