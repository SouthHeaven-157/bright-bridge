"use client";

import { motion } from "framer-motion";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
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
      className={`ingredient-bottle ${isActive ? "is-active" : ""}`}
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
        y: isActive ? offset.y - 6 : 0,
        rotate: isPouring ? -38 : 0,
        scale: isActive ? 1.06 : 1,
      }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      style={{ zIndex: isActive ? 40 : 1 }}
    >
      <span className="bottle-art" style={{ "--liquid-color": bottleColor } as CSSProperties} aria-hidden="true">
        <i className="bottle-cap" />
        <i className="bottle-neck" />
        <i className="bottle-body"><b>{ingredient.name.slice(0, 1)}</b></i>
      </span>
      <span className="bottle-name">{ingredient.name}</span>
      <span className="bottle-amount">{amountPct}%</span>
    </motion.button>
  );
}
