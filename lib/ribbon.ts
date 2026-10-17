// Ribbon and bow geometry for the gift wrap. The wrap draws in a W x H space
// where the ribbon and bow keep a fixed size: one unit is s screen px, with
// s = clamp(width / 340, 1, 1.8). The knot sits at (W / 2, H * 0.42).

export type RibbonState = {
  L: number;
  R: number;
  h: number;
  hR: number;
  tilt: number;
  k: number;
  ltx: number;
  la: number;
  ll: number;
  rtx: number;
  ra: number;
  rl: number;
  tx: number;
  ty: number;
  qx: number;
  qy: number;
  bx: number;
  by: number;
};

export type Frame = { W: number; H: number; cx: number; cy: number };

export function frameFor(width: number, height: number): { s: number; frame: Frame } {
  const s = Math.min(Math.max(width / 340, 1), 1.8);
  const W = width / s,
    H = height / s;
  return { s, frame: { W, H, cx: W / 2, cy: H * 0.42 } };
}

// Drawn on the server, before the screen size is known: big enough that the
// tied pose runs off every edge of any screen. Drawn relative to the knot, it
// looks the same as the real frame.
export const SERVER_FRAME: Frame = { W: 4000, H: 4000, cx: 2000, cy: 1680 };

// The tied pose.
export function tiedState({ H, cx, cy }: Frame): RibbonState {
  return {L:80,R:80,h:1,hR:1,tilt:4,k:1,ltx:cx-2,la:116,ll:100,rtx:cx+2,ra:64,rl:100,tx:cx,ty:-20,qx:cx,qy:cy+40,bx:cx,by:H+20};
}

const P = (x: number, y: number) => x.toFixed(1) + "," + y.toFixed(1);

// The bow and ribbon shapes around a knot at (cx, cy).
export function geometry(cx: number, cy: number) {
  function loop(s: number, Lx: number, h: number, t: number) {
    const x0 = cx + s * 9;
    return `M${P(x0,cy-11*h)} C${P(cx+s*(9+.35*Lx),cy-(30*h+t))} ${P(cx+s*(Lx-4),cy-(38*h+t))} ${P(cx+s*(Lx+2),cy-(22*h+t*.8))} C${P(cx+s*(Lx+8),cy-(10*h+t*.5))} ${P(cx+s*(Lx+6),cy+6*h)} ${P(cx+s*(Lx-4),cy+11*h)} C${P(cx+s*(.6*Lx),cy+15*h)} ${P(cx+s*(.3*Lx+9),cy+15*h)} ${P(x0,cy+11*h)}Z`;
  }

  // [ribbon path, swallowtail tip]
  function piece(sx: number, tx: number, a: number, len: number): [string, string] {
    const r = a * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r), g = sx < tx ? 1 : -1;
    const E: [number, number] = [tx + dx * len, cy + dy * len];
    const nx = -dy, ny = dx;
    const e1 = [E[0] + nx * 12, E[1] + ny * 12], e2 = [E[0] - nx * 12, E[1] - ny * 12];
    return [
      `M${P(sx,cy)} L${P(tx-g*10,cy)} Q${P(tx,cy)} ${P(tx+dx*10,cy+dy*10)} L${P(...E)}`,
      `M${P(e1[0],e1[1])} L${P(e1[0]+dx*13,e1[1]+dy*13)} L${P(E[0]+dx*1,E[1]+dy*1)} L${P(e2[0]+dx*13,e2[1]+dy*13)} L${P(e2[0],e2[1])}Z`,
    ];
  }

  function knot(kIn: number) {
    const k = Math.max(kIn, 0);
    const w = (24 + 4 * k) * Math.min(1, k * 3);
    const h = (24 + 8 * k) * Math.min(1, k * 3);
    return { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 2 + 5 * k };
  }

  return { loop, piece, knot };
}

// Every shape's geometry for a given state.
export function ribbonShapes(S: RibbonState, F: Frame) {
  const { loop, piece, knot } = geometry(F.cx, F.cy);
  return {
    v: `M${P(S.tx,S.ty)} Q${P(S.qx,S.qy)} ${P(S.bx,S.by)}`,
    left: piece(0, S.ltx, S.la, S.ll),
    right: piece(F.W, S.rtx, S.ra, S.rl),
    loopL: loop(-1, Math.max(S.L, 0), Math.max(S.h, 0), S.tilt),
    loopR: loop(1, Math.max(S.R, 0), Math.max(S.hR, 0), S.tilt),
    knot: knot(S.k),
  };
}
