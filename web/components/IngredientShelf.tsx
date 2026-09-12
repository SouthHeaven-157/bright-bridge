"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { INGREDIENTS } from "../lib/ingredients";
import type { DrinkIngredient } from "../types/drink";
import type { Ingredient, IngredientId } from "../types/ingredient";
import { IngredientBottle } from "./IngredientBottle";

type IngredientShelfProps = {
  activeIngredientId: IngredientId | null;
  disabled: boolean;
  ingredients: DrinkIngredient[];
  isPouring: boolean;
  offset: { x: number; y: number };
  onPointerDown: (ingredient: Ingredient, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCaptureLost: () => void;
  onKeyboardPour: (ingredient: Ingredient) => void;
};

export function IngredientShelf({
  activeIngredientId,
  disabled,
  ingredients,
  isPouring,
  offset,
  onPointerDown,
  onPointerCaptureLost,
  onKeyboardPour,
}: IngredientShelfProps) {
  const amounts = new Map(ingredients.map((item) => [item.ingredientId, item.amountPct]));

  return (
    <div className="ingredient-dock" aria-label="配料架">
      {INGREDIENTS.map((ingredient) => (
        <IngredientBottle
          key={ingredient.id}
          ingredient={ingredient}
          amountPct={amounts.get(ingredient.id) ?? 0}
          disabled={disabled}
          isActive={activeIngredientId === ingredient.id}
          isPouring={isPouring && activeIngredientId === ingredient.id}
          offset={activeIngredientId === ingredient.id ? offset : { x: 0, y: 0 }}
          onPointerDown={onPointerDown}
          onPointerCaptureLost={onPointerCaptureLost}
          onKeyboardPour={onKeyboardPour}
        />
      ))}
    </div>
  );
}
