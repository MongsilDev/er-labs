import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Browser, chromium, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { csv } from "../helpers";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const STANDALONE = join(ROOT, ".next/standalone");
const DATA = mkdtempSync(join(tmpdir(), "er-labs-ui-"));
const SHOTS = mkdtempSync(join(tmpdir(), "er-labs-ui-shots-"));
process.env.DATA_DIR = DATA;

const owner = { id: "9001", name: "개최자", avatar: null };
const OWNER_SID = "ui-owner-session";
const LONG_TEAM = "아주아주긴팀이름입니다정말로";
const TEAMS = [LONG_TEAM, "모래성", "번개팀", "새벽길", "은하수", "파도", "단풍", "등대"];

let server: ChildProcess;
let base = "";
let browser: Browser;
let code = "";
let invite = "";

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
  });
}

async function seed() {
  const { db } = await import("../../../src/er/server/db");
  const t = await import("../../../src/er/server/tournament");
  const conn = db();
  conn.prepare("INSERT INTO users(id, name, avatar, updated_at) VALUES (?, ?, NULL, ?)").run(owner.id, owner.name, Date.now());
  conn
    .prepare("INSERT INTO sessions(hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(createHash("sha256").update(OWNER_SID).digest("hex"), owner.id, Date.now() + 864e5);
  code = t.createTournament(owner, {
    name: "조별 예선 아주 긴 대회 이름을 넣어서 줄바꿈 확인하기",
    mode: "checkpoint",
    preset: "masters",
    plannedRounds: 12,
    groupCount: 2,
    rules: { advance: 4 },
  });
  const files = Array.from({ length: 8 }, (_, r) => {
    const order = TEAMS.map((_, i) => TEAMS[(i + r * 3) % TEAMS.length]);
    return { name: `r${r + 1}.csv`, text: csv(500 + r, order.map((team, i) => ({ team, place: i + 1, ks: (r + i * 2) % 9 }))) };
  });
  t.applyOp(code, owner, { op: "add_csv", group: 0, files });
  t.applyOp(code, owner, { op: "add_penalty", group: 0, team: "모래성", round: 2, kind: "rule", points: 3, reason: "지각" });
  invite = t.createInvite(code, owner);
}

beforeAll(async () => {
  if (!existsSync(join(STANDALONE, "server.js"))) throw new Error("먼저 pnpm build를 실행해주세요.");
  for (const dir of ["public", "assets"]) cpSync(join(ROOT, dir), join(STANDALONE, dir), { recursive: true });
  cpSync(join(ROOT, ".next/static"), join(STANDALONE, ".next/static"), { recursive: true });
  await seed();
  const port = await freePort();
  base = `http://localhost:${port}`;
  // 운영 .env가 섞이지 않게 환경 변수를 직접 지정
  server = spawn(process.execPath, ["server.js"], {
    cwd: STANDALONE,
    env: { NODE_ENV: "production", PATH: process.env.PATH ?? "", PORT: String(port), HOSTNAME: "127.0.0.1", BASE_URL: base, DATA_DIR: DATA, DISCORD_CLIENT_ID: "1111", JOBS: "0" },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    if (await fetch(`${base}/api/health`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  server?.kill();
  rmSync(DATA, { recursive: true, force: true });
  if (readdirSync(SHOTS).length === 0) rmSync(SHOTS, { recursive: true });
});

type Screen = { name: string; path: () => string; login?: boolean; tab?: string; status?: number };

const SCREENS: Screen[] = [
  { name: "Labs", path: () => "/" },
  { name: "점수 계산", path: () => "/er/score" },
  { name: "점수 계산 로그인", path: () => "/er/score", login: true },
  { name: "처리방침", path: () => "/privacy" },
  { name: "예시 대회 선수 기록", path: () => "/er/example/a", tab: "선수 기록" },
  { name: "대회 보기", path: () => `/er/t/${code}/a` },
  { name: "대회 운영", path: () => `/er/t/${code}/a`, login: true },
  { name: "대회 운영 라운드별 점수", path: () => `/er/t/${code}/a`, login: true, tab: "라운드별 점수" },
  { name: "빈 조 운영", path: () => `/er/t/${code}/b`, login: true },
  { name: "운영자와 설정", path: () => `/er/t/${code}/manage`, login: true },
  { name: "초대", path: () => `/er/i/${invite}` },
  { name: "없는 대회", path: () => "/er/t/ZZZZZZ/a", status: 404 },
  { name: "없는 페이지", path: () => "/nope", status: 404 },
];

type Problems = { overflow: number; undefinedClass: string[]; unstyled: string[] };

function inspect(): Problems {
  const defined = new Set<string>();
  const collect = (rule: CSSRule) => {
    const sel = (rule as CSSStyleRule).selectorText;
    if (sel) for (const m of sel.matchAll(/\.((?:\\.|[\w-])+)/g)) defined.add(m[1].replace(/\\(.)/g, "$1"));
    for (const child of (rule as CSSGroupingRule).cssRules ?? []) collect(child);
  };
  for (const sheet of document.styleSheets) for (const rule of sheet.cssRules) collect(rule);
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  };
  const label = (el: Element) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} "${(el.textContent ?? "").trim().slice(0, 30)}"`;
  const undefinedClass = new Set<string>();
  for (const el of document.body.querySelectorAll("[class]")) {
    if (!visible(el)) continue;
    for (const c of el.classList) if (!defined.has(c)) undefinedClass.add(`.${c} ${label(el)}`);
  }
  const unstyled: string[] = [];
  for (const el of document.querySelectorAll("button, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden])")) {
    if (!visible(el)) continue;
    const border = getComputedStyle(el).borderTopStyle;
    if (border === "outset" || border === "inset") unstyled.push(label(el));
  }
  return { overflow: document.documentElement.scrollWidth - innerWidth, undefinedClass: [...undefinedClass], unstyled };
}

async function open(screen: Screen, width: number, theme: "dark" | "light"): Promise<{ page: Page; errors: string[]; status: number }> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  if (screen.login) await ctx.addCookies([{ name: "er_session", value: OWNER_SID, url: base }]);
  await ctx.addInitScript((t) => localStorage.setItem("labs-theme", t), theme);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !(screen.status === 404 && m.text().includes("404"))) errors.push(m.text());
  });
  const res = await page.goto(base + screen.path(), { waitUntil: "networkidle" });
  if (screen.tab) await page.getByRole("tab", { name: screen.tab }).click();
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, status: res?.status() ?? 0 };
}

describe("화면 점검", () => {
  for (const screen of SCREENS) {
    for (const width of [390, 1440]) {
      for (const theme of ["dark", "light"] as const) {
        it(`${screen.name} ${width} ${theme}`, async () => {
          const { page, errors, status } = await open(screen, width, theme);
          try {
            expect(status).toBe(screen.status ?? 200);
            expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
            const p = await page.evaluate(inspect);
            expect(p, "가로 넘침, 정의 없는 클래스, 브라우저 기본 모양 컨트롤").toEqual({ overflow: 0, undefinedClass: [], unstyled: [] });
            expect(errors).toEqual([]);
          } catch (e) {
            await page.screenshot({ path: join(SHOTS, `${screen.name}-${width}-${theme}.png`), fullPage: true });
            throw new Error(`${e instanceof Error ? e.message : e}\n캡처: ${SHOTS}`);
          } finally {
            await page.context().close();
          }
        });
      }
    }
  }

  it("방송 화면은 1920x1080 안에 들어간다", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/er/t/${code}/a/overlay?scale=2`, { waitUntil: "networkidle" });
    const box = await page.locator(".ov").boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(1080);
    await ctx.close();
  });

  it("키보드로 옮긴 초점이 화면에 표시된다", async () => {
    const { page } = await open(SCREENS.find((s) => s.name === "대회 운영")!, 1440, "dark");
    const missing: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const shown = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
        return shown ? null : `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30)}"`;
      });
      if (r) missing.push(r);
    }
    await page.context().close();
    expect(missing).toEqual([]);
  });
});
