// Ribbon and bow geometry for the gift wrap, in a 340 x 480 viewBox. Shared
// by the full-screen wrap and the small bow in the header.

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

export const cx = 170,
  cy = 200;

// The tied pose.
export const S0: RibbonState = {L:80,R:80,h:1,hR:1,tilt:4,k:1,ltx:168,la:116,ll:100,rtx:172,ra:64,rl:100,tx:170,ty:-20,qx:170,qy:240,bx:170,by:500};

const P = (x: number, y: number) => x.toFixed(1) + "," + y.toFixed(1);

export function loop(s: number, Lx: number, h: number, t: number) {
  const x0 = cx + s * 9;
  return `M${P(x0,cy-11*h)} C${P(cx+s*(9+.35*Lx),cy-(30*h+t))} ${P(cx+s*(Lx-4),cy-(38*h+t))} ${P(cx+s*(Lx+2),cy-(22*h+t*.8))} C${P(cx+s*(Lx+8),cy-(10*h+t*.5))} ${P(cx+s*(Lx+6),cy+6*h)} ${P(cx+s*(Lx-4),cy+11*h)} C${P(cx+s*(.6*Lx),cy+15*h)} ${P(cx+s*(.3*Lx+9),cy+15*h)} ${P(x0,cy+11*h)}Z`;
}

// [ribbon path, swallowtail tip]
export function piece(sx: number, tx: number, a: number, len: number): [string, string] {
  const r = a * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r), g = sx < tx ? 1 : -1;
  const E: [number, number] = [tx + dx * len, cy + dy * len];
  const nx = -dy, ny = dx;
  const e1 = [E[0] + nx * 12, E[1] + ny * 12], e2 = [E[0] - nx * 12, E[1] - ny * 12];
  return [
    `M${P(sx,cy)} L${P(tx-g*10,cy)} Q${P(tx,cy)} ${P(tx+dx*10,cy+dy*10)} L${P(...E)}`,
    `M${P(e1[0],e1[1])} L${P(e1[0]+dx*13,e1[1]+dy*13)} L${P(E[0]+dx*1,E[1]+dy*1)} L${P(e2[0]+dx*13,e2[1]+dy*13)} L${P(e2[0],e2[1])}Z`,
  ];
}

export function knot(kIn: number) {
  const k = Math.max(kIn, 0);
  const w = (24 + 4 * k) * Math.min(1, k * 3);
  const h = (24 + 8 * k) * Math.min(1, k * 3);
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 2 + 5 * k };
}

// Every shape's geometry for a given state.
export function ribbonShapes(S: RibbonState) {
  return {
    v: `M${P(S.tx,S.ty)} Q${P(S.qx,S.qy)} ${P(S.bx,S.by)}`,
    left: piece(0, S.ltx, S.la, S.ll),
    right: piece(340, S.rtx, S.ra, S.rl),
    loopL: loop(-1, Math.max(S.L, 0), Math.max(S.h, 0), S.tilt),
    loopR: loop(1, Math.max(S.R, 0), Math.max(S.hR, 0), S.tilt),
    knot: knot(S.k),
  };
}
