"use client";

import { forwardRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { GlassType } from "../lib/glassTypes";
import { getDominantFlavorKey } from "../lib/ingredients";
import { VISUAL_ASSETS } from "../lib/visualAssets";
import type { DragState, DrinkState, SceneState } from "../types/drink";
import type { Ingredient } from "../types/ingredient";
import { FlavorProfile } from "./FlavorProfile";
import { IngredientShelf } from "./IngredientShelf";
import { OctopusBartender } from "./OctopusBartender";
import { ParallaxLayer } from "./ParallaxLayer";
import { PourZone } from "./PourZone";

type BarSceneProps = {
  drag: DragState;
  drink: DrinkState;
  parallax: { x: number; y: number };
  sceneState: SceneState;
  glassType: GlassType;
  canInteract: boolean;
  dragOffset: { x: number; y: number };
  onBottlePointerDown: (ingredient: Ingredient, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCaptureLost: () => void;
  onKeyboardPour: (ingredient: Ingredient) => void;
};

export const BarScene = forwardRef<HTMLDivElement, BarSceneProps>(
  function BarScene({
    drag,
    drink,
    parallax,
    sceneState,
    glassType,
    canInteract,
    dragOffset,
    onBottlePointerDown,
    onPointerCaptureLost,
    onKeyboardPour,
  }, ref) {
    const [backgroundFailed, setBackgroundFailed] = useState(false);
    const highlightedFlavor = drag.activeIngredientId ? getDominantFlavorKey(drag.activeIngredientId) : null;

    return (
      <div
        className={`scene ${backgroundFailed ? "has-fallback-background" : "has-generated-background"} ${sceneState !== "mixing" ? "is-dimmed" : ""} ${drag.isDragging ? "has-active-bottle" : ""} ${drag.isPouring ? "is-pour-focus" : ""}`}
        aria-label="赛博外星酒吧"
      >
        <ParallaxLayer className="scene-layer far-background" depth={2} point={parallax}>
          <img
            className="scene-raster scene-raster-background"
            src={VISUAL_ASSETS.sceneBackground}
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.hidden = true;
              setBackgroundFailed(true);
            }}
          />
          <div className="stars" aria-hidden="true" />
          <div className="alien-city" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          <div className="orbital-window" aria-hidden="true"><span /></div>
        </ParallaxLayer>

        <ParallaxLayer className="scene-layer bar-background" depth={4} point={parallax}>
          <div className="back-shelf shelf-left" aria-hidden="true" />
          <div className="back-shelf shelf-right" aria-hidden="true" />
          <div className="holo-sign" aria-hidden="true">Δ-17</div>
        </ParallaxLayer>

        <ParallaxLayer className="scene-layer bottle-rack-layer" depth={5} point={parallax}>
          <IngredientShelf
            variant="scene"
            activeIngredientId={drag.activeIngredientId}
            disabled={!canInteract}
            ingredients={drink.ingredients}
            isPouring={drag.isPouring}
            offset={dragOffset}
            onPointerDown={onBottlePointerDown}
            onPointerCaptureLost={onPointerCaptureLost}
            onKeyboardPour={onKeyboardPour}
          />
        </ParallaxLayer>

        <ParallaxLayer className="scene-layer bartender-layer" depth={6} point={parallax}>
          <OctopusBartender isNearGlass={drag.isInsidePourZone} isPouring={drag.isPouring} />
        </ParallaxLayer>

        <ParallaxLayer className="scene-layer counter-layer" depth={8} point={parallax}>
          <div className="counter" aria-hidden="true"><span /></div>
          <img
            className="scene-raster counter-raster"
            src={VISUAL_ASSETS.counterForeground}
            alt=""
            aria-hidden="true"
            onError={(event) => { event.currentTarget.hidden = true; }}
          />
        </ParallaxLayer>

        <div className="scene-layer glass-layer">
          <PourZone
            ref={ref}
            active={drag.isInsidePourZone}
            isPouring={drag.isPouring}
            liquid={drink.liquid}
            totalPct={drink.totalPct}
            activeIngredientId={drag.activeIngredientId}
            glassType={glassType}
          />
          <aside className="scene-flavor" aria-label="酒杯右侧风味表">
            <FlavorProfile
              profile={drink.flavor}
              mood={drink.mood}
              compact
              active={drag.isPouring}
              highlightKey={drag.isPouring ? highlightedFlavor : null}
            />
          </aside>
        </div>

        <ParallaxLayer className="scene-layer foreground-layer" depth={10} point={parallax}>
          <div className="foreground-edge" aria-hidden="true" />
        </ParallaxLayer>
      </div>
    );
  },
);
