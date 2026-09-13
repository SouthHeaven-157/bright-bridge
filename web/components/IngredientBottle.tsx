"use client";

import { motion } from "framer-motion";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { VISUAL_ASSETS } from "../lib/visualAssets";
import type { Ingredient } from "../types/ingredient";

type IngredientBottleProps = {
  ingredient: Ingredient;
  amountPct: number;
  disabled: boolean;
  isActive: boolean;
  isPouring: boolean;
  offset: { x: number; y: number };
  onPointerDown: (ingredient: Ingredient, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCaptureLost: () => void;
  onKeyboardPour: (ingredient: Ingredient) => void;
};

export function IngredientBottle({
  ingredient,
  amountPct,
  disabled,
  isActive,
  isPouring,
  offset,
  onPointerDown,
  onPointerCaptureLost,
  onKeyboardPour,
}: IngredientBottleProps) {
  const bottleColor = `rgb(${ingredient.color.r} ${ingredient.color.g} ${ingredient.color.b})`;

  return (
    <motion.button
      type="button"
      className={`ingredient-bottle ${isActive ? "is-active" : ""} ${isPouring ? "is-pouring" : ""}`}
      disabled={disabled}
      aria-label={`${ingredient.name}，当前 ${amountPct}%${disabled ? "，不可继续添加" : "，拖到酒杯倒入"}`}
      onPointerDown={(event) => onPointerDown(ingredient, event)}
      onLostPointerCapture={onPointerCaptureLost}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !disabled) {
          event.preventDefault();
          onKeyboardPour(ingredient);
        }
      }}
      animate={{
        x: isActive ? offset.x : 0,
        y: isActive ? offset.y - 8 : 0,
        rotate: isPouring ? -42 : 0,
        scale: isActive ? (isPouring ? 2.6 : 1.9) : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      style={{ zIndex: isActive ? 40 : 1 }}
      data-ingredient-id={ingredient.id}
    >
      <img
        className="bottle-raster"
        src={VISUAL_ASSETS.ingredientBottles[ingredient.id]}
        alt=""
        aria-hidden="true"
        draggable={false}
        onError={(event) => { event.currentTarget.hidden = true; }}
      />
      <span className="bottle-art" style={{ "--liquid-color": bottleColor } as CSSProperties} aria-hidden="true">
        <i className="bottle-cap" />
        <i className="bottle-neck" />
        <i className="bottle-body"><b>{ingredient.name.slice(0, 1)}</b></i>
      </span>
      <span className="bottle-name">{ingredient.nameZh}</span>
      <span className="bottle-amount">{amountPct}%</span>
    </motion.button>
  );
}
