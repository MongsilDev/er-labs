import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import badges from "@/tarkov/data/level-badges.json";
import itemsData from "@/tarkov/data/items.json";
import masteringData from "@/tarkov/data/mastering.json";
import skillsData from "@/tarkov/data/skills.json";
import Footer from "@/components/SiteFooter";
import Header from "@/tarkov/components/Header";
import AchievementList, { type AchievementRow } from "@/tarkov/components/players/AchievementList";
import Actions from "@/tarkov/components/players/Actions";
import { Remember } from "@/tarkov/components/players/Recent";
import SearchBox from "@/tarkov/components/players/SearchBox";
import Verdict from "@/tarkov/components/players/Verdict";
import { date, dateTime, dec, div, hours, int, pct } from "@/tarkov/lib/format";
import { arenaModeLabel, memberChips, sideLabel } from "@/tarkov/lib/labels";
import { MODES, pickMode, tarkovDevUrl } from "@/tarkov/lib/modes";
import { PERK, encodeBuild, type Perk } from "@/tarkov/lib/kord";
import { ARENA_PASSES, LEAGUE, leagueLabel } from "@/tarkov/lib/season";
import { achievementInfo, type ArenaSummary, type EftSummary, type Progress, type Summary } from "@/tarkov/lib/summary";
import { verdict } from "@/tarkov/server/baseline";
import { isHidden } from "@/tarkov/server/db";
import { account, displayName, load, nameHistory, snapshots } from "@/tarkov/server/profiles";
import "./profile.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ aid: string }>; searchParams: Promise<{ mode?: string }> };

function parseAid(raw: string): number | null {
  if (!/^\d{1,10}$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const aid = parseAid((await params).aid);
  if (!aid) return {};
  const acc = account(aid);
  const mode = pickMode(acc?.modes ?? null, (await searchParams).mode);
  const name = acc?.name ?? `#${aid}`;
  const image = { url: `/tarkov/players/${aid}/og?mode=${mode.key}`, width: 1200, height: 630 };
  return {
    title: `${name} ${mode.label}`,
    description: `${name}의 Escape from Tarkov ${mode.label} 전적`,
    robots: { index: false, follow: true },
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

function Tile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "tile strong" : "tile"}>
      <b className="num">{value}</b>
      <span>{label}</span>
    </div>
  );
}

type Fact = [string, string];

function Facts({ groups }: { groups: { title: string; rows: Fact[] }[] }) {
  return (
    <section className="block">
      <h2 className="h2">상세 기록</h2>
      <div className="facts">
        {groups.map((g) => (
          <dl key={g.title} className="panel fact-group">
            <h3>{g.title}</h3>
            {g.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="num">{value}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </section>
  );
}

// 판정 막대에 이미 나온 지표는 빼고 4개까지
function KeyTiles({ list, hide }: { list: Fact[]; hide: string[] }) {
  const shown = list.filter(([label]) => !hide.includes(label)).slice(0, 4);
  if (!shown.length) return null;
  return (
    <div className="tiles key">
      {shown.map(([label, value]) => (
        <Tile key={label} strong label={label} value={value} />
      ))}
    </div>
  );
}

function EftStats({ s, hide }: { s: EftSummary; hide: string[] }) {
  return (
    <>
      <KeyTiles
        hide={hide}
        list={[
          ["PMC K/D", dec(div(s.pmcKills, s.kia))],
          ["생존율", pct(div(s.survived, s.raids))],
          ["레이드당 PMC 사살", dec(div(s.pmcKills, s.raids))],
          ["연속 생존 횟수", int(s.streak)],
        ]}
      />
      <Facts
        groups={[
          {
            title: "레이드 결과",
            rows: [
              ["레이드", int(s.raids)],
              ["생존", int(s.survived)],
              ["사망", int(s.kia)],
              ["실종", int(s.mia)],
              ["이탈", int(s.left)],
              ["도주", int(s.runner)],
              ["지역 이동", int(s.transit)],
            ],
          },
          {
            title: "전투와 계정",
            rows: [
              ["PMC K/D", dec(div(s.pmcKills, s.kia))],
              ["생존율", pct(div(s.survived, s.raids))],
              ["PMC 사살", int(s.pmcKills)],
              ["사살", int(s.kills)],
              ["레이드당 사살", dec(div(s.kills, s.raids))],
              ["경험치", int(s.experience)],
            ],
          },
        ]}
      />
    </>
  );
}

function ArenaStats({ s, hide }: { s: ArenaSummary; hide: string[] }) {
  const t = s.total;
  if (!t) return <p className="sub">아레나 경기 기록이 없습니다.</p>;
  const per = (v: number) => dec(t.games ? v / t.games : null, 1);
  return (
    <>
      <KeyTiles
        hide={hide}
        list={[
          ["K/D", dec(div(t.kills, t.deaths))],
          ["승률", pct(div(t.wins, t.games))],
          ["헤드샷 비율", pct(div(t.headshots, t.kills))],
          ["경기당 피해량", int(t.games ? t.damage / t.games : null)],
          ["경기당 킬", per(t.kills)],
          ["최고 ARP", int(s.overall?.bestArp || null)],
        ]}
      />
      <Facts
        groups={[
          {
            title: "전투",
            rows: [
              ["킬", int(t.kills)],
              ["사망", int(t.deaths)],
              ["어시스트", int(t.assists)],
              ["헤드샷", int(t.headshots)],
              ["피해량", int(t.damage)],
              ["팀킬", int(t.teamKills)],
              ["근접무기 킬", int(t.knifeKills)],
            ],
          },
          {
            title: "결과",
            rows: [
              ["경기", int(t.games)],
              ["승리", int(t.wins)],
              ["패배", int(t.losses)],
              ["라운드 MVP", int(t.roundMvp)],
              ["매치 MVP", int(t.matchMvp)],
              ["에이스", int(t.aces)],
            ],
          },
          {
            title: "연속 기록",
            rows: [
              ["현재 연속 킬", int(s.overall?.killStreak)],
              ["최고 연속 킬", int(t.bestKillStreak)],
              ["한 경기 최다 킬", int(t.maxGameKills)],
              ["최고 연승", int(t.bestWinStreak)],
              ["현재 연패", int(s.overall?.loseStreak)],
              ["최장 연패", int(t.bestLoseStreak)],
            ],
          },
          {
            title: "평균과 등급",
            rows: [
              ["K/D", dec(div(t.kills, t.deaths))],
              ["헤드샷 비율", pct(div(t.headshots, t.kills))],
              ["경기당 킬", per(t.kills)],
              ["경기당 어시스트", per(t.assists)],
              ["시간당 킬", dec(s.seconds ? t.kills / (s.seconds / 3600) : null, 1)],
              ["플레이 시간", hours(s.seconds)],
              ["최고 ARP", int(s.overall?.bestArp || null)],
            ],
          },
        ]}
      />
      {s.modes.length > 1 && (
        <section className="block">
          <h2 className="h2">모드별</h2>
          <div className="table-scroll panel">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>모드</th>
                  <th className="opt">승패</th>
                  <th>경기</th>
                  <th>승률</th>
                  <th>K/D</th>
                  <th>경기당 킬</th>
                  <th>헤드샷</th>
                  <th>경기당 피해량</th>
                  <th>최다 킬</th>
                  <th>연속 킬</th>
                  <th className="opt">라운드 MVP</th>
                  <th className="opt">근접무기 킬</th>
                  <th className="opt">팀킬</th>
                </tr>
              </thead>
              <tbody>
                {s.modes.map((m) => (
                  <tr key={m.key}>
                    <td className="nowrap">{arenaModeLabel(m.key)}</td>
                    <td className="opt wl-cell">
                      <span className="wl" style={{ width: `${(m.stats.games / s.modes[0].stats.games) * 100}%` }} aria-hidden="true">
                        <i style={{ width: `${(m.stats.wins / Math.max(1, m.stats.games)) * 100}%` }} />
                      </span>
                    </td>
                    <td className="num">{int(m.stats.games)}</td>
                    <td className="num">{pct(div(m.stats.wins, m.stats.games), 0)}</td>
                    <td className="num">{dec(div(m.stats.kills, m.stats.deaths))}</td>
                    <td className="num">{dec(div(m.stats.kills, m.stats.games), 1)}</td>
                    <td className="num">{pct(div(m.stats.headshots, m.stats.kills), 0)}</td>
                    <td className="num">{int(m.stats.games ? m.stats.damage / m.stats.games : null)}</td>
                    <td className="num">{int(m.stats.maxGameKills)}</td>
                    <td className="num">{int(m.stats.bestKillStreak)}</td>
                    <td className="num opt">{int(m.stats.roundMvp)}</td>
                    <td className="num opt">{int(m.stats.knifeKills)}</td>
                    <td className="num opt">{int(m.stats.teamKills)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function Achievements({ s }: { s: Summary }) {
  if (!s.achievements.length) return null;
  const rows: AchievementRow[] = [];
  for (const a of s.achievements) {
    const info = achievementInfo(a.id);
    if (info) rows.push({ id: a.id, at: a.at, name: info.name, description: info.description, icon: info.icon, rarity: info.rarity, percent: info.percent });
  }
  return (
    <section className="block">
      <h2 className="h2">
        도전과제 <span className="muted num">{s.achievements.length}</span>
      </h2>
      {rows.length > 0 ? <AchievementList rows={rows} /> : <p className="sub">아레나 도전과제는 공개된 이름 자료가 없어 개수만 표시합니다.</p>}
    </section>
  );
}

const ITEMS = itemsData as Record<string, string>;
const SKILL_NAME = skillsData as Record<string, string>;
const MASTERING = masteringData as Record<string, { weapon: string | null; level2: number; level3: number }>;

const SLOTS: [string, string][] = [
  ["FirstPrimaryWeapon", "주무기 1"],
  ["SecondPrimaryWeapon", "주무기 2"],
  ["Holster", "권총집"],
  ["Scabbard", "칼집"],
  ["Headwear", "모자"],
  ["Earpiece", "헤드셋"],
  ["FaceCover", "얼굴"],
  ["Eyewear", "안경"],
  ["ArmorVest", "방탄복"],
  ["TacticalVest", "전술 조끼"],
  ["Backpack", "배낭"],
  ["SecuredContainer", "파우치"],
  ["ArmBand", "완장"],
];

function Gear({ s }: { s: EftSummary }) {
  const rows = SLOTS.map(([slot, label]) => ({ label, tpl: s.gear?.find((g) => g.slot === slot)?.tpl })).filter(
    (r): r is { label: string; tpl: string } => !!r.tpl && !!ITEMS[r.tpl],
  );
  if (!rows.length) return null;
  return (
    <section className="block">
      <h2 className="h2">마지막 장비</h2>
      <p className="sub">tarkov.dev 기록이 갱신된 시점에 캐릭터가 입고 있던 장비입니다.</p>
      <ul className="gear">
        {rows.map((r) => (
          <li key={r.label}>
            <Image src={`/api/icon/${r.tpl}`} alt="" width={44} height={44} unoptimized />
            <span className="gear-text">
              <span className="small muted">{r.label}</span>
              <b className="ellipsis" title={ITEMS[r.tpl]}>
                {ITEMS[r.tpl]}
              </b>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Skills({ s }: { s: EftSummary }) {
  const list = s.skills ?? [];
  if (!list.length) return null;
  const chip = (k: { id: string; level: number }) => (
    <li key={k.id} className={k.level >= 51 ? "elite" : undefined}>
      <Image src={`/img/skill/${k.id}.webp`} alt="" width={28} height={28} unoptimized />
      <span className="ellipsis">{SKILL_NAME[k.id]}</span>
      <b className="num">{k.level >= 51 ? "엘리트" : dec(k.level, 1)}</b>
      {k.level < 51 && <i className="sk-bar" style={{ width: `${(k.level % 1) * 100}%` }} aria-hidden="true" />}
    </li>
  );
  return (
    <section className="block">
      <h2 className="h2">
        스킬 <span className="muted num">{list.length}</span>
      </h2>
      <ul className="skills">{list.slice(0, 12).map(chip)}</ul>
      {list.length > 12 && (
        <details className="more">
          <summary>나머지 {list.length - 12}개 보기</summary>
          <ul className="skills">{list.slice(12).map(chip)}</ul>
        </details>
      )}
    </section>
  );
}

function Mastery({ s }: { s: EftSummary }) {
  const list = (s.mastery ?? []).filter((m) => MASTERING[m.id]);
  if (!list.length) return null;
  const row = (m: { id: string; progress: number }) => {
    const def = MASTERING[m.id];
    // tarkov.dev와 같게 기준값을 넘으면 다음 단계
    const level = m.progress > def.level3 ? 3 : m.progress > def.level2 ? 2 : 1;
    const goal = level === 3 ? null : level === 2 ? def.level3 : def.level2;
    return (
      <li key={m.id}>
        {def.weapon ? <Image src={`/api/icon/${def.weapon}`} alt="" width={40} height={40} unoptimized /> : <span className="gear-blank" />}
        <div className="m-body">
          <div className="m-top">
            <b className="ellipsis">{m.id}</b>
            <span className="pips" aria-label={`${level}단계`}>
              {[1, 2, 3].map((n) => (
                <i key={n} className={n <= level ? "on" : undefined} />
              ))}
            </span>
          </div>
          <div className="m-bar" aria-hidden="true">
            <i style={{ width: `${goal ? Math.min(100, (m.progress / goal) * 100) : 100}%` }} />
          </div>
          <span className="small muted num">{goal ? `${int(m.progress)} / ${int(goal)}` : `${int(m.progress)}, 최고 단계`}</span>
        </div>
      </li>
    );
  };
  return (
    <section className="block">
      <h2 className="h2">
        무기 숙련도 <span className="muted num">{list.length}</span>
      </h2>
      <ul className="mlist">{list.slice(0, 10).map(row)}</ul>
      {list.length > 10 && (
        <details className="more">
          <summary>나머지 {list.length - 10}개 보기</summary>
          <ul className="mlist">{list.slice(10).map(row)}</ul>
        </details>
      )}
    </section>
  );
}

function Scav({ s }: { s: EftSummary }) {
  const v = s.scav;
  if (!v) return null;
  return (
    <section className="block">
      <h2 className="h2">스캐브 레이드</h2>
      <div className="tiles">
        <Tile label="레이드" value={int(v.raids)} />
        <Tile label="생존율" value={pct(div(v.survived, v.raids))} />
        <Tile label="사살" value={int(v.kills)} />
        <Tile label="PMC 사살" value={int(v.pmcKills)} />
      </div>
    </section>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="meter" aria-hidden="true">
      <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  );
}

function ProgressCard({ label, p, note }: { label: string; p: Progress; note: string }) {
  return (
    <div className={p.done >= p.total ? "prog done" : "prog"}>
      <span className="prog-label">{label}</span>
      <b className="num">
        {p.done} <span className="muted">/ {p.total}</span>
      </b>
      <Bar value={p.done} max={p.total} />
      <span className="small muted">{p.done >= p.total ? "모두 받음" : note}</span>
    </div>
  );
}

function SeasonProgress({ s }: { s: EftSummary }) {
  const { league, pass, seasonRewards } = s;
  if (!league && !pass && !seasonRewards) return null;
  return (
    <section className="block">
      <h2 className="h2">KORD BREACH 시즌 진행</h2>
      <div className="progs">
        {league && (
          <div className="prog rank">
            <span className="prog-label">리그 등급</span>
            <b>{leagueLabel(league.rank)}</b>
            <ol className="league" aria-hidden="true">
              {LEAGUE.map((n, i) => (
                <li key={n} className={i + 1 <= league.rank ? "on" : i + 1 <= league.max ? "peak" : undefined} />
              ))}
            </ol>
            <span className="small muted">{league.max > league.rank ? `최고 등급 ${leagueLabel(league.max)}` : "주간 경험치 순위로 결정"}</span>
          </div>
        )}
        {pass && <ProgressCard label="배틀패스" p={pass} note="모든 모드 공통" />}
        {seasonRewards && <ProgressCard label="시즌 퀘스트 보상" p={seasonRewards} note="시즌 퀘스트를 완료하면 받음" />}
      </div>
    </section>
  );
}

// id 앞부분이 생성 시각이라 문자열 비교가 시즌 순서와 같음
const LATEST_ARENA_PASS = Object.keys(ARENA_PASSES).sort().at(-1)!;

function ArenaPasses({ s }: { s: ArenaSummary }) {
  const list = s.passes ?? [];
  if (!list.length) return null;
  return (
    <section className="block">
      <h2 className="h2">배틀패스</h2>
      <ul className="progs">
        {list.map((x, i) => {
          const def = ARENA_PASSES[x.id];
          return (
            <li key={x.id} className={def && x.level >= def.levels ? "prog done" : "prog"}>
              <span className="prog-label">
                {def ? `시즌 ${def.season}` : "새 시즌"}
                {i === 0 && x.id >= LATEST_ARENA_PASS && <span className="chip">진행 중</span>}
              </span>
              <b className="num">
                {x.level}
                {def && <span className="muted"> / {def.levels}</span>}
              </b>
              {def && <Bar value={x.level} max={def.levels} />}
              <span className="small muted num">{def ? `${def.start} 시작` : "단계 수 미확인"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SeasonPerks({ ids }: { ids: string[] }) {
  const picked = ids.map((id) => PERK.get(id)).filter((p): p is Perk => p != null && p.points != null);
  if (!picked.length) return null;
  picked.sort((a, b) => a.points! - b.points!);
  const left = -picked.reduce((a, p) => a + p.points!, 0);
  return (
    <section className="block">
      <div className="block-head">
        <h2 className="h2">
          고른 시즌 특성 <span className="muted num">{picked.length}</span>
        </h2>
        <Link className="link small" href={`/tarkov/kord-breach?b=${encodeBuild(picked.map((p) => p.id))}`}>
          시뮬레이터에서 열기
        </Link>
      </div>
      <ul className="perks">
        {picked.map((p) => (
          <li key={p.id} className={p.points! < 0 ? "pos" : "neg"} title={p.effects.join("\n")}>
            <span className="perk-icon" style={{ WebkitMaskImage: `url(/kord/perks/${p.id}.png)`, maskImage: `url(/kord/perks/${p.id}.png)` }} aria-hidden="true" />
            <span>{p.name}</span>
            <b className="num">{p.points! > 0 ? `+${p.points}` : p.points}</b>
          </li>
        ))}
      </ul>
      <p className="sub">남은 포인트 {left}</p>
    </section>
  );
}

function Trend({ list }: { list: Summary[] }) {
  if (list.length < 2) return null;
  return (
    <section className="block">
      <h2 className="h2">이 사이트에 저장된 기록</h2>
      <div className="table-scroll panel">
        <table className="grid-table">
          <thead>
            <tr>
              <th>기준 시각</th>
              {list[0].kind === "eft" ? (
                <>
                  <th>레이드</th>
                  <th>PMC K/D</th>
                  <th>생존율</th>
                  <th>PMC 사살</th>
                </>
              ) : (
                <>
                  <th>경기</th>
                  <th>K/D</th>
                  <th>헤드샷</th>
                  <th>킬</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 8).map((s) => (
              <tr key={s.updated}>
                <td className="nowrap num">{dateTime(s.updated)}</td>
                {s.kind === "eft" ? (
                  <>
                    <td className="num">{int(s.raids)}</td>
                    <td className="num">{dec(div(s.pmcKills, s.kia))}</td>
                    <td className="num">{pct(div(s.survived, s.raids))}</td>
                    <td className="num">{int(s.pmcKills)}</td>
                  </>
                ) : (
                  <>
                    <td className="num">{int(s.total?.games)}</td>
                    <td className="num">{dec(div(s.total?.kills, s.total?.deaths))}</td>
                    <td className="num">{pct(div(s.total?.headshots, s.total?.kills), 0)}</td>
                    <td className="num">{int(s.total?.kills)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Hidden() {
  return (
    <>
      <Header crumb={{ href: "/tarkov/players", label: "계정 조회" }} />
      <main id="main" className="wrap slim">
        <section className="panel nf">
          <h1>표시하지 않는 계정입니다</h1>
          <p className="muted">계정 주인의 요청으로 기록을 지웠습니다.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default async function Profile({ params, searchParams }: Props) {
  const aid = parseAid((await params).aid);
  if (!aid) notFound();
  if (isHidden(aid)) return <Hidden />;
  const acc = account(aid);
  const mode = pickMode(acc?.modes ?? null, (await searchParams).mode);
  const arenaMode = MODES.find((m) => m.key === "arena")!;
  // 아레나 JSON의 등급 값에는 Unheard가 빠져 있어 EFT 기록의 등급을 함께 씀
  const eftMode = mode.key === "arena" && acc ? MODES.filter((m) => m.key !== "arena" && acc.modes[m.key]).sort((a, b) => acc.modes[b.key]! - acc.modes[a.key]!)[0] : undefined;
  const [res, other] = await Promise.all([
    load(mode, aid),
    mode.key !== "arena" && acc?.modes.arena ? load(arenaMode, aid) : eftMode ? load(eftMode, aid) : Promise.resolve(null),
  ]);
  const arena = mode.key !== "arena" ? other : null;
  const s = res.summary;
  const registered = s?.kind === "arena" ? s.registered : arena?.summary?.kind === "arena" ? arena.summary.registered : null;
  const name = displayName(aid, acc, s);
  const history = nameHistory(aid);
  const v = s ? verdict(mode, aid, s) : null;
  const chips = s ? memberChips(s.member | (other?.summary?.member ?? 0)) : [];
  const eft = s?.kind === "eft" ? s : null;
  const barred = v && v.state !== "none" ? v.metrics.map((m) => m.label) : [];

  return (
    <>
      <Header crumb={{ href: "/tarkov/players", label: "계정 조회" }} />
      <main id="main" className="wrap profile">
        <SearchBox compact />
        {name !== `#${aid}` && <Remember aid={aid} name={name} />}

        <section className="panel phead">
          <div className="pname">
            <h1 className="ellipsis" translate="no">{name}</h1>
            {s?.side && <span className="chip">{sideLabel(s.side)}</span>}
            {chips.map((c) => (
              <span key={c.label} className={c.official ? "chip official" : "chip"}>
                {c.label}
              </span>
            ))}
          </div>
          <dl className="pmeta">
            <div>
              <dt>계정 번호</dt>
              <dd className="num">{aid}</dd>
            </div>
            {eft && (
              <div>
                <dt>레벨</dt>
                <dd className="num with-icon">
                  {eft.level && badges[eft.level - 1] ? <Image className="lvl-badge" src={`/img/level/${badges[eft.level - 1]}.png`} alt="" width={22} height={22} unoptimized /> : null}
                  {eft.level ?? "-"}
                </dd>
              </div>
            )}
            {eft?.prestige ? (
              <div>
                <dt>프레스티지</dt>
                <dd className="num with-icon">
                  {eft.prestige <= 6 && <Image src={`/img/prestige/${eft.prestige}.webp`} alt="" width={22} height={22} unoptimized />}
                  {eft.prestige}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{s?.kind === "arena" ? "아레나 플레이 시간" : "플레이 시간"}</dt>
              <dd className="num">{hours(s?.seconds)}</dd>
            </div>
            {registered && (
              <div>
                <dt>가입일</dt>
                <dd className="num">{date(registered * 1000)}</dd>
              </div>
            )}
            {eft?.lastActive && (
              <div>
                <dt>마지막 활동</dt>
                <dd className="num">{date(eft.lastActive * 1000)}</dd>
              </div>
            )}
            <div>
              <dt>기준 시각</dt>
              <dd className="num">{s ? dateTime(s.updated) : "-"}</dd>
            </div>
          </dl>
          <Actions aid={aid} mode={mode.key} tarkovDev={tarkovDevUrl(mode, aid)} />
          {res.error && <p className="err">tarkov.dev에서 받아오지 못해 {s ? "이전에 받은 기록을 표시합니다." : "표시할 기록이 없습니다."}</p>}
        </section>

        <nav className="tabs" aria-label="모드">
          {MODES.map((m) => {
            const known = !acc || acc.modes[m.key] != null;
            return (
              <Link key={m.key} href={`/tarkov/players/${aid}?mode=${m.key}`} aria-current={m.key === mode.key ? "page" : undefined} className={known ? undefined : "faint"} replace>
                {m.label}
              </Link>
            );
          })}
        </nav>

        {!s && !res.error && (
          <section className="panel empty">
            <p>아직 tarkov.dev에서 이 계정의 {mode.label} 기록을 조회한 사람이 없습니다.</p>
            <p className="sub">tarkov.dev에서 이 계정을 한 번 열면 기록이 생성됩니다.<br />tarkov.dev에서 연 뒤 이 화면으로 돌아오면 기록을 자동으로 다시 불러옵니다.</p>
          </section>
        )}

        {s && (
          <>
            {v && <Verdict v={v} mode={mode.key} official={chips.some((c) => c.official)} />}
            {s.kind === "eft" ? <EftStats s={s} hide={barred} /> : <ArenaStats s={s} hide={barred} />}
            {eft && <SeasonProgress s={eft} />}
            {s.kind === "arena" && <ArenaPasses s={s} />}
            {eft?.perks?.length ? <SeasonPerks ids={eft.perks} /> : null}
            {eft && <Scav s={eft} />}
            {eft && <Gear s={eft} />}
            {eft && <Skills s={eft} />}
            {eft && <Mastery s={eft} />}
            <Achievements s={s} />
          </>
        )}

        {history.length > 0 && (
          <section className="block">
            <h2 className="h2">닉네임 변경</h2>
            <div className="table-scroll panel">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>이전</th>
                    <th>이후</th>
                    <th>확인한 날</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={`${h.at}-${h.old}`}>
                      <td translate="no">{h.old}</td>
                      <td translate="no">{h.next}</td>
                      <td className="num nowrap">{date(h.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {s && <Trend list={snapshots(aid, mode.key)} />}
      </main>
      <Footer />
    </>
  );
}
