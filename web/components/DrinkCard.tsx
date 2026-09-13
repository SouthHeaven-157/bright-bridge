"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { RESULT_CONFIG } from "../lib/gameConfig";
import type { DrinkStory, DrinkStoryStatus } from "../lib/ai/generateDrinkStory";
import { GLASS_TYPES_BY_ID, type GlassType } from "../lib/glassTypes";
import { INGREDIENTS_BY_ID } from "../lib/ingredients";
import type { DrinkState, SceneState } from "../types/drink";
import { DynamicGlass } from "./DynamicGlass";
import { FlavorProfile } from "./FlavorProfile";

type DrinkCardProps = {
  drink: DrinkState;
  glassType: GlassType;
  sceneState: SceneState;
  story: DrinkStory | null;
  storyStatus: DrinkStoryStatus;
  onRetryStory: () => void;
  onReset: () => void;
};

export function DrinkCard({ drink, glassType, sceneState, story, storyStatus, onRetryStory, onReset }: DrinkCardProps) {
  const resetRef = useRef<HTMLButtonElement>(null);
  const glass = GLASS_TYPES_BY_ID.get(glassType);

  useEffect(() => {
    if (sceneState === "result") resetRef.current?.focus();
  }, [sceneState]);

  if (sceneState === "mixing") return null;

  return (
    <motion.div
      className={`result-overlay is-${sceneState}`}
      role="dialog"
      aria-modal="true"
      aria-label="调酒结果卡"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32 }}
    >
      <motion.div
        className="reveal-beam"
        aria-hidden="true"
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: [0, 0.72, 0.18], scaleY: 1 }}
        transition={{ duration: 1.15, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <motion.p
        className="reveal-status"
        initial={{ opacity: 0, letterSpacing: "0.38em" }}
        animate={{ opacity: sceneState === "serving" ? [0, 1, 0.4] : 0, letterSpacing: "0.16em" }}
        transition={{ duration: 0.9 }}
      >
        ANALYZING COMPOSITION
      </motion.p>
      <motion.article
        className="drink-card"
        initial={{ opacity: 0, scaleY: 0.08, scaleX: 0.88 }}
        animate={{ opacity: 1, scaleY: 1, scaleX: 1 }}
        transition={{ duration: 0.62, ease: [0.2, 0.82, 0.24, 1], delay: 0.2 }}
        aria-label="调酒结果卡"
        tabIndex={-1}
      >
        <motion.div className="card-glass" initial={{ y: -44, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.56, duration: 0.42 }}>
          <DynamicGlass liquid={drink.liquid} totalPct={drink.totalPct} glassType={glassType} compact />
        </motion.div>

        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.72 }}>
          <p>YOUR CREATION</p>
          <div className={`card-story-title is-${storyStatus}`} aria-live="polite">
            {story ? (
              <>
                <h2>{story.name}</h2>
                <em>{story.tagline}</em>
              </>
            ) : storyStatus === "loading" ? (
              <span className="story-loading" aria-label="正在生成酒名"><i /><i /></span>
            ) : storyStatus === "error" ? (
              <button type="button" className="story-retry" onClick={onRetryStory}>重新生成</button>
            ) : null}
          </div>
          <small>{glass?.label} · {glass?.labelZh}</small>
        </motion.header>

        <motion.section className="recipe-layers" initial={{ opacity: 0, scaleX: 0.2 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.8 }} aria-label="配方组成分层图">
          {drink.ingredients.map((item) => {
            const ingredient = INGREDIENTS_BY_ID.get(item.ingredientId);
            const width = drink.totalPct > 0 ? item.amountPct / drink.totalPct * 100 : 0;
            const layerColor = ingredient ? `rgb(${ingredient.color.r} ${ingredient.color.g} ${ingredient.color.b})` : "#72e8da";
            return (
              <i
                key={item.ingredientId}
                title={`${ingredient ? `${ingredient.nameZh} / ${ingredient.name}` : item.ingredientId}: ${item.amountPct}%`}
                style={{ "--layer-width": `${width}%`, "--layer-color": layerColor } as CSSProperties}
              />
            );
          })}
        </motion.section>

        <motion.div className="card-recipe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.88 }}>
          {drink.ingredients.map((item) => (
            <div key={item.ingredientId}>
              <span>{INGREDIENTS_BY_ID.get(item.ingredientId)?.nameZh} / {INGREDIENTS_BY_ID.get(item.ingredientId)?.name}</span>
              <strong>{item.amountPct}%</strong>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.04 }}>
          <FlavorProfile profile={drink.flavor} mood={drink.mood} compact />
        </motion.div>

        {story ? (
          <motion.p className="card-story-description" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {story.description}
          </motion.p>
        ) : null}

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
