"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import {
  SERVER_FRAME,
  frameFor,
  MARGIN,
  ribbonShapes,
  tagPlace,
  TAG,
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
// lib/ribbon.ts). On the server, CSS places and scales it (.ribbon-space), so
// the first paint is already the right size; on mount the exact frame for
// this screen takes over as the SVG's viewBox, which looks identical. The
// static wrap recalculates it on resize.
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
  const [view, setView] = useState<{ s: number; frame: Frame } | null>(null);
  // How far the unwrap had got, kept if a resize redraws it mid-way.
  const progress = useRef(0);

  const wrap = useRef<HTMLDivElement>(null);
  const pl = useRef<HTMLDivElement>(null);
  const pr = useRef<HTMLDivElement>(null);
  const v = useRef<SVGPathElement>(null);
  const lpg = useRef<SVGGElement>(null);
  const lp = useRef<SVGPathElement>(null);
  const lt = useRef<SVGPathElement>(null);
  const rpg = useRef<SVGGElement>(null);
  const rp = useRef<SVGPathElement>(null);
  const rt = useRef<SVGPathElement>(null);
  const bow = useRef<SVGGElement>(null);
  // Each loop: its lower layer, upper layer and shading.
  const lowerL = useRef<SVGPathElement>(null);
  const frontL = useRef<SVGPathElement>(null);
  const shadeL = useRef<SVGPathElement>(null);
  const lowerR = useRef<SVGPathElement>(null);
  const frontR = useRef<SVGPathElement>(null);
  const shadeR = useRef<SVGPathElement>(null);
  const knot = useRef<SVGRectElement>(null);
  const knotShade = useRef<SVGRectElement>(null);

  // Measured from the overlay itself (100lvh tall, so it covers the screen
  // behind Safari's toolbars too), not the window.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!show || !el) return;
    let size = "";
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (`${width}x${height}` === size) return;
      size = `${width}x${height}`;
      setView(frameFor(width, height));
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [show]);

  useEffect(() => {
    if (mode !== "unwrap" || !show || !view) return;
    playedThisLoad = true;
    // Hidden by CSS already; take it out once the page is interactive.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setShow(false));
      return () => cancelAnimationFrame(id);
    }
    speed.current ??= speedForThisLoad();

    const { s, frame: F } = view;
    const { W, H, cx, cy } = F;
    const S: RibbonState = tiedState(F);

    function render() {
      const shapes = ribbonShapes(S, F);
      v.current?.setAttribute("d", shapes.v);
      lp.current?.setAttribute("d", shapes.left[0]);
      lt.current?.setAttribute("d", shapes.left[1]);
      rp.current?.setAttribute("d", shapes.right[0]);
      rt.current?.setAttribute("d", shapes.right[1]);
      // Each loop's lower layer and shading share its outline.
      for (const el of [lowerL.current, shadeL.current]) el?.setAttribute("d", shapes.loopL);
      for (const el of [lowerR.current, shadeR.current]) el?.setAttribute("d", shapes.loopR);
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

    // Start clean if a resize is redrawing the unwrap.
    gsap.set([lpg.current, rpg.current, pl.current, pr.current, bow.current], { clearProps: "transform,opacity" });

    // Everything leaves by at least MARGIN units. The paper is HTML, so it
    // slides in screen px.
    const M = MARGIN;
    const slide = (W / 2 + 10 + M) * s;
    const tl = gsap.timeline({ paused: true, onUpdate: render, onComplete: () => setShow(false) });
    tl.to(S, { L: 10, rl: 150, ra: 52, duration: 1.1, ease: "power1.inOut" })
      .to(S, { L: 0, k: 0.85, duration: 0.15, ease: "power2.in" })
      .to(S, { R: 0, hR: 0, h: 0, k: 0, tilt: 0, duration: 0.2, ease: "power2.in" })
      .set(bow.current, { opacity: 0 })
      .to(S, { ltx: cx - 44, la: 97, ll: 88, rtx: cx + 46, ra: 84, rl: 118, duration: 1, ease: "elastic.out(1,0.4)" }, "-=0.08")
      .to(S, { qx: cx + 12, ty: 15 - M, duration: 0.35, ease: "sine.inOut" }, "-=0.35")
      .to(S, { tx: -20 - M, ty: -20 - M, qx: cx - 80, qy: cy + 50, duration: 0.6, ease: "power1.in" })
      .to(S, { tx: -300 - M, ty: cy + 230, qx: -60 - M, qy: cy + 230, duration: 0.5, ease: "power2.in" })
      .to(S, { bx: -120 - M, by: H + 40 + M, duration: 0.3, ease: "power2.in" }, "-=0.15")
      .to(lpg.current, { y: H + 140 + M, x: -20, rotation: -8, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.in" }, "<-0.35")
      .to(rpg.current, { y: H + 140 + M, x: 20, rotation: 8, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.in" }, "<")
      .to(pl.current, { x: -slide, duration: 0.6, ease: "power2.inOut" }, "-=0.15")
      .to(pr.current, { x: slide, duration: 0.6, ease: "power2.inOut" }, "<");
    tl.timeScale(speed.current).progress(progress.current).play();
    return () => {
      progress.current = tl.progress();
      tl.kill();
    };
  }, [mode, show, view]);

  if (!show) return null;
  const F: Frame = view?.frame ?? SERVER_FRAME;
  const shapes = ribbonShapes(tiedState(F), F);
  const tag = tagPlace(F);

  // The paper and the tag are HTML, placed in screen px from the same frame.
  // Before mount, CSS fallbacks in .ribbon-wrap stand in.
  const deg = (rad: number) => (rad * 180) / Math.PI;
  let style: CSSProperties | undefined;
  if (view) {
    const { s } = view;
    // The paper's gradient runs corner to corner of the paper, margin included.
    style = { "--s": s, "--paper-angle": `${180 - deg(Math.atan2(F.W + 2 * MARGIN, F.H + 2 * MARGIN))}deg` } as CSSProperties;
  }
  if (view && tagString) {
    const { s } = view;
    // The string's run across the tag face, from the hole back towards the
    // knot, in the tag's own (tilted) direction.
    const angle = deg(Math.atan2(-tag.hy, -tag.hx)) - TAG.tilt;
    style = {
      ...style,
      "--tag-left": `${(F.cx + tag.x) * s}px`,
      "--tag-top": `${(F.cy + tag.y) * s}px`,
      "--face-string-angle": `${angle}deg`,
      "--face-string-length": `${Math.hypot(tag.hx, tag.hy) * s}px`,
    } as CSSProperties;
  }

  return (
    <div
      ref={wrap}
      // The unwrap is decoration; the login wrap holds the tag form.
      aria-hidden={mode === "unwrap" ? true : undefined}
      className={`ribbon-wrap fixed inset-0 z-[100] ${mode === "unwrap" ? "ribbon-unwrap" : ""}`}
      style={style}
    >
      <div ref={pl} aria-hidden className="ribbon-paper ribbon-paper-left" />
      <div ref={pr} aria-hidden className="ribbon-paper ribbon-paper-right" />
      <svg
        aria-hidden
        viewBox={view ? `0 0 ${F.W} ${F.H}` : undefined}
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <RibbonDefs ids={ids} satAt={[F.cx, F.cy]} />
        <g className={view ? undefined : "ribbon-space"}>
          <g transform={view ? undefined : `translate(${-F.cx} ${-F.cy})`}>
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
                <BowLoop ids={ids} side="left" loop={shapes.loopL} front={shapes.frontL} lowerRef={lowerL} frontRef={frontL} shadeRef={shadeL} />
                <BowLoop ids={ids} side="right" loop={shapes.loopR} front={shapes.frontR} lowerRef={lowerR} frontRef={frontR} shadeRef={shadeR} />
                {/* From the knot centre to the tag's hole, under the knot. */}
                {tagString && (
                  <line x1={F.cx} y1={F.cy} x2={F.cx + tag.hx} y2={F.cy + tag.hy} stroke="#f7e3a6" strokeWidth="1.5" />
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
