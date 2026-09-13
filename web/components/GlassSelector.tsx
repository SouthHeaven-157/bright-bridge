"use client";

import { GLASS_TYPES, type GlassType } from "../lib/glassTypes";

type GlassSelectorProps = {
  selected: GlassType;
  disabled: boolean;
  onSelect: (glassType: GlassType) => void;
};

export function GlassSelector({ selected, disabled, onSelect }: GlassSelectorProps) {
  return (
    <div className="glass-selector" role="radiogroup" aria-label="选择酒杯杯型">
      {GLASS_TYPES.map((glass) => (
        <button
          key={glass.id}
          className={`glass-option ${selected === glass.id ? "is-selected" : ""}`}
          type="button"
          role="radio"
          aria-checked={selected === glass.id}
          disabled={disabled}
          onClick={() => onSelect(glass.id)}
        >
          <svg viewBox="0 0 120 168" aria-hidden="true">
            <path d={glass.outlinePath} />
            <path d={glass.basePath} />
          </svg>
          <span>{glass.label}</span>
          <small>{glass.labelZh}</small>
        </button>
      ))}
    </div>
  );
}
