import type { ReactNode } from "react";
import Link from "next/link";
import { geometry } from "@/lib/ribbon";
import { BowLoop, RibbonDefs, ribbonIds } from "./ribbon-defs";

const ids = ribbonIds("hdr");
const SCALE = 0.22;

// The bow drawn around a knot at (170, 200).
const cx = 170,
  cy = 200;
const { loop, front, piece, knot } = geometry(cx, cy);

// The bow's box in the wrap's coordinates: loops, knot and both tails, with
// room for the tips and shadow.
const BOX = { x: 70, y: 150, w: 200, h: 172 };

// The wordmark, anything on the right (the currency picker on signed-in
// pages), and the satin ribbon with its bow. No data, so error pages can use it.
export function RibbonHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="relative pt-5 pb-9">
      <div className="mx-auto flex w-full max-w-[640px] items-center justify-between px-4 pb-5">
        <Link href="/" className="inline-flex min-h-11 items-center font-display text-[30px] leading-none text-deep-red sm:text-4xl">
          Giftbook
        </Link>
        {right}
      </div>
      <div className="relative">
        <svg
          aria-hidden
          width="100%"
          height="7"
          className="block drop-shadow-[0_1px_1.5px_rgba(61,26,0,0.3)]"
        >
          <defs>
            <linearGradient
              id="hdr-line"
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
          </defs>
          <rect width="100%" height="7" fill="url(#hdr-line)" />
        </svg>
        <HeaderBow />
      </div>
    </header>
  );
}

// The wrap's bow in its tied pose, small, with the knot on the ribbon line.
function HeaderBow() {
  const left = piece(140, 168, 116, 100);
  const right = piece(200, 172, 64, 100);
  return (
    <svg
      aria-hidden
      viewBox={`${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`}
      width={BOX.w * SCALE}
      height={BOX.h * SCALE}
      className="absolute left-[70%] overflow-visible"
      style={{
        top: 3.5 - (cy - BOX.y) * SCALE,
        marginLeft: -(cx - BOX.x) * SCALE,
      }}
    >
      <RibbonDefs ids={ids} />
      <g filter={`url(#${ids.ds})`}>
        {[left, right].map(([path, tip], i) => (
          <g key={i}>
            <path d={path} fill="none" stroke={`url(#${ids.sat})`} strokeWidth="24" strokeLinejoin="round" />
            <path d={tip} fill={`url(#${ids.sat})`} />
          </g>
        ))}
        <BowLoop ids={ids} side="left" loop={loop(-1, 80, 1, 4)} front={front(-1, 80)} />
        <BowLoop ids={ids} side="right" loop={loop(1, 80, 1, 4)} front={front(1, 80)} />
        <rect {...knot(1)} fill={`url(#${ids.sat})`} />
        <rect {...knot(1)} fill={`url(#${ids.shK})`} />
      </g>
    </svg>
  );
}
