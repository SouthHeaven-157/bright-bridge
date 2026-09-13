"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BarScene } from "./BarScene";
import { DrinkCard } from "./DrinkCard";
import { GlassSelector } from "./GlassSelector";
import { ServeControl } from "./ServeControl";
import { GAMEPLAY_CONFIG } from "../lib/gameConfig";
import { generateDrinkStory, type DrinkStory, type DrinkStoryStatus } from "../lib/ai/generateDrinkStory";
import { DEFAULT_GLASS_TYPE, GLASS_TYPES_BY_ID, type GlassType } from "../lib/glassTypes";
import { INGREDIENTS, INGREDIENTS_BY_ID } from "../lib/ingredients";
import { createDrinkState, incrementIngredient, setRecipe } from "../lib/mixEngine";
import type { DragState, DrinkIngredient, DrinkState, SceneState } from "../types/drink";
import type { Ingredient, IngredientId } from "../types/ingredient";

const EMPTY_DRAG: DragState = {
  activeIngredientId: null,
  isDragging: false,
  isInsidePourZone: false,
  isPouring: false,
};

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  bottleRect: { left: number; right: number; top: number; bottom: number };
};

type WebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute(input: unknown): unknown | Promise<unknown>;
};

type WebMcpContext = {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): void | Promise<void>;
};

export function GameViewport() {
  const [drink, setDrink] = useState<DrinkState>(() => createDrinkState());
  const [drag, setDrag] = useState<DragState>(EMPTY_DRAG);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [sceneState, setSceneState] = useState<SceneState>("mixing");
  const [glassType, setGlassType] = useState<GlassType>(DEFAULT_GLASS_TYPE);
  const [drinkStory, setDrinkStory] = useState<DrinkStory | null>(null);
  const [drinkStoryStatus, setDrinkStoryStatus] = useState<DrinkStoryStatus>("idle");

  const pourZoneRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const dragRef = useRef(drag);
  const pourTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serveCancellationRef = useRef<((reason: Error) => void) | null>(null);
  const drinkRef = useRef(drink);
  const sceneStateRef = useRef(sceneState);
  const storyAbortRef = useRef<AbortController | null>(null);
  const storyRequestIdRef = useRef(0);

  useEffect(() => {
    drinkRef.current = drink;
  }, [drink]);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    sceneStateRef.current = sceneState;
  }, [sceneState]);

  const clearPourTimer = useCallback(() => {
    if (pourTimerRef.current) {
      clearInterval(pourTimerRef.current);
      pourTimerRef.current = null;
    }
  }, []);

  const finishDrag = useCallback(() => {
    clearPourTimer();
    dragSessionRef.current = null;
    dragRef.current = EMPTY_DRAG;
    setDrag(EMPTY_DRAG);
    setDragOffset({ x: 0, y: 0 });
  }, [clearPourTimer]);

  const updateDrink = useCallback((updater: (current: DrinkState) => DrinkState) => {
    setDrink((current) => {
      const next = updater(current);
      drinkRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const session = dragSessionRef.current;
    if (
      !session ||
      !drag.isPouring ||
      !drag.activeIngredientId ||
      sceneState !== "mixing" ||
      drinkRef.current.totalPct >= GAMEPLAY_CONFIG.maxTotalPct
    ) {
      clearPourTimer();
      return;
    }

    clearPourTimer();
    pourTimerRef.current = setInterval(() => {
      const sessionIsCurrent = dragSessionRef.current === session;
      const currentDrag = dragRef.current;
      const activeId = currentDrag.activeIngredientId;
      if (
        !sessionIsCurrent ||
        !currentDrag.isPouring ||
        !activeId ||
        sceneStateRef.current !== "mixing"
      ) {
        clearPourTimer();
        return;
      }

      updateDrink((current) => {
        const next = incrementIngredient(current, activeId, GAMEPLAY_CONFIG.pourStepPct);
        if (next.totalPct >= GAMEPLAY_CONFIG.maxTotalPct) {
          clearPourTimer();
          setDrag((value) => {
            const stopped = { ...value, isPouring: false };
            dragRef.current = stopped;
            return stopped;
          });
        }
        return next;
      });
    }, GAMEPLAY_CONFIG.pourIntervalMs);

    return clearPourTimer;
  }, [clearPourTimer, drag.activeIngredientId, drag.isPouring, sceneState, updateDrink]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      setDragOffset({
        x: event.clientX - session.startX,
        y: event.clientY - session.startY,
      });

      const rect = pourZoneRef.current?.getBoundingClientRect();
      const bottle = session.bottleRect;
      const offsetX = event.clientX - session.startX;
      const offsetY = event.clientY - session.startY;
      const bottleLeft = bottle.left + offsetX;
      const bottleRight = bottle.right + offsetX;
      const bottleTop = bottle.top + offsetY;
      const bottleBottom = bottle.bottom + offsetY;
      const isInside = Boolean(
        rect &&
        bottleRight >= rect.left &&
        bottleLeft <= rect.right &&
        bottleBottom >= rect.top &&
        bottleTop <= rect.bottom,
      );
      const canPour = isInside && drinkRef.current.totalPct < GAMEPLAY_CONFIG.maxTotalPct && sceneStateRef.current === "mixing";

      if (!canPour) clearPourTimer();
      setDrag((current) => {
        const next = {
          ...current,
          isInsidePourZone: isInside,
          isPouring: canPour,
        };
        dragRef.current = next;
        return next;
      });
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (dragSessionRef.current?.pointerId === event.pointerId) finishDrag();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [clearPourTimer, finishDrag]);

  useEffect(() => {
    const cancelActiveInteraction = () => {
      if (dragSessionRef.current) finishDrag();
    };
    window.addEventListener("blur", cancelActiveInteraction);
    document.addEventListener("visibilitychange", cancelActiveInteraction);
    return () => {
      window.removeEventListener("blur", cancelActiveInteraction);
      document.removeEventListener("visibilitychange", cancelActiveInteraction);
      clearPourTimer();
      if (serveTimerRef.current) clearTimeout(serveTimerRef.current);
      serveCancellationRef.current?.(new Error("Serve was cancelled because the game closed"));
      serveCancellationRef.current = null;
      storyAbortRef.current?.abort();
      storyAbortRef.current = null;
    };
  }, [clearPourTimer, finishDrag]);

  const handleBottlePointerDown = useCallback((
    ingredient: Ingredient,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (
      dragSessionRef.current ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      sceneStateRef.current !== "mixing" ||
      drinkRef.current.totalPct >= GAMEPLAY_CONFIG.maxTotalPct
    ) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bottleRect = event.currentTarget.getBoundingClientRect();
    dragSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      bottleRect: {
        left: bottleRect.left,
        right: bottleRect.right,
        top: bottleRect.top,
        bottom: bottleRect.bottom,
      },
    };
    const nextDrag: DragState = {
      activeIngredientId: ingredient.id,
      isDragging: true,
      isInsidePourZone: false,
      isPouring: false,
    };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handlePointerCaptureLost = useCallback(() => {
    if (dragSessionRef.current) finishDrag();
  }, [finishDrag]);

  const handleKeyboardPour = useCallback((ingredient: Ingredient) => {
    if (sceneStateRef.current !== "mixing") return;
    updateDrink((current) => incrementIngredient(current, ingredient.id, GAMEPLAY_CONFIG.pourStepPct));
  }, [updateDrink]);

  const requestDrinkStory = useCallback(async (finalDrink: DrinkState, finalGlassType: GlassType) => {
    storyAbortRef.current?.abort();
    const controller = new AbortController();
    const requestId = storyRequestIdRef.current + 1;
    storyRequestIdRef.current = requestId;
    storyAbortRef.current = controller;
    setDrinkStory(null);
    setDrinkStoryStatus("loading");

    try {
      const story = await generateDrinkStory(finalDrink, finalGlassType, controller.signal);
      if (storyRequestIdRef.current !== requestId) return;
      setDrinkStory(story);
      setDrinkStoryStatus("success");
    } catch {
      if (controller.signal.aborted || storyRequestIdRef.current !== requestId) return;
      setDrinkStory(null);
      setDrinkStoryStatus("error");
    } finally {
      if (storyRequestIdRef.current === requestId) storyAbortRef.current = null;
    }
  }, []);

  const beginServe = useCallback(async () => {
    if (sceneStateRef.current !== "mixing" || drinkRef.current.totalPct <= 0) return false;

    const finalDrink = structuredClone(drinkRef.current);
    finishDrag();
    sceneStateRef.current = "serving";
    setSceneState("serving");
    void requestDrinkStory(finalDrink, glassType);

    await new Promise<void>((resolve, reject) => {
      serveCancellationRef.current = reject;
      serveTimerRef.current = setTimeout(() => {
        serveTimerRef.current = null;
        serveCancellationRef.current = null;
        sceneStateRef.current = "result";
        setSceneState("result");
        resolve();
      }, GAMEPLAY_CONFIG.serveDurationMs);
    });

    return true;
  }, [finishDrag, glassType, requestDrinkStory]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();
    const register = (tool: WebMcpTool) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
      } catch {
        // Unsupported or partial browser implementations must not affect gameplay.
      }
    };

    register({
      name: "read_drink_state",
      title: "Read drink state",
      description: "Read the current recipe, total percentage, flavor profile, and liquid state without changing the game.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        return { ...structuredClone(drinkRef.current), glassType };
      },
    });

    register({
      name: "set_drink_recipe",
      title: "Set drink recipe",
      description: "Set the complete visible drink recipe using the same mix engine as bottle pouring. Percentages are integers and capped at 100 total.",
      inputSchema: {
        type: "object",
        properties: {
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ingredientId: { type: "string", enum: [...INGREDIENTS_BY_ID.keys()] },
                amountPct: { type: "integer", minimum: 0, maximum: GAMEPLAY_CONFIG.maxTotalPct },
              },
              required: ["ingredientId", "amountPct"],
              additionalProperties: false,
            },
          },
        },
        required: ["ingredients"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (sceneStateRef.current !== "mixing") {
          throw new Error("The recipe can only be changed while mixing");
        }
        const value = input as { ingredients?: Array<{ ingredientId?: unknown; amountPct?: unknown }> };
        if (!Array.isArray(value?.ingredients)) throw new Error("ingredients must be an array");

        const recipe: DrinkIngredient[] = value.ingredients.map((item) => {
          if (
            typeof item.ingredientId !== "string" ||
            !INGREDIENTS_BY_ID.has(item.ingredientId as IngredientId) ||
            typeof item.amountPct !== "number" ||
            !Number.isInteger(item.amountPct)
          ) {
            throw new Error("Each ingredient requires a valid ingredientId and integer amountPct");
          }
          return { ingredientId: item.ingredientId as IngredientId, amountPct: item.amountPct };
        });

        finishDrag();
        const next = setRecipe(recipe);
        drinkRef.current = next;
        sceneStateRef.current = "mixing";
        setDrink(next);
        setSceneState("mixing");
        return { totalPct: next.totalPct, ingredients: next.ingredients };
      },
    });

    register({
      name: "serve_drink",
      title: "Serve drink",
      description: "Serve the current non-empty drink and wait until its visible result card finishes appearing.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute() {
        const served = await beginServe();
        if (!served) throw new Error("A non-empty drink in mixing state is required");
        return { status: "served", totalPct: drinkRef.current.totalPct };
      },
    });

    return () => lifecycle.abort();
  }, [beginServe, finishDrag, glassType]);

  const statusLabel = sceneState === "mixing"
    ? drag.isPouring ? "POURING" : "MIXING"
    : sceneState === "serving" ? "ANALYZING" : "SERVED";
  const statusClass = drag.isPouring ? "is-live" : sceneState !== "mixing" ? "is-served" : "";
  const canInteract = sceneState === "mixing" && drink.totalPct < GAMEPLAY_CONFIG.maxTotalPct;
  const ingredientCount = useMemo(() => drink.ingredients.length, [drink.ingredients]);

  const resetDrink = useCallback(() => {
    finishDrag();
    storyAbortRef.current?.abort();
    storyAbortRef.current = null;
    storyRequestIdRef.current += 1;
    if (serveTimerRef.current) {
      clearTimeout(serveTimerRef.current);
      serveTimerRef.current = null;
    }
    const next = createDrinkState();
    drinkRef.current = next;
    sceneStateRef.current = "mixing";
    setDrink(next);
    setSceneState("mixing");
    setDrinkStory(null);
    setDrinkStoryStatus("idle");
  }, [finishDrag]);

  const retryDrinkStory = useCallback(() => {
    if (sceneStateRef.current !== "result" || drinkRef.current.totalPct <= 0) return;
    void requestDrinkStory(structuredClone(drinkRef.current), glassType);
  }, [glassType, requestDrinkStory]);

  return (
    <MotionConfig reducedMotion="user">
    <main className="game-shell">
      <section
        className="game-frame"
        aria-label="赛博外星调酒游戏画布"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        onPointerMove={(event) => {
          if (event.pointerType === "touch") return;
          const rect = event.currentTarget.getBoundingClientRect();
          setParallax({
            x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
            y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
          });
        }}
        onPointerLeave={() => setParallax({ x: 0, y: 0 })}
      >
        <div className="scanlines" aria-hidden="true" />

        <header className="game-header">
          <div>
            <p className="eyebrow">XENO MIXOLOGY UNIT</p>
            <h1>BAR // 17</h1>
          </div>
          <output className={`system-state ${statusClass}`} aria-live="off">
            <span aria-hidden="true" />
            {statusLabel}
            <b>{drink.totalPct}%</b>
          </output>
        </header>

        <BarScene
          ref={pourZoneRef}
          drag={drag}
          drink={drink}
          parallax={parallax}
          sceneState={sceneState}
          glassType={glassType}
          canInteract={canInteract}
          dragOffset={dragOffset}
          onBottlePointerDown={handleBottlePointerDown}
          onPointerCaptureLost={handlePointerCaptureLost}
          onKeyboardPour={handleKeyboardPour}
        />

        <section className={`control-deck ${sceneState !== "mixing" ? "is-locked" : ""}`} aria-label="调酒控制区域">
          <div className="deck-heading">
            <span>GLASSWARE SELECT</span>
            <b>{GLASS_TYPES_BY_ID.get(glassType)?.labelZh}</b>
          </div>
          <GlassSelector selected={glassType} disabled={sceneState !== "mixing"} onSelect={setGlassType} />

          <div className="serve-row">
            <p>BOTTLES ON RACK · {ingredientCount}/{INGREDIENTS.length} USED</p>
            <ServeControl
              disabled={drink.totalPct <= 0 || sceneState !== "mixing"}
              totalPct={drink.totalPct}
              onServe={() => void beginServe()}
            />
          </div>
        </section>

        <DrinkCard
          drink={drink}
          glassType={glassType}
          sceneState={sceneState}
          story={drinkStory}
          storyStatus={drinkStoryStatus}
          onRetryStory={retryDrinkStory}
          onReset={resetDrink}
        />
      </section>
    </main>
    </MotionConfig>
  );
}
