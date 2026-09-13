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
        <motion.svg
          className="pour-stream"
          style={{ color }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          aria-hidden="true"
        >
          <motion.path
            className="pour-stream-path"
            d="M 50 45 C 64 47, 62 56, 50 62"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
          <motion.path
            className="pour-stream-highlight"
            d="M 50 45 C 64 47, 62 56, 50 62"
            fill="none"
            stroke="white"
            strokeOpacity="0.7"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeDasharray="5 11"
            vectorEffect="non-scaling-stroke"
            animate={{ strokeDashoffset: [0, -48] }}
            transition={{ duration: 0.72, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
