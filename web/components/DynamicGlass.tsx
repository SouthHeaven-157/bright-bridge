"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import type { LiquidVisualState } from "../types/drink";

type DynamicGlassProps = {
  liquid: LiquidVisualState;
  totalPct: number;
  compact?: boolean;
};

const bubbles = [
  [42, 130, 2.2], [54, 118, 1.5], [68, 133, 2.8], [78, 112, 1.8],
  [49, 100, 2.5], [72, 92, 1.4], [59, 81, 2], [84, 128, 1.2],
  [37, 109, 1.3], [64, 121, 1.6], [45, 87, 1.2], [76, 75, 2.1],
  [57, 67, 1.4], [83, 99, 1.5], [39, 72, 1.1], [68, 55, 1.3],
  [51, 47, 1.7], [79, 44, 1.1], [61, 106, 1.1], [87, 119, 1.3],
] as const;

export function DynamicGlass({ liquid, totalPct, compact = false }: DynamicGlassProps) {
  const id = useId().replaceAll(":", "");
  const clipId = `glass-clip-${id}`;
  const liquidId = `liquid-fill-${id}`;
  const top = 139 - liquid.level * 104;
  const height = Math.max(0, 139 - top);
  const color = `rgb(${liquid.color.r} ${liquid.color.g} ${liquid.color.b})`;
  const bubbleCount = liquid.fizz > 0.02 ? 8 + Math.round(liquid.fizz * 12) : 0;

  return (
    <div className={`dynamic-glass ${compact ? "is-compact" : ""}`}>
      <svg viewBox="0 0 120 168" role="img" aria-label={`酒杯当前容量 ${totalPct}%`}>
        <defs>
          <clipPath id={clipId}>
            <path d="M24 18h72l-8 112c-.8 12-10.8 21-22.8 21H54.8C42.8 151 32.8 142 32 130L24 18Z" />
          </clipPath>
          <linearGradient id={liquidId} x1="0" x2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.5 + liquid.opacity * 0.35} />
            <stop offset="0.34" stopColor={color} stopOpacity={0.84 + liquid.opacity * 0.14} />
            <stop offset="1" stopColor={color} stopOpacity={0.58 + liquid.opacity * 0.3} />
          </linearGradient>
          <filter id={`soften-${id}`}>
            <feGaussianBlur stdDeviation={liquid.cloudiness * 1.4} />
          </filter>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            x="24"
            width="72"
            rx="7"
            fill={`url(#${liquidId})`}
            filter={`url(#soften-${id})`}
            animate={{ y: top, height }}
            transition={{ type: "spring", stiffness: 95, damping: 20 }}
          />
          {height > 0 && (
            <motion.ellipse
              cx="60"
              rx="35"
              ry="3.2"
              fill={color}
              fillOpacity={0.74}
              animate={{ cy: top + 2, scaleX: [0.98, 1.02, 0.98] }}
              transition={{ cy: { type: "spring", stiffness: 95, damping: 20 }, scaleX: { duration: 1.5, repeat: Number.POSITIVE_INFINITY } }}
            />
          )}
          {bubbles.slice(0, bubbleCount).map(([cx, cy, radius], index) => (
            <motion.circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={Math.max(top + 8, cy)}
              r={radius}
              fill="none"
              stroke="rgb(255 255 255 / 62%)"
              strokeWidth="0.8"
              initial={{ opacity: 0 }}
              animate={{ y: [8, -13], opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.4 + (index % 4) * 0.28, repeat: Number.POSITIVE_INFINITY, delay: (index % 6) * 0.16 }}
            />
          ))}
        </g>

        <path d="M24 18h72l-8 112c-.8 12-10.8 21-22.8 21H54.8C42.8 151 32.8 142 32 130L24 18Z" fill="rgb(214 244 240 / 4%)" stroke="rgb(226 255 248 / 74%)" strokeWidth="2" />
        <path d="M25 19c13 3 57 3 70 0" fill="none" stroke="#f4fffd" strokeOpacity=".82" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M37 31l6 88c.4 7 4 13 10 16" fill="none" stroke="white" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />
        <path d="M48 151v7h24v-7M42 159h36" fill="none" stroke="rgb(226 255 248 / 54%)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!compact && <span className="glass-total">{totalPct}%</span>}
    </div>
  );
}
