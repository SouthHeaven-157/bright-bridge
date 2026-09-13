"use client";

import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GLASS_TYPES_BY_ID, type GlassType } from "../lib/glassTypes";
import { INGREDIENTS_BY_ID } from "../lib/ingredients";
import { VISUAL_ASSETS } from "../lib/visualAssets";
import type { LiquidVisualState } from "../types/drink";
import type { IngredientId } from "../types/ingredient";
import { DynamicGlass } from "./DynamicGlass";
import { PourStream } from "./PourStream";

type PourZoneProps = {
  active: boolean;
  isPouring: boolean;
  liquid: LiquidVisualState;
  totalPct: number;
  activeIngredientId: IngredientId | null;
  glassType: GlassType;
};

export const PourZone = forwardRef<HTMLDivElement, PourZoneProps>(
  function PourZone(
    { active, isPouring, liquid, totalPct, activeIngredientId, glassType },
    ref,
  ) {
    const ingredient = activeIngredientId ? INGREDIENTS_BY_ID.get(activeIngredientId) : null;
    const glassLabel = GLASS_TYPES_BY_ID.get(glassType)?.labelZh ?? "酒杯";
    const [failedGlassAssets, setFailedGlassAssets] = useState<Partial<Record<GlassType, true>>>({});
    const hasGlassAsset = !failedGlassAssets[glassType];

    return (
      <div ref={ref} className={`pour-zone ${active ? "is-active" : ""} ${isPouring ? "is-pouring" : ""}`}>
        <span className="pour-marker">{isPouring ? "POURING" : "POUR ZONE"}</span>
        <AnimatePresence>
          {isPouring && ingredient ? (
            <motion.span
              className="pour-ingredient-label"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
            >
              正在倒入<br /><strong>{ingredient.nameZh}</strong>
            </motion.span>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {isPouring && ingredient ? (
            <motion.img
              className="pour-bottle-raster"
              src={VISUAL_ASSETS.ingredientBottles[ingredient.id]}
              alt=""
              aria-hidden="true"
              draggable={false}
              initial={{ opacity: 0, scale: 0.72, rotate: 104 }}
              animate={{ opacity: 1, scale: 1, rotate: 132 }}
              exit={{ opacity: 0, scale: 0.8, rotate: 112 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onError={(event) => { event.currentTarget.hidden = true; }}
            />
          ) : null}
        </AnimatePresence>
        <PourStream ingredientId={isPouring ? activeIngredientId : null} />
        <div
          className={`glass-visual-stack ${hasGlassAsset ? "has-raster" : "is-fallback"}`}
          data-visual-mode={isPouring ? "dynamic" : hasGlassAsset ? "asset" : "fallback"}
        >
          <DynamicGlass
            liquid={liquid}
            totalPct={totalPct}
            glassType={glassType}
            isPouring={isPouring}
            impactColor={ingredient?.color}
          />
          {hasGlassAsset ? (
            <motion.img
              key={glassType}
              className="glass-raster"
              src={VISUAL_ASSETS.glassware[glassType]}
              alt=""
              aria-hidden="true"
              draggable={false}
              onError={() => setFailedGlassAssets((current) => ({ ...current, [glassType]: true }))}
            />
          ) : null}
        </div>
        <span className="glass-type-caption">{glassLabel}</span>
      </div>
    );
  },
);
