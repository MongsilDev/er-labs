import { toCsv } from "./csv";
import { barTotal, type GroupResult } from "./engine";
import { dateKo, fmt, fmt1 } from "./format";
import { MODE_LABEL, PRESET_LABEL, type Mode, type Rules } from "./rules";

const FONT = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
const C = {
  bg: "#0a0d14",
  box: "#1a202c",
  line: "#2a3140",
  soft: "#1d2330",
  text: "#ffffff",
  text2: "#c9d0db",
  text3: "#7f889b",
  muted: "#9aa3b5",
  gold: "#ffd621",
  cyan: "#26f1f6",
  minus: "#ff6b6b",
};

type Ctx = CanvasRenderingContext2D;

function hex(h: string) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function ramp(i: number, n: number) {
  const a = hex("#0f5c66");
  const b = hex("#26f1f6");
  const t = n <= 1 ? 1 : i / (n - 1);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",")})`;
}
const rampHigh = (i: number, n: number) => (n <= 1 ? true : i / (n - 1) >= 0.5);

async function fonts(texts: string[]) {
  const all = texts.join("");
  await Promise.all([400, 600, 700, 800].map((w) => document.fonts.load(`${w} 40px "Pretendard Variable"`, all).catch(() => [])));
  await document.fonts.ready;
}

function font(ctx: Ctx, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function fit(ctx: Ctx, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function numWithSmallDecimal(ctx: Ctx, value: number, right: number, baseline: number, size: number, weight: number, color: string) {
  const [int, dec] = fmt1(value).split(".");
  font(ctx, weight, size * 0.62);
  const dw = ctx.measureText(`.${dec}`).width;
  ctx.fillStyle = color;
  ctx.textAlign = "right";
  ctx.fillText(`.${dec}`, right, baseline);
  font(ctx, weight, size);
  ctx.fillText(int, right - dw, baseline);
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "alphabetic";
  return { c, ctx };
}

export type BoardMeta = { name: string; group: string | null; mode: Mode; rules: Rules };

export async function boardImage(result: GroupResult, meta: BoardMeta): Promise<Blob> {
  const W = 1920;
  const H = 1080;
  const { c, ctx } = canvas(W, H);
  const { standings, played, ended } = result;
  const n = Math.max(standings.length, 1);
  const title = ended ? "최종 순위" : `${played}라운드 종료 순위`;
  const event = meta.group ? `${meta.name} ${meta.group}조` : meta.name;
  const metaLine = `${MODE_LABEL[meta.mode]}, ${PRESET_LABEL[meta.rules.preset]} 규칙`;
  const date = dateKo(Date.now());
  const killLabel = meta.rules.tiebreak === "kills" ? "킬" : "킬 점수";
  await fonts([title, event, metaLine, date, killLabel, "순위팀라운드별점수총점체크포인트위확정상위팀진출감점처치자불명사망회킬점1위er.mongsil.dev0123456789.R=-", ...standings.map((s) => s.name)]);

  const L = 96;
  const R = W - 96;
  font(ctx, 600, 26);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "left";
  ctx.fillText(fit(ctx, event, 1100), L, 96);
  font(ctx, 800, 68);
  ctx.fillStyle = C.text;
  ctx.fillText(title, L, 172);

  ctx.textAlign = "right";
  font(ctx, 500, 21);
  ctx.fillStyle = C.muted;
  ctx.fillText(metaLine, R, 96);
  ctx.fillText(date, R, 128);
  let lx = R;
  font(ctx, 500, 19);
  const legend: { label: string; color: string; line?: boolean }[] = [];
  const compact = standings.length > 12;
  if (!compact) for (let i = 0; i < played; i++) legend.push({ label: `${i + 1}R`, color: ramp(i, played) });
  if (meta.rules.advance > 0) legend.unshift({ label: `상위 ${meta.rules.advance}팀 진출`, color: C.cyan, line: true });
  for (const item of [...legend].reverse()) {
    const w = ctx.measureText(item.label).width;
    ctx.fillStyle = C.text2;
    ctx.fillText(item.label, lx, 168);
    lx -= w + 8;
    ctx.fillStyle = item.color;
    if (item.line) ctx.fillRect(lx - 18, 160, 18, 3);
    else ctx.fillRect(lx - 16, 154, 16, 12);
    lx -= 16 + 18;
  }

  const top = 206;
  if (compact) {
    drawCompact(ctx, result, meta, L, R, top, H - 120);
    drawFooter(ctx, meta, L, R, H - 120, n);
    return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했습니다."))), "image/png"));
  }
  const colRank = L + 24;
  const colTeam = L + 150;
  const colBar = L + 700;
  const colKs = R - 210;
  const colRs = R - 360;
  const colWins = R - 490;
  const colTotal = R - 24;
  font(ctx, 600, 19);
  ctx.fillStyle = C.text3;
  ctx.textAlign = "left";
  ctx.fillText("순위", colRank, top + 22);
  ctx.fillText("팀", colTeam, top + 22);
  ctx.fillText("라운드별 점수", colBar, top + 22);
  ctx.textAlign = "right";
  ctx.fillText("1위", colWins, top + 22);
  ctx.fillText("순위 점수", colRs, top + 22);
  ctx.fillText(killLabel, colKs, top + 22);
  ctx.fillText("총점", colTotal, top + 22);
  ctx.fillStyle = C.line;
  ctx.fillRect(L, top + 38, R - L, 1);

  const footerTop = H - 120;
  const rowsTop = top + 40;
  const rowH = Math.min(84, (footerTop - 20 - rowsTop) / n);
  const scale = rowH / 84;
  const barW = colWins - 100 - colBar;
  const max = Math.max(1, ...standings.map(barTotal));

  standings.forEach((s, i) => {
    const y = rowsTop + i * rowH;
    const mid = y + rowH / 2;
    const box = Math.round(56 * scale);
    const cls = s.rank === 1 ? C.gold : meta.rules.advance > 0 && s.rank <= meta.rules.advance ? C.cyan : C.box;
    ctx.fillStyle = cls;
    roundRect(ctx, colRank, mid - box / 2, box, box, 6 * scale);
    ctx.fill();
    font(ctx, 800, 30 * scale);
    ctx.fillStyle = cls === C.box ? C.text : C.bg;
    ctx.textAlign = "center";
    ctx.fillText(String(s.rank), colRank + box / 2, mid + 11 * scale);
    if (s.delta) {
      font(ctx, 700, 17 * scale);
      ctx.fillStyle = s.delta > 0 ? C.cyan : C.minus;
      ctx.textAlign = "left";
      ctx.fillText(`${s.delta > 0 ? "▲" : "▼"}${Math.abs(s.delta)}`, colRank + box + 10, mid + 6 * scale);
    }

    const badges: string[] = [];
    if (s.fixed) badges.push(`${s.fixed}위 확정`);
    else if (meta.mode !== "points" && s.checkpoint) badges.push("체크포인트");
    font(ctx, 700, 16 * scale);
    const badgeW = badges.reduce((a, b) => a + ctx.measureText(b).width + 20 * scale + 10, 0);
    font(ctx, 700, 32 * scale);
    ctx.fillStyle = C.text;
    ctx.textAlign = "left";
    const name = fit(ctx, s.name, colBar - colTeam - 30 - badgeW);
    ctx.fillText(name, colTeam, mid + 11 * scale);
    let bx = colTeam + ctx.measureText(name).width + 14;
    for (const b of badges) {
      font(ctx, 700, 16 * scale);
      const w = ctx.measureText(b).width + 20 * scale;
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      roundRect(ctx, bx, mid - 14 * scale, w, 28 * scale, 5);
      ctx.stroke();
      ctx.fillStyle = C.gold;
      ctx.fillText(b, bx + 10 * scale, mid + 6 * scale);
      bx += w + 10;
    }

    const barH = Math.max(10, 30 * scale);
    let x = colBar;
    s.rounds.forEach((r, j) => {
      if (!r || r.score <= 0) return;
      const w = (r.score / max) * barW;
      ctx.fillStyle = ramp(j, played);
      ctx.fillRect(x, mid - barH / 2, Math.max(0, w - 2), barH);
      if (w > 44 && scale > 0.6) {
        font(ctx, 700, 15 * scale);
        ctx.fillStyle = rampHigh(j, played) ? C.bg : C.text;
        ctx.textAlign = "center";
        ctx.fillText(fmt(r.score), x + w / 2 - 1, mid + 5 * scale);
      }
      x += w;
    });
    const bt = barTotal(s);
    if (s.penalty > 0 && bt > 0) {
      const pw = (Math.min(s.penalty, bt) / max) * barW;
      const px = colBar + ((bt - Math.min(s.penalty, bt)) / max) * barW;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, mid - barH / 2 - 3, pw, barH + 6);
      ctx.clip();
      ctx.fillStyle = C.bg;
      ctx.fillRect(px, mid - barH / 2 - 3, pw, barH + 6);
      ctx.strokeStyle = C.minus;
      ctx.lineWidth = 4;
      for (let k = -barH; k < pw + barH; k += 9) {
        ctx.beginPath();
        ctx.moveTo(px + k, mid + barH / 2 + 3);
        ctx.lineTo(px + k + barH + 6, mid - barH / 2 - 3);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = C.minus;
      ctx.lineWidth = 2;
      ctx.strokeRect(px, mid - barH / 2 - 3, pw, barH + 6);
    }

    font(ctx, 600, 28 * scale);
    ctx.fillStyle = C.text2;
    ctx.textAlign = "right";
    if (s.wins) ctx.fillText(String(s.wins), colWins, mid + 10 * scale);
    numWithSmallDecimal(ctx, s.rankScore, colRs, mid + 11 * scale, 30 * scale, 600, C.text2);
    const ksValue = meta.rules.tiebreak === "kills" ? s.kills : s.killScore;
    numWithSmallDecimal(ctx, ksValue, colKs, mid + 11 * scale, 30 * scale, 600, C.text2);
    numWithSmallDecimal(ctx, s.total, colTotal, mid + 16 * scale, 46 * scale, 800, C.text);
    if (s.penalty > 0) {
      font(ctx, 700, 15 * scale);
      ctx.fillStyle = C.minus;
      ctx.textAlign = "right";
      ctx.fillText(`감점 ${fmt(s.penalty)}`, colTotal, mid + 34 * scale);
    }

    ctx.fillStyle = C.soft;
    ctx.fillRect(L, y + rowH - 1, R - L, 1);
    if (meta.rules.advance > 0 && s.rank === meta.rules.advance && i < standings.length - 1) {
      ctx.fillStyle = C.cyan;
      ctx.fillRect(L, y + rowH - 1, R - L, 2);
    }
  });

  drawFooter(ctx, meta, L, R, footerTop, n);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했습니다."))), "image/png"));
}

function drawFooter(ctx: Ctx, meta: BoardMeta, L: number, R: number, footerTop: number, n: number) {
  const pts = meta.rules.placementPoints.slice(0, Math.min(8, Math.max(8, n)));
  let mx = L;
  pts.forEach((p, i) => {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    roundRect(ctx, mx + 0.5, footerTop + 30.5, 52, 60, 4);
    ctx.stroke();
    font(ctx, 500, 14);
    ctx.fillStyle = C.text3;
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}위`, mx + 26, footerTop + 52);
    font(ctx, 800, 22);
    ctx.fillStyle = C.text;
    ctx.fillText(fmt(p), mx + 26, footerTop + 80);
    mx += 58;
  });
  font(ctx, 500, 19);
  ctx.fillStyle = C.text3;
  ctx.textAlign = "left";
  const lines = [`킬 점수 1 = ${fmt(meta.rules.scoreSource === "table" ? meta.rules.killMultiplier : 1)}점`];
  if (meta.rules.deathPenalty) lines.push("처치자 불명 사망 1회 = -1점");
  lines.forEach((t, i) => ctx.fillText(t, mx + 18, footerTop + 56 + i * 28));
  font(ctx, 700, 19);
  ctx.fillStyle = C.text2;
  ctx.textAlign = "right";
  ctx.fillText("er.mongsil.dev", R, footerTop + 84);

}

function drawCompact(ctx: Ctx, result: GroupResult, meta: BoardMeta, L: number, R: number, top: number, bottom: number) {
  const { standings } = result;
  const per = Math.ceil(standings.length / 2);
  const gap = 48;
  const colW = (R - L - gap) / 2;
  const rowH = Math.min(64, (bottom - 20 - (top + 40)) / per);
  const s = rowH / 64;
  const killLabel = meta.rules.tiebreak === "kills" ? "킬" : "킬 점수";
  for (let c = 0; c < 2; c++) {
    const x0 = L + c * (colW + gap);
    const x1 = x0 + colW;
    font(ctx, 600, 17);
    ctx.fillStyle = C.text3;
    ctx.textAlign = "left";
    ctx.fillText("순위", x0 + 12, top + 22);
    ctx.fillText("팀", x0 + 110, top + 22);
    ctx.textAlign = "right";
    ctx.fillText(killLabel, x1 - 150, top + 22);
    ctx.fillText("총점", x1 - 12, top + 22);
    ctx.fillStyle = C.line;
    ctx.fillRect(x0, top + 38, colW, 1);
    standings.slice(c * per, c * per + per).forEach((t, i) => {
      const y = top + 40 + i * rowH;
      const mid = y + rowH / 2;
      const box = Math.round(42 * s);
      const fill = t.rank === 1 ? C.gold : meta.rules.advance > 0 && t.rank <= meta.rules.advance ? C.cyan : C.box;
      ctx.fillStyle = fill;
      roundRect(ctx, x0 + 12, mid - box / 2, box, box, 5);
      ctx.fill();
      font(ctx, 800, 22 * s);
      ctx.fillStyle = fill === C.box ? C.text : C.bg;
      ctx.textAlign = "center";
      ctx.fillText(String(t.rank), x0 + 12 + box / 2, mid + 8 * s);
      if (t.delta) {
        font(ctx, 700, 14 * s);
        ctx.fillStyle = t.delta > 0 ? C.cyan : C.minus;
        ctx.textAlign = "left";
        ctx.fillText(`${t.delta > 0 ? "▲" : "▼"}${Math.abs(t.delta)}`, x0 + 12 + box + 6, mid + 5 * s);
      }
      const badge = t.fixed ? `${t.fixed}위 확정` : meta.mode !== "points" && t.checkpoint ? "체크포인트" : "";
      font(ctx, 700, 14 * s);
      const bw = badge ? ctx.measureText(badge).width + 16 * s : 0;
      font(ctx, 700, 26 * s);
      ctx.fillStyle = C.text;
      ctx.textAlign = "left";
      const name = fit(ctx, t.name, x1 - 240 - (x0 + 110) - bw);
      ctx.fillText(name, x0 + 110, mid + 9 * s);
      if (badge) {
        const bx = x0 + 110 + ctx.measureText(name).width + 10;
        ctx.strokeStyle = C.gold;
        ctx.lineWidth = 1.5;
        roundRect(ctx, bx, mid - 12 * s, bw, 24 * s, 4);
        ctx.stroke();
        font(ctx, 700, 14 * s);
        ctx.fillStyle = C.gold;
        ctx.fillText(badge, bx + 8 * s, mid + 5 * s);
      }
      numWithSmallDecimal(ctx, meta.rules.tiebreak === "kills" ? t.kills : t.killScore, x1 - 150, mid + 9 * s, 24 * s, 600, C.text2);
      numWithSmallDecimal(ctx, t.total, x1 - 12, mid + 12 * s, 34 * s, 800, C.text);
      if (t.penalty > 0) {
        font(ctx, 700, 13 * s);
        ctx.fillStyle = C.minus;
        ctx.textAlign = "right";
        ctx.fillText(`감점 ${fmt(t.penalty)}`, x1 - 12, mid + 26 * s);
      }
      ctx.fillStyle = C.soft;
      ctx.fillRect(x0, y + rowH - 1, colW, 1);
      if (meta.rules.advance > 0 && t.rank === meta.rules.advance) {
        ctx.fillStyle = C.cyan;
        ctx.fillRect(x0, y + rowH - 1, colW, 2);
      }
    });
  }
}

export async function playersImage(result: GroupResult, meta: BoardMeta): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const { c, ctx } = canvas(W, H);
  const event = `${meta.group ? `${meta.name} ${meta.group}조` : meta.name}, ${result.played}라운드`;
  const sections = [
    ["라운드당 킬", result.players.kills],
    ["라운드당 사냥", result.players.hunting],
    ["라운드당 평균 레벨", result.players.level],
  ] as const;
  await fonts([event, "선수 기록공동위", ...sections.flatMap(([t, l]) => [t, ...l.map((p) => p.nickname + p.team)]), dateKo(Date.now()), "er.mongsil.dev0123456789."]);
  const L = 72;
  font(ctx, 600, 24);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "left";
  ctx.fillText(fit(ctx, event, W - 2 * L), L, 98);
  font(ctx, 800, 64);
  ctx.fillStyle = C.text;
  ctx.fillText("선수 기록", L, 182);

  let y = 268;
  for (const [title, list] of sections) {
    font(ctx, 700, 26);
    ctx.fillStyle = C.text2;
    ctx.fillText(title, L, y);
    const cardsTop = y + 22;
    const cardW = (W - 2 * L - 24) / 3;
    let x = L;
    list.slice(0, 3).forEach((p) => {
      const w = cardW;
      const top = p.rank === 1;
      ctx.strokeStyle = top ? C.gold : C.line;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x + 0.5, cardsTop + 0.5, w - 1, 183, 8);
      ctx.stroke();
      const tied = list.filter((o) => o.rank === p.rank).length > 1;
      font(ctx, 600, 15);
      ctx.fillStyle = C.text3;
      ctx.fillText(`${tied ? "공동 " : ""}${p.rank}위`, x + 20, cardsTop + 34);
      font(ctx, 800, 26);
      ctx.fillStyle = C.text;
      ctx.fillText(fit(ctx, p.nickname, w - 40), x + 20, cardsTop + 74);
      font(ctx, 500, 16);
      ctx.fillStyle = C.muted;
      ctx.fillText(fit(ctx, p.team, w - 40), x + 20, cardsTop + 100);
      font(ctx, 800, 44);
      ctx.fillStyle = top ? C.gold : C.text;
      ctx.fillText(fmt(p.value), x + 20, cardsTop + 158);
      x += w + 12;
    });
    y += 306;
  }
  font(ctx, 500, 18);
  ctx.fillStyle = C.text3;
  ctx.fillText(dateKo(Date.now()), L, H - 62);
  font(ctx, 700, 18);
  ctx.fillStyle = C.text2;
  ctx.textAlign = "right";
  ctx.fillText("er.mongsil.dev", W - L, H - 62);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했습니다."))), "image/png"));
}

export function standingsCsv(result: GroupResult): string {
  const head = ["순위", "팀"];
  for (let i = 1; i <= result.played; i++) head.push(`${i}R 순위`, `${i}R 킬 점수`, `${i}R 점수`);
  head.push("1위 횟수", "순위 점수", "킬 점수", "킬", "감점", "총점");
  const rows = result.standings.map((s) => {
    const r: (string | number)[] = [s.rank, s.name];
    for (let i = 0; i < result.played; i++) {
      const x = s.rounds[i];
      r.push(x?.placement ?? "", x ? x.killScore : "", x ? x.score : "");
    }
    r.push(s.wins, s.rankScore, s.killScore, s.kills, s.penalty, s.total);
    return r;
  });
  const safe = (v: string | number) => (typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
  return "\ufeff" + toCsv([head, ...rows.map((r) => r.map(safe))]);
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[\\/:*?"<>|]+/g, " ").trim();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
