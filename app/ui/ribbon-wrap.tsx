"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap } from "gsap";
import { S0, ribbonShapes, type RibbonState } from "@/lib/ribbon";
import { RibbonDefs, ribbonIds } from "./ribbon-defs";

// The unwrap plays once per full page load. Module state resets on a full
// load but survives client-side navigation, so later mounts render nothing.
let playedThisLoad = false;

const SEEN_KEY = "gifts:unwrapped";

// Full speed on the first load of a browser session, quicker after that.
function speedForThisLoad(): number {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return 2.2;
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // storage unavailable; play at full speed
  }
  return 1;
}

// The gift wrap over the whole screen. "static" holds the tied pose (login);
// "unwrap" is rendered on the server so nothing flashes, then unties and
// slides away.
export function RibbonWrap({ mode }: { mode: "static" | "unwrap" }) {
  const ids = ribbonIds(`rw${useId().replace(/[^a-zA-Z0-9]/g, "")}`);
  const [show, setShow] = useState(() => mode === "static" || !playedThisLoad);
  const speed = useRef<number | null>(null);

  const pl = useRef<SVGRectElement>(null);
  const pr = useRef<SVGRectElement>(null);
  const v = useRef<SVGPathElement>(null);
  const lpg = useRef<SVGGElement>(null);
  const lp = useRef<SVGPathElement>(null);
  const lt = useRef<SVGPathElement>(null);
  const rpg = useRef<SVGGElement>(null);
  const rp = useRef<SVGPathElement>(null);
  const rt = useRef<SVGPathElement>(null);
  const bow = useRef<SVGGElement>(null);
  const loopL = useRef<SVGPathElement>(null);
  const shadeL = useRef<SVGPathElement>(null);
  const loopR = useRef<SVGPathElement>(null);
  const shadeR = useRef<SVGPathElement>(null);
  const knot = useRef<SVGRectElement>(null);
  const knotShade = useRef<SVGRectElement>(null);

  useEffect(() => {
    if (mode !== "unwrap" || !show) return;
    playedThisLoad = true;
    // Hidden by CSS already; take it out once the page is interactive.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setShow(false));
      return () => cancelAnimationFrame(id);
    }
    speed.current ??= speedForThisLoad();

    const S: RibbonState = { ...S0 };
    function render() {
      const s = ribbonShapes(S);
      v.current?.setAttribute("d", s.v);
      lp.current?.setAttribute("d", s.left[0]);
      lt.current?.setAttribute("d", s.left[1]);
      rp.current?.setAttribute("d", s.right[0]);
      rt.current?.setAttribute("d", s.right[1]);
      for (const el of [loopL.current, shadeL.current]) el?.setAttribute("d", s.loopL);
      for (const el of [loopR.current, shadeR.current]) el?.setAttribute("d", s.loopR);
      for (const el of [knot.current, knotShade.current]) {
        if (!el) continue;
        el.setAttribute("x", String(s.knot.x));
        el.setAttribute("y", String(s.knot.y));
        el.setAttribute("width", String(s.knot.width));
        el.setAttribute("height", String(s.knot.height));
        el.setAttribute("rx", String(s.knot.rx));
      }
    }

    const tl = gsap.timeline({ paused: true, onUpdate: render, onComplete: () => setShow(false) });
    tl.to(S, { L: 10, rl: 150, ra: 52, duration: 1.1, ease: "power1.inOut" })
      .to(S, { L: 0, k: 0.85, duration: 0.15, ease: "power2.in" })
      .to(S, { R: 0, hR: 0, h: 0, k: 0, tilt: 0, duration: 0.2, ease: "power2.in" })
      .set(bow.current, { opacity: 0 })
      .to(S, { ltx: 126, la: 97, ll: 88, rtx: 216, ra: 84, rl: 118, duration: 1, ease: "elastic.out(1,0.4)" }, "-=0.08")
      .to(S, { qx: 182, ty: -5, duration: 0.35, ease: "sine.inOut" }, "-=0.35")
      .to(S, { tx: -20, ty: -20, qx: 90, qy: 250, duration: 0.6, ease: "power1.in" })
      .to(S, { tx: -300, ty: 430, qx: -60, qy: 430, duration: 0.5, ease: "power2.in" })
      .to(S, { bx: -120, by: 520, duration: 0.3, ease: "power2.in" }, "-=0.15")
      .to(lpg.current, { y: 620, x: -20, rotation: -8, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.in" }, "<-0.35")
      .to(rpg.current, { y: 620, x: 20, rotation: 8, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.in" }, "<")
      .to(pl.current, { x: -180, duration: 0.6, ease: "power2.inOut" }, "-=0.15")
      .to(pr.current, { x: 180, duration: 0.6, ease: "power2.inOut" }, "<");
    tl.timeScale(speed.current).play();
    return () => {
      tl.kill();
    };
  }, [mode, show]);

  if (!show) return null;
  const s = ribbonShapes(S0);

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] ${mode === "unwrap" ? "ribbon-unwrap" : ""}`}
    >
      <svg
        viewBox="0 0 340 480"
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
      >
        <RibbonDefs ids={ids} />
        <rect ref={pl} x="0" y="0" width="171" height="480" fill={`url(#${ids.gold})`} />
        <rect ref={pr} x="170" y="0" width="170" height="480" fill={`url(#${ids.gold})`} />
        <g filter={`url(#${ids.ds})`}>
          <path ref={v} d={s.v} fill="none" stroke={`url(#${ids.sat})`} strokeWidth="24" />
          <g ref={lpg}>
            <path ref={lp} d={s.left[0]} fill="none" stroke={`url(#${ids.sat})`} strokeWidth="24" strokeLinejoin="round" />
            <path ref={lt} d={s.left[1]} fill={`url(#${ids.sat})`} />
          </g>
          <g ref={rpg}>
            <path ref={rp} d={s.right[0]} fill="none" stroke={`url(#${ids.sat})`} strokeWidth="24" strokeLinejoin="round" />
            <path ref={rt} d={s.right[1]} fill={`url(#${ids.sat})`} />
          </g>
          <g ref={bow}>
            <path ref={loopL} d={s.loopL} fill={`url(#${ids.sat})`} />
            <path ref={shadeL} d={s.loopL} fill={`url(#${ids.shL})`} />
            <path ref={loopR} d={s.loopR} fill={`url(#${ids.sat})`} />
            <path ref={shadeR} d={s.loopR} fill={`url(#${ids.shR})`} />
            <rect ref={knot} {...s.knot} fill={`url(#${ids.sat})`} />
            <rect ref={knotShade} {...s.knot} fill={`url(#${ids.shK})`} />
          </g>
        </g>
      </svg>
    </div>
  );
}
