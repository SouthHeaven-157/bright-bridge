"use client";

import { AnimatePresence, motion } from "framer-motion";
import { INGREDIENTS_BY_ID } from "../lib/ingredients";
import type { IngredientId } from "../types/ingredient";

export function PourStream({ ingredientId }: { ingredientId: IngredientId | null }) {
  const ingredient = ingredientId ? INGREDIENTS_BY_ID.get(ingredientId) : null;
  const color = ingredient
    ? `rgb(${ingredient.color.r} ${ingredient.color.g} ${ingredient.color.b})`
    : "transparent";

  return (
    <AnimatePresence>
      {ingredient && (
        <motion.div
          className="pour-stream"
          style={{ backgroundColor: color }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 0.82 }}
          exit={{ scaleY: 0, opacity: 0 }}
          transition={{ duration: 0.12 }}
          aria-hidden="true"
        />
      )}
    </AnimatePresence>
  );
}
