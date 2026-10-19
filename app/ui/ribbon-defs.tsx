import type { Ref } from "react";

// Gradients and shadow for the ribbon. Ids are prefixed so several SVGs can
// sit on one page.
export function ribbonIds(prefix: string) {
  const id = (name: string) => `${prefix}-${name}`;
  return {
    sat: id("sat"),
    shL: id("shL"),
    shR: id("shR"),
    shK: id("shK"),
    ds: id("ds"),
    satD: id("satD"),
    fs: id("fs"),
    clipL: id("clipL"),
    clipR: id("clipR"),
  };
}

export type RibbonIds = ReturnType<typeof ribbonIds>;

// The satin sheen is anchored at `satAt` (the knot), so it sits the same way
// on the ribbon whatever the screen size.
export function RibbonDefs({
  ids,
  satAt = [0, 0],
  satRef,
  satDRef,
}: {
  ids: RibbonIds;
  satAt?: [number, number];
  satRef?: Ref<SVGLinearGradientElement>;
  satDRef?: Ref<SVGLinearGradientElement>;
}) {
  return (
    <defs>
      <linearGradient
        ref={satRef}
        id={ids.sat}
        gradientTransform={`translate(${satAt[0]} ${satAt[1]})`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2="110"
        y2="70"
        spreadMethod="reflect"
      >
        <stop offset="0" stopColor="#0b0b0d" />
        <stop offset=".55" stopColor="#18181c" />
        <stop offset=".82" stopColor="#34343a" />
        <stop offset="1" stopColor="#4e4e56" />
      </linearGradient>
      <linearGradient
        ref={satDRef}
        id={ids.satD}
        gradientTransform={`translate(${satAt[0]} ${satAt[1]})`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2="110"
        y2="70"
        spreadMethod="reflect"
      >
        <stop offset="0" stopColor="#060607" />
        <stop offset=".55" stopColor="#0e0e11" />
        <stop offset=".82" stopColor="#202025" />
        <stop offset="1" stopColor="#303036" />
      </linearGradient>
      <linearGradient id={ids.shL} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000000" stopOpacity=".12" />
        <stop offset=".6" stopColor="#000000" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity=".45" />
      </linearGradient>
      <linearGradient id={ids.shR} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#000000" stopOpacity=".12" />
        <stop offset=".6" stopColor="#000000" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity=".45" />
      </linearGradient>
      <linearGradient id={ids.shK} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000000" stopOpacity=".4" />
        <stop offset=".5" stopColor="#000000" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity=".4" />
      </linearGradient>
      <filter id={ids.ds}>
        <feDropShadow dx="1" dy="3" stdDeviation="2.5" floodColor="#3d1a00" floodOpacity=".3" />
      </filter>
      <filter id={ids.fs}>
        <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000" floodOpacity=".75" />
      </filter>
    </defs>
  );
}

// One bow loop in two layers of ribbon, clipped to the loop's outline: the
// darker lower layer, the upper layer casting a shadow onto it, then the
// shading across both. `loop` and `front` come from geometry().
export function BowLoop({
  ids,
  side,
  loop,
  front,
  clipRef,
  lowerRef,
  frontRef,
  shadeRef,
}: {
  ids: RibbonIds;
  side: "left" | "right";
  loop: string;
  front: string;
  // For the wrap, which redraws all four as the bow unties.
  clipRef?: Ref<SVGPathElement>;
  lowerRef?: Ref<SVGPathElement>;
  frontRef?: Ref<SVGPathElement>;
  shadeRef?: Ref<SVGPathElement>;
}) {
  const clipId = side === "left" ? ids.clipL : ids.clipR;
  return (
    <>
      <clipPath id={clipId}>
        <path ref={clipRef} d={loop} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path ref={lowerRef} d={loop} fill={`url(#${ids.satD})`} />
        <g filter={`url(#${ids.fs})`}>
          <path ref={frontRef} d={front} fill={`url(#${ids.sat})`} />
        </g>
        <path ref={shadeRef} d={loop} fill={`url(#${side === "left" ? ids.shL : ids.shR})`} />
      </g>
    </>
  );
}
