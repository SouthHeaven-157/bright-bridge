"use client";

import { motion } from "framer-motion";
import type { FlavorProfile as FlavorProfileData } from "../types/drink";

type FlavorProfileProps = {
  profile: FlavorProfileData;
  compact?: boolean;
};

const rows = [
  ["SWEET", "sweetness"],
  ["SOUR", "acidity"],
  ["BITTER", "bitterness"],
  ["ALCOHOL", "alcohol"],
  ["FRESH", "freshness"],
  ["BODY", "body"],
] as const;

export function FlavorProfile({ profile, compact = false }: FlavorProfileProps) {
  return (
    <section className={`flavor-panel ${compact ? "is-compact" : ""}`} aria-label="实时风味数据">
      <p>FLAVOR PROFILE</p>
      {rows.map(([label, key]) => {
        const percentage = Math.round(profile[key] * 100);
        return (
          <div className="flavor-row" key={key}>
            <span>{label}</span>
            <div className="flavor-track" aria-hidden="true">
              <motion.i animate={{ width: `${percentage}%` }} transition={{ type: "spring", stiffness: 120, damping: 24 }} />
            </div>
            <strong>{percentage}</strong>
          </div>
        );
      })}
    </section>
  );
}
