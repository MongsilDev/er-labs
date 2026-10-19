"use client";

import { useState } from "react";
import { GLOBAL, POSITIVE, NEGATIVE, conflictMap, type Trait } from "@/data/traits";
import { TraitIcon } from "@/components/kord/TraitIcon";

const fmt = (n: number) => (n > 0 ? "+" : "") + n;

export default function Simulator() {
  const [sel, setSel] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const cost = POSITIVE.filter((t) => sel.has(t.id)).reduce((a, t) => a + (t.points ?? 0), 0);
  const gain = NEGATIVE.filter((t) => sel.has(t.id)).reduce((a, t) => a + (t.points ?? 0), 0);
  const net = cost + gain;

  // 선택된 특성과 상호 배타 관계라 지금은 고를 수 없는 특성들
  const blocked = new Set<string>();
  for (const id of sel) {
    for (const c of conflictMap[id] ?? []) {
      if (!sel.has(c)) blocked.add(c);
    }
  }

  const Card = ({ t, type }: { t: Trait; type: "pos" | "neg" }) => {
    const isBlocked = blocked.has(t.id);
    return (
    <button
      type="button"
      className={`kb-card kb-${type}`}
      aria-pressed={sel.has(t.id)}
      aria-label={`${t.name} ${fmt(t.points ?? 0)}`}
      disabled={isBlocked}
      title={isBlocked ? "충돌하는 특성이 선택되어 있어 함께 고를 수 없습니다" : undefined}
      onClick={() => toggle(t.id)}
    >
      <TraitIcon id={t.id} className="kb-cic" />
      <div className="kb-cbody">
        <div className="kb-ctop">
          <span className="kb-cname">{t.name}</span>
          {t.note && <span className="kb-cbadge">✦ {t.note}</span>}
          <span className="kb-cpts">{fmt(t.points ?? 0)}</span>
        </div>
        <div className="kb-ceff">• {t.effect}</div>
      </div>
    </button>
    );
  };

  return (
    <div className="kord">
      <header className="kb-head">
        <div className="kb-brand">
          <div className="kb-mark" />
          <div>
            <h1 className="kb-title">KORD BREACH</h1>
            <div className="kb-sub">특성 시뮬레이터 · SEASON 1</div>
          </div>
        </div>
        <div className="kb-infobar" role="note">
          <span className="kb-ico" aria-hidden="true">ⓘ</span>
          <div className="kb-inotes">
            <span>
              알레르기는 메드킷과 CMS를 제외한 의약품, 자극제, 음료, 식량에만 적용되며, 발동 시 손 떨림 후 중독
              피해가 발생합니다.
            </span>
          </div>
        </div>
        <div className="kb-score">
          <div className="kb-scorepanel">
            <div className="kb-sp-break">
              <span className="kb-c">
                긍정 <b>{cost === 0 ? "0" : fmt(cost)}</b>
              </span>
              <span className="kb-g">
                부정 <b>{fmt(gain)}</b>
              </span>
            </div>
            <div className="kb-sp-net">
              <div className="kb-lab">순 합계</div>
              <div
                className="kb-val"
                style={{ color: net < 0 ? "var(--grn)" : net > 0 ? "var(--red)" : undefined }}
              >
                {fmt(net)}
              </div>
            </div>
          </div>
          <button type="button" className="kb-reset" onClick={() => setSel(new Set())}>
            초기화
          </button>
        </div>
      </header>

      <div className="kb-board">
        <div className="kb-sec">
          <div className="kb-bar kb-gray">Global modifiers</div>
          <div className="kb-grid">
            {GLOBAL.map((t) => (
              <div key={t.id} className="kb-gchip">
                <TraitIcon id={t.id} className="kb-cic" />
                <div className="kb-cbody">
                  <div className="kb-ctop">
                    <span className="kb-cname">{t.name}</span>
                  </div>
                  <div className="kb-ceff">• {t.effect}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="kb-sec kb-pos">
          <div className="kb-bar kb-green">Personal positive</div>
          <div className="kb-grid kb-pos">
            {POSITIVE.map((t) => (
              <Card key={t.id} t={t} type="pos" />
            ))}
          </div>
        </div>
        <div className="kb-sec kb-neg">
          <div className="kb-bar kb-red">Personal negative</div>
          <div className="kb-grid kb-neg">
            {NEGATIVE.map((t) => (
              <Card key={t.id} t={t} type="neg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
