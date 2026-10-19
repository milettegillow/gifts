"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import {
  SERVER_FRAME,
  frameFor,
  ribbonShapes,
  tiedState,
  type Frame,
  type RibbonState,
} from "@/lib/ribbon";
import { BowLoop, RibbonDefs, ribbonIds } from "./ribbon-defs";

// The unwrap plays once per full page load. Module state resets on a full
// load but survives client-side navigation, so later mounts render nothing.
let playedThisLoad = false;

const SEEN_KEY = "giftbook:unwrapped";

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
// slides away. Children sit on top, in the same space as the bow; with
// `tagString`, the gift tag's string runs from under the knot to its hole.
//
// The ribbon is drawn in a W x H space where one unit is s screen px (see
// lib/ribbon.ts). CSS places and scales it (.ribbon-space), so the server's
// first paint is already the right size; the unwrap swaps in the exact
// frame for this screen on mount, which looks identical.
export function RibbonWrap({
  mode,
  tagString = false,
  children,
}: {
  mode: "static" | "unwrap";
  tagString?: boolean;
  children?: ReactNode;
}) {
  const ids = ribbonIds(`rw${useId().replace(/[^a-zA-Z0-9]/g, "")}`);
  const [show, setShow] = useState(() => mode === "static" || !playedThisLoad);
  const speed = useRef<number | null>(null);

  const wrap = useRef<HTMLDivElement>(null);
  const pl = useRef<HTMLDivElement>(null);
  const pr = useRef<HTMLDivElement>(null);
  const sat = useRef<SVGLinearGradientElement>(null);
  const satD = useRef<SVGLinearGradientElement>(null);
  const origin = useRef<SVGGElement>(null);
  const v = useRef<SVGPathElement>(null);
  const lpg = useRef<SVGGElement>(null);
  const lp = useRef<SVGPathElement>(null);
  const lt = useRef<SVGPathElement>(null);
  const rpg = useRef<SVGGElement>(null);
  const rp = useRef<SVGPathElement>(null);
  const rt = useRef<SVGPathElement>(null);
  const bow = useRef<SVGGElement>(null);
  // Each loop: its clip, lower layer, upper layer and shading.
  const clipL = useRef<SVGPathElement>(null);
  const lowerL = useRef<SVGPathElement>(null);
  const frontL = useRef<SVGPathElement>(null);
  const shadeL = useRef<SVGPathElement>(null);
  const clipR = useRef<SVGPathElement>(null);
  const lowerR = useRef<SVGPathElement>(null);
  const frontR = useRef<SVGPathElement>(null);
  const shadeR = useRef<SVGPathElement>(null);
  const knot = useRef<SVGRectElement>(null);
  const knotShade = useRef<SVGRectElement>(null);

  useEffect(() => {
    if (mode !== "unwrap" || !show || !wrap.current) return;
    playedThisLoad = true;
    // Hidden by CSS already; take it out once the page is interactive.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setShow(false));
      return () => cancelAnimationFrame(id);
    }
    speed.current ??= speedForThisLoad();

    // Measured from the overlay itself, which is what the CSS scales against.
    const { s, frame: F } = frameFor(wrap.current.clientWidth, wrap.current.clientHeight);
    const { W, H, cx, cy } = F;
    const S: RibbonState = tiedState(F);
    origin.current?.setAttribute("transform", `translate(${-cx} ${-cy})`);
    for (const g of [sat.current, satD.current]) g?.setAttribute("gradientTransform", `translate(${cx} ${cy})`);

    function render() {
      const shapes = ribbonShapes(S, F);
      v.current?.setAttribute("d", shapes.v);
      lp.current?.setAttribute("d", shapes.left[0]);
      lt.current?.setAttribute("d", shapes.left[1]);
      rp.current?.setAttribute("d", shapes.right[0]);
      rt.current?.setAttribute("d", shapes.right[1]);
      // Each loop's clip, lower layer and shading share its outline.
      for (const el of [clipL.current, lowerL.current, shadeL.current]) el?.setAttribute("d", shapes.loopL);
      for (const el of [clipR.current, lowerR.current, shadeR.current]) el?.setAttribute("d", shapes.loopR);
      frontL.current?.setAttribute("d", shapes.frontL);
      frontR.current?.setAttribute("d", shapes.frontR);
      for (const el of [knot.current, knotShade.current]) {
        if (!el) continue;
        el.setAttribute("x", String(shapes.knot.x));
        el.setAttribute("y", String(shapes.knot.y));
        el.setAttribute("width", String(shapes.knot.width));
        el.setAttribute("height", String(shapes.knot.height));
        el.setAttribute("rx", String(shapes.knot.rx));
      }
    }
    render();

    // The paper is HTML, so it slides in screen px.
    const slide = (W / 2 + 10) * s;
    const tl = gsap.timeline({ paused: true, onUpdate: render, onComplete: () => setShow(false) });
    tl.to(S, { L: 10, rl: 150, ra: 52, duration: 1.1, ease: "power1.inOut" })
      .to(S, { L: 0, k: 0.85, duration: 0.15, ease: "power2.in" })
      .to(S, { R: 0, hR: 0, h: 0, k: 0, tilt: 0, duration: 0.2, ease: "power2.in" })
      .set(bow.current, { opacity: 0 })
      .to(S, { ltx: cx - 44, la: 97, ll: 88, rtx: cx + 46, ra: 84, rl: 118, duration: 1, ease: "elastic.out(1,0.4)" }, "-=0.08")
      .to(S, { qx: cx + 12, ty: -5, duration: 0.35, ease: "sine.inOut" }, "-=0.35")
      .to(S, { tx: -20, ty: -20, qx: cx - 80, qy: cy + 50, duration: 0.6, ease: "power1.in" })
      .to(S, { tx: -300, ty: cy + 230, qx: -60, qy: cy + 230, duration: 0.5, ease: "power2.in" })
      .to(S, { bx: -120, by: H + 40, duration: 0.3, ease: "power2.in" }, "-=0.15")
      .to(lpg.current, { y: H + 140, x: -20, rotation: -8, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.in" }, "<-0.35")
      .to(rpg.current, { y: H + 140, x: 20, rotation: 8, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.in" }, "<")
      .to(pl.current, { x: -slide, duration: 0.6, ease: "power2.inOut" }, "-=0.15")
      .to(pr.current, { x: slide, duration: 0.6, ease: "power2.inOut" }, "<");
    tl.timeScale(speed.current).play();
    return () => {
      tl.kill();
    };
  }, [mode, show]);

  if (!show) return null;
  const F: Frame = SERVER_FRAME;
  const shapes = ribbonShapes(tiedState(F), F);

  return (
    <div
      ref={wrap}
      // The unwrap is decoration; the login wrap holds the tag form.
      aria-hidden={mode === "unwrap" ? true : undefined}
      className={`ribbon-wrap fixed inset-0 z-[100] ${mode === "unwrap" ? "ribbon-unwrap" : ""}`}
    >
      <div ref={pl} aria-hidden className="ribbon-paper left-0 w-[calc(50%+1px)]" />
      <div ref={pr} aria-hidden className="ribbon-paper ribbon-paper-right left-1/2 w-1/2" />
      <svg aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
        <RibbonDefs ids={ids} satAt={[F.cx, F.cy]} satRef={sat} satDRef={satD} />
        <g className="ribbon-space">
          <g ref={origin} transform={`translate(${-F.cx} ${-F.cy})`}>
            <g filter={`url(#${ids.ds})`}>
              <path ref={v} d={shapes.v} fill="none" stroke={`url(#${ids.sat})`} strokeWidth="24" />
              <g ref={lpg}>
                <path ref={lp} d={shapes.left[0]} fill="none" stroke={`url(#${ids.sat})`} strokeWidth="24" strokeLinejoin="round" />
                <path ref={lt} d={shapes.left[1]} fill={`url(#${ids.sat})`} />
              </g>
              <g ref={rpg}>
                <path ref={rp} d={shapes.right[0]} fill="none" stroke={`url(#${ids.sat})`} strokeWidth="24" strokeLinejoin="round" />
                <path ref={rt} d={shapes.right[1]} fill={`url(#${ids.sat})`} />
              </g>
              <g ref={bow}>
                <BowLoop ids={ids} side="left" loop={shapes.loopL} front={shapes.frontL} clipRef={clipL} lowerRef={lowerL} frontRef={frontL} shadeRef={shadeL} />
                <BowLoop ids={ids} side="right" loop={shapes.loopR} front={shapes.frontR} clipRef={clipR} lowerRef={lowerR} frontRef={frontR} shadeRef={shadeR} />
                {tagString && (
                  <g transform={`translate(${F.cx} ${F.cy})`}>
                    <rect className="gift-tag-string" x="0" y="-0.75" width="1" height="1.5" />
                  </g>
                )}
                <rect ref={knot} {...shapes.knot} fill={`url(#${ids.sat})`} />
                <rect ref={knotShade} {...shapes.knot} fill={`url(#${ids.shK})`} />
              </g>
            </g>
          </g>
        </g>
      </svg>
      {children}
    </div>
  );
}
