"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { DEFAULT_GLASS_TYPE, GLASS_TYPES_BY_ID, type GlassType } from "../lib/glassTypes";
import type { LiquidVisualState } from "../types/drink";
import type { RgbColor } from "../types/ingredient";

type DynamicGlassProps = {
  liquid: LiquidVisualState;
  totalPct: number;
  glassType?: GlassType;
  isPouring?: boolean;
  impactColor?: RgbColor;
  compact?: boolean;
};

const bubbles = [
  [42, 130, 2.2], [54, 118, 1.5], [68, 133, 2.8], [78, 112, 1.8],
  [49, 100, 2.5], [72, 92, 1.4], [59, 81, 2], [84, 128, 1.2],
  [37, 109, 1.3], [64, 121, 1.6], [45, 87, 1.2], [76, 75, 2.1],
  [57, 67, 1.4], [83, 99, 1.5], [39, 72, 1.1], [68, 55, 1.3],
  [51, 47, 1.7], [79, 44, 1.1], [61, 106, 1.1], [87, 119, 1.3],
] as const;

const foamBubbles = [[-25, 2.6], [-15, 3.8], [-4, 2.8], [7, 4.2], [18, 3.1], [27, 2.3]] as const;

export function DynamicGlass({
  liquid,
  totalPct,
  glassType = DEFAULT_GLASS_TYPE,
  isPouring = false,
  impactColor,
  compact = false,
}: DynamicGlassProps) {
  const id = useId().replaceAll(":", "");
  const clipId = `glass-clip-${id}`;
  const liquidId = `liquid-fill-${id}`;
  const diffusionId = `liquid-diffusion-${id}`;
  const preset = GLASS_TYPES_BY_ID.get(glassType) ?? GLASS_TYPES_BY_ID.get(DEFAULT_GLASS_TYPE)!;
  const bounds = preset.liquidBounds;
  const top = bounds.bottom - liquid.level * (bounds.bottom - bounds.top);
  const height = Math.max(0, bounds.bottom - top);
  const color = `rgb(${liquid.color.r} ${liquid.color.g} ${liquid.color.b})`;
  const impact = impactColor ? `rgb(${impactColor.r} ${impactColor.g} ${impactColor.b})` : color;
  const bubbleCount = liquid.fizz > 0.02 ? 8 + Math.round(liquid.fizz * 12) : 0;
  const foamOpacity = totalPct > 0 ? Math.min(0.82, liquid.foam * 0.9 + (isPouring ? 0.1 : 0)) : 0;
  const liquidSpring = {
    type: "spring" as const,
    stiffness: 118 - liquid.viscosity * 58,
    damping: 18 + liquid.viscosity * 12,
  };

  return (
    <div className={`dynamic-glass glass-${glassType} ${isPouring ? "is-reacting" : ""} ${compact ? "is-compact" : ""}`}>
      <svg viewBox="0 0 120 168" role="img" aria-label={`${preset.labelZh}当前容量 ${totalPct}%`}>
        <defs>
          <clipPath id={clipId}><path d={preset.clipPath} /></clipPath>
          <linearGradient id={liquidId} x1="0" x2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.48 + liquid.opacity * 0.34} />
            <stop offset="0.34" stopColor={color} stopOpacity={0.8 + liquid.opacity * 0.18} />
            <stop offset="1" stopColor={color} stopOpacity={0.54 + liquid.opacity * 0.3} />
          </linearGradient>
          <radialGradient id={diffusionId} cx="50%" cy="8%" r="82%">
            <stop offset="0" stopColor={impact} stopOpacity=".88" />
            <stop offset=".42" stopColor={impact} stopOpacity=".32" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <filter id={`soften-${id}`}><feGaussianBlur stdDeviation={liquid.cloudiness * 1.45} /></filter>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            x={bounds.x}
            width={bounds.width}
            rx="7"
            fill={`url(#${liquidId})`}
            filter={`url(#soften-${id})`}
            animate={{ y: top, height }}
            transition={liquidSpring}
          />
          <motion.rect
            x={bounds.x}
            width={bounds.width}
            fill={`url(#${diffusionId})`}
            animate={{ y: top, height, opacity: isPouring ? [0.2, 0.62, 0.28] : 0 }}
            transition={{ y: liquidSpring, height: liquidSpring, opacity: { duration: 0.72, repeat: isPouring ? Number.POSITIVE_INFINITY : 0 } }}
          />

          {height > 0 && (
            <>
              <motion.ellipse
                cx="60"
                rx={bounds.surfaceRx}
                ry={isPouring ? 4.2 : 3.1}
                fill={color}
                fillOpacity={0.72}
                animate={{ cy: top + 2, scaleX: isPouring ? [0.86, 1.06, 0.9] : [0.98, 1.02, 0.98], rotate: isPouring ? [0, -1.4, 0.8, 0] : 0 }}
                transition={{ cy: liquidSpring, scaleX: { duration: isPouring ? 0.42 + liquid.viscosity * 0.45 : 1.5, repeat: Number.POSITIVE_INFINITY }, rotate: { duration: 0.6, repeat: isPouring ? Number.POSITIVE_INFINITY : 0 } }}
              />
              <motion.ellipse
                cx="60"
                rx={Math.max(8, bounds.surfaceRx * 0.45)}
                ry="1.4"
                fill="none"
                stroke="rgb(255 255 255 / 48%)"
                strokeWidth=".8"
                animate={{ cy: top + 2, scaleX: isPouring ? [0.3, 1.6] : 0.72, opacity: isPouring ? [0.8, 0] : 0.24 }}
                transition={{ cy: liquidSpring, scaleX: { duration: 0.7 + liquid.viscosity * 0.5, repeat: Number.POSITIVE_INFINITY }, opacity: { duration: 0.7 + liquid.viscosity * 0.5, repeat: Number.POSITIVE_INFINITY } }}
              />
              {isPouring && (
                <>
                  <motion.ellipse
                    className="liquid-impact-ring"
                    cx="60"
                    rx={Math.max(10, bounds.surfaceRx * 0.28)}
                    ry="2.2"
                    fill="none"
                    stroke={impact}
                    strokeWidth="1.8"
                    animate={{ cy: top + 2, scaleX: [0.28, 1.85], scaleY: [0.7, 1.2], opacity: [0.95, 0] }}
                    transition={{ cy: liquidSpring, duration: 0.62, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
                  />
                  <motion.path
                    className="liquid-impact-plume"
                    d={`M 55 ${Math.max(bounds.top, top - 2)} Q 60 ${Math.max(bounds.top, top - 14)} 65 ${Math.max(bounds.top, top - 2)}`}
                    fill="none"
                    stroke={impact}
                    strokeWidth="2"
                    strokeLinecap="round"
                    animate={{ opacity: [0.2, 0.92, 0.25], scaleY: [0.72, 1.16, 0.8] }}
                    transition={{ duration: 0.48 + liquid.viscosity * 0.3, repeat: Number.POSITIVE_INFINITY }}
                  />
                </>
              )}
              {foamBubbles.map(([offset, radius], index) => (
                <motion.circle
                  key={offset}
                  cx={60 + offset * Math.min(1, bounds.surfaceRx / 35)}
                  r={radius}
                  fill="rgb(246 239 216 / 78%)"
                  stroke="rgb(255 255 255 / 55%)"
                  strokeWidth=".55"
                  animate={{ cy: top + 1.5 + (index % 2), opacity: foamOpacity, scale: isPouring ? [0.86, 1.08, 0.9] : 1 }}
                  transition={{ cy: liquidSpring, opacity: { duration: 0.25 }, scale: { duration: 0.9 + index * 0.08, repeat: Number.POSITIVE_INFINITY } }}
                />
              ))}
            </>
          )}

          {bubbles.slice(0, bubbleCount).map(([cx, cy, radius], index) => (
            <motion.circle
              key={`${cx}-${cy}`}
              cx={Math.min(bounds.x + bounds.width - 4, Math.max(bounds.x + 4, cx))}
              cy={Math.max(top + 8, Math.min(bounds.bottom - 4, cy))}
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

        <path d={preset.outlinePath} fill="rgb(214 244 240 / 4%)" stroke="rgb(226 255 248 / 74%)" strokeWidth="2" />
        <path d={preset.rimPath} fill="none" stroke="#f4fffd" strokeOpacity=".82" strokeWidth="2.2" strokeLinecap="round" />
        <path d={preset.highlightPath} fill="none" stroke="white" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />
        <path d={preset.basePath} fill="none" stroke="rgb(226 255 248 / 54%)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!compact && <span className="glass-total">{totalPct}%</span>}
    </div>
  );
}
