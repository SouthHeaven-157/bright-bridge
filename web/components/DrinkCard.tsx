"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { RESULT_CONFIG } from "../lib/gameConfig";
import { INGREDIENTS_BY_ID } from "../lib/ingredients";
import type { DrinkState, SceneState } from "../types/drink";
import { DynamicGlass } from "./DynamicGlass";
import { FlavorProfile } from "./FlavorProfile";

type DrinkCardProps = {
  drink: DrinkState;
  sceneState: SceneState;
  onReset: () => void;
};

export function DrinkCard({ drink, sceneState, onReset }: DrinkCardProps) {
  const resetRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (sceneState === "result") resetRef.current?.focus();
  }, [sceneState]);

  if (sceneState === "mixing") return null;

  return (
    <motion.div
      className="result-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="调酒结果卡"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32 }}
    >
      <motion.article
        className="drink-card"
        initial={{ opacity: 0, scaleY: 0.08, scaleX: 0.88 }}
        animate={{ opacity: 1, scaleY: 1, scaleX: 1 }}
        transition={{ duration: 0.62, ease: [0.2, 0.82, 0.24, 1], delay: 0.2 }}
        aria-label="调酒结果卡"
        tabIndex={-1}
      >
        <motion.div className="card-glass" initial={{ y: -44, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.56, duration: 0.42 }}>
          <DynamicGlass liquid={drink.liquid} totalPct={drink.totalPct} compact />
        </motion.div>

        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.72 }}>
          <p>YOUR CREATION</p>
          <h2>SPECIMEN // {String(RESULT_CONFIG.specimenNumber).padStart(3, "0")}</h2>
        </motion.header>

        <motion.div className="card-recipe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.88 }}>
          {drink.ingredients.map((item) => (
            <div key={item.ingredientId}>
              <span>{INGREDIENTS_BY_ID.get(item.ingredientId)?.name}</span>
              <strong>{item.amountPct}%</strong>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.04 }}>
          <FlavorProfile profile={drink.flavor} compact />
        </motion.div>

        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <span>TOTAL VOLUME</span><strong>{drink.totalPct}%</strong><b>#{String(RESULT_CONFIG.specimenNumber).padStart(3, "0")}</b>
        </motion.footer>

        {sceneState === "result" ? (
          <motion.button
            ref={resetRef}
            className="card-reset"
            type="button"
            onClick={onReset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.2 }}
          >
            MIX AGAIN
          </motion.button>
        ) : null}
      </motion.article>
    </motion.div>
  );
}
