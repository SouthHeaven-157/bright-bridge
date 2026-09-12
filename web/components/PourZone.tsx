"use client";

import { forwardRef } from "react";
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
};

export const PourZone = forwardRef<HTMLDivElement, PourZoneProps>(
  function PourZone(
    { active, isPouring, liquid, totalPct, activeIngredientId },
    ref,
  ) {
    return (
      <div ref={ref} className={`pour-zone ${active ? "is-active" : ""} ${isPouring ? "is-pouring" : ""}`}>
        <span className="pour-marker">{isPouring ? "POURING" : "POUR ZONE"}</span>
        <PourStream ingredientId={isPouring ? activeIngredientId : null} />
        <DynamicGlass liquid={liquid} totalPct={totalPct} />
      </div>
    );
  },
);
