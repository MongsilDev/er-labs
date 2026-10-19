import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import badges from "@/data/level-badges.json";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Actions from "@/components/players/Actions";
import { Remember } from "@/components/players/Recent";
import SearchBox from "@/components/players/SearchBox";
import Verdict from "@/components/players/Verdict";
import { date, dateTime, dec, div, hours, int, pct } from "@/lib/format";
import { arenaModeLabel, memberChips, sideLabel } from "@/lib/labels";
import { MODES, pickMode, tarkovDevUrl } from "@/lib/modes";
import { toSample } from "@/lib/sample";
import { PERK, encodeBuild, type Perk } from "@/lib/kord";
import { achievementInfo, type ArenaSummary, type EftSummary, type Summary } from "@/lib/summary";
import { verdict } from "@/server/baseline";
import { isHidden } from "@/server/db";
import { account, load, nameHistory, snapshots } from "@/server/profiles";
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
  const image = { url: `/players/${aid}/og?mode=${mode.key}`, width: 1200, height: 630 };
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

function EftStats({ s }: { s: EftSummary }) {
  return (
    <>
      <div className="tiles key">
        <Tile strong label="PMC K/D" value={dec(div(s.pmcKills, s.kia))} />
        <Tile strong label="생존율" value={pct(div(s.survived, s.raids))} />
        <Tile strong label="레이드당 PMC 킬" value={dec(div(s.pmcKills, s.raids))} />
        <Tile strong label="최장 연속 생존" value={int(s.streak)} />
      </div>
      <div className="tiles">
        <Tile label="레이드" value={int(s.raids)} />
        <Tile label="생존" value={int(s.survived)} />
        <Tile label="사망" value={int(s.kia)} />
        <Tile label="실종" value={int(s.mia)} />
        <Tile label="도주" value={int(s.runner)} />
        <Tile label="지역 이동" value={int(s.transit)} />
        <Tile label="PMC 킬" value={int(s.pmcKills)} />
        <Tile label="전체 킬" value={int(s.kills)} />
      </div>
    </>
  );
}

function ArenaStats({ s }: { s: ArenaSummary }) {
  const t = s.total;
  if (!t) return <p className="sub">아레나 경기 기록이 없습니다.</p>;
  return (
    <>
      <div className="tiles key">
        <Tile strong label="K/D" value={dec(div(t.kills, t.deaths))} />
        <Tile strong label="헤드샷 비율" value={pct(div(t.headshots, t.kills))} />
        <Tile strong label="한 경기 최다 킬" value={int(t.maxGameKills)} />
        <Tile strong label="최고 연속 킬" value={int(t.killStreak)} />
      </div>
      <div className="tiles">
        <Tile label="경기" value={int(t.games)} />
        <Tile label="승률" value={pct(div(t.wins, t.games), 0)} />
        <Tile label="킬" value={int(t.kills)} />
        <Tile label="사망" value={int(t.deaths)} />
        <Tile label="시간당 킬" value={dec(s.seconds ? t.kills / (s.seconds / 3600) : null, 1)} />
        <Tile label="헤드샷" value={int(t.headshots)} />
        <Tile label="팀킬" value={int(t.teamKills)} />
        <Tile label="매치 MVP" value={int(t.matchMvp)} />
      </div>
      {s.modes.length > 1 && (
        <section className="block">
          <h2 className="h2">모드별</h2>
          <div className="table-scroll panel">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>모드</th>
                  <th>경기</th>
                  <th>승률</th>
                  <th>K/D</th>
                  <th>헤드샷</th>
                  <th>최다 킬</th>
                  <th>연속 킬</th>
                  <th className="opt">팀킬</th>
                </tr>
              </thead>
              <tbody>
                {s.modes.map((m) => (
                  <tr key={m.key}>
                    <td className="nowrap">{arenaModeLabel(m.key)}</td>
                    <td className="num">{int(m.stats.games)}</td>
                    <td className="num">{pct(div(m.stats.wins, m.stats.games), 0)}</td>
                    <td className="num">{dec(div(m.stats.kills, m.stats.deaths))}</td>
                    <td className="num">{pct(div(m.stats.headshots, m.stats.kills), 0)}</td>
                    <td className="num">{int(m.stats.maxGameKills)}</td>
                    <td className="num">{int(m.stats.killStreak)}</td>
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

const RARITY: Record<string, string> = { common: "일반", rare: "희귀", legendary: "전설", seasonal: "시즌" };

function Achievements({ s }: { s: Summary }) {
  if (!s.achievements.length) return null;
  // 시즌 업적은 달성 비율 자료가 없어 뒤로 보냄
  const rows = s.achievements
    .map((a) => ({ ...a, info: achievementInfo(a.id) }))
    .filter((a) => a.info)
    .sort((a, b) => (a.info!.percent || 101) - (b.info!.percent || 101) || b.at - a.at);
  const row = (a: (typeof rows)[number]) => (
    <li key={a.id} className={`ach ${a.info!.rarity}`}>
      {a.info!.icon ? <Image src={`/img/ach/${a.id}.webp`} alt="" width={36} height={36} unoptimized /> : <span className="ach-blank" />}
      <span className="ach-text">
        <b className="ellipsis">{a.info!.name}</b>
        {a.info!.description && <span className="ellipsis muted small">{a.info!.description}</span>}
      </span>
      <span className="ach-side">
        <span className="small nowrap">
          <b className="ach-rarity">{RARITY[a.info!.rarity] ?? a.info!.rarity}</b>
          {a.info!.percent ? <span className="muted num"> {dec(a.info!.percent, 2)}%</span> : null}
        </span>
        <span className="muted small num nowrap">{date(a.at * 1000)}</span>
      </span>
    </li>
  );
  return (
    <section className="block">
      <h2 className="h2">
        업적 <span className="muted num">{s.achievements.length}</span>
      </h2>
      {rows.length > 0 ? (
        <>
          <p className="sub">달성한 사람이 적은 순서입니다. 숫자는 tarkov.dev가 집계한 달성 비율입니다.</p>
          <ul className="panel list achs">{rows.slice(0, 8).map(row)}</ul>
          {rows.length > 8 && (
            <details className="more">
              <summary>나머지 {rows.length - 8}개 보기</summary>
              <ul className="panel list achs">{rows.slice(8).map(row)}</ul>
            </details>
          )}
        </>
      ) : (
        <p className="sub">아레나 업적은 공개된 이름 자료가 없어 개수만 표시합니다.</p>
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
        <Tile label="킬" value={int(v.kills)} />
        <Tile label="PMC 킬" value={int(v.pmcKills)} />
      </div>
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
        <Link className="link small" href={`/kord-breach?b=${encodeBuild(picked.map((p) => p.id))}`}>
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
      <h2 className="h2">이 사이트에서 받은 기록</h2>
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
                  <th>PMC 킬</th>
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
      <Header crumb={{ href: "/players", label: "계정 조회" }} />
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
  const [res, arena] = await Promise.all([
    load(mode, aid),
    mode.key !== "arena" && acc?.modes.arena ? load(arenaMode, aid) : Promise.resolve(null),
  ]);
  const s = res.summary;
  const registered = s?.kind === "arena" ? s.registered : arena?.summary?.kind === "arena" ? arena.summary.registered : null;
  const name = s?.name || acc?.name || `#${aid}`;
  const history = nameHistory(aid);
  const v = s ? verdict(mode, aid, toSample(s)) : null;
  const chips = s ? memberChips(s.member) : [];
  const eft = s?.kind === "eft" ? s : null;

  return (
    <>
      <Header crumb={{ href: "/players", label: "계정 조회" }} />
      <main id="main" className="wrap profile">
        <SearchBox compact />
        {(s?.name || acc?.name) && <Remember aid={aid} name={(s?.name || acc?.name)!} />}

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
          {res.error && <p className="err">tarkov.dev에서 받아오지 못해 {s ? "이전에 받은 기록을 보여줍니다." : "표시할 기록이 없습니다."}</p>}
        </section>

        <nav className="tabs" aria-label="모드">
          {MODES.map((m) => {
            const known = !acc || acc.modes[m.key] != null;
            return (
              <Link key={m.key} href={`/players/${aid}?mode=${m.key}`} aria-current={m.key === mode.key ? "page" : undefined} className={known ? undefined : "faint"} replace>
                {m.label}
              </Link>
            );
          })}
        </nav>

        {!s && !res.error && (
          <section className="panel empty">
            <p>tarkov.dev에서 이 계정의 {mode.label} 기록을 아직 조회한 적이 없습니다.</p>
            <p className="sub">tarkov.dev에서 한 번 열면 기록이 생깁니다. 열고 돌아오면 자동으로 다시 불러옵니다.</p>
          </section>
        )}

        {s && (
          <>
            {v && <Verdict v={v} mode={mode.key} official={chips.some((c) => c.official)} />}
            {s.kind === "eft" ? <EftStats s={s} /> : <ArenaStats s={s} />}
            {eft?.perks?.length ? <SeasonPerks ids={eft.perks} /> : null}
            {eft && <Scav s={eft} />}
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
