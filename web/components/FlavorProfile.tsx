"use client";

import { motion } from "framer-motion";
import type { FlavorKey, FlavorProfile as FlavorProfileData, MoodProfile } from "../types/drink";

type FlavorProfileProps = {
  profile: FlavorProfileData;
  mood: MoodProfile;
  compact?: boolean;
  active?: boolean;
  highlightKey?: FlavorKey | null;
};

const rows = [
  ["甜度", "sweetness"],
  ["酸度", "acidity"],
  ["苦度", "bitterness"],
  ["酒精感", "alcohol"],
  ["清新度", "freshness"],
  ["酒体", "body"],
] as const;

function getMoodLabel(valence: number) {
  if (valence <= -0.35) return "深沉";
  if (valence <= -0.08) return "静思";
  if (valence < 0.08) return "平衡";
  if (valence < 0.4) return "明快";
  return "欢悦";
}

export function FlavorProfile({ profile, mood, compact = false, active = false, highlightKey = null }: FlavorProfileProps) {
  const moodPosition = Math.round((mood.valence + 1) * 50);
  const moodLabel = getMoodLabel(mood.valence);

  return (
    <section className={`flavor-panel ${compact ? "is-compact" : ""} ${active ? "is-active" : ""}`} aria-label="实时风味数据">
      <p>{active ? "风味变化" : "风味轮廓"}</p>
      {rows.map(([label, key]) => {
        const percentage = Math.round(profile[key] * 100);
        return (
          <div className={`flavor-row ${highlightKey === key ? "is-highlighted" : ""}`} key={key}>
            <span>{label}</span>
            <div className="flavor-track" aria-hidden="true">
              <motion.i animate={{ width: `${percentage}%` }} transition={{ type: "spring", stiffness: 120, damping: 24 }} />
            </div>
            <strong>{percentage}</strong>
          </div>
        );
      })}
      <div className="mood-layer" data-mood-valence={mood.valence.toFixed(2)}>
        <div className="mood-heading"><span>情绪倾向</span><strong>{moodLabel}</strong></div>
        <div className="mood-scale" aria-label={`情绪倾向：${moodLabel}，忧郁到喜悦位置 ${moodPosition}%`}>
          <span>忧郁</span>
          <div className="mood-track" aria-hidden="true">
            <motion.i
              animate={{ left: `${moodPosition}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 24 }}
            />
          </div>
          <span>喜悦</span>
        </div>
      </div>
    </section>
  );
}
