"use client";

import { forwardRef, useState } from "react";
import { VISUAL_ASSETS } from "../lib/visualAssets";
import type { DragState, DrinkState, SceneState } from "../types/drink";
import { FlavorProfile } from "./FlavorProfile";
import { OctopusBartender } from "./OctopusBartender";
import { ParallaxLayer } from "./ParallaxLayer";
import { PourZone } from "./PourZone";

type BarSceneProps = {
  drag: DragState;
  drink: DrinkState;
  parallax: { x: number; y: number };
  sceneState: SceneState;
};

export const BarScene = forwardRef<HTMLDivElement, BarSceneProps>(
  function BarScene({ drag, drink, parallax, sceneState }, ref) {
    const [backgroundFailed, setBackgroundFailed] = useState(false);

    return (
      <div
        className={`scene ${backgroundFailed ? "has-fallback-background" : "has-generated-background"} ${sceneState !== "mixing" ? "is-dimmed" : ""}`}
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

        <ParallaxLayer className="scene-layer bartender-layer" depth={6} point={parallax}>
          <OctopusBartender isNearGlass={drag.isInsidePourZone} isPouring={drag.isPouring} />
        </ParallaxLayer>

        <ParallaxLayer className="scene-layer counter-layer" depth={8} point={parallax}>
          <div className="counter" aria-hidden="true"><span /></div>
        </ParallaxLayer>

        <div className="scene-layer glass-layer">
          <PourZone
            ref={ref}
            active={drag.isInsidePourZone}
            isPouring={drag.isPouring}
            liquid={drink.liquid}
            totalPct={drink.totalPct}
            activeIngredientId={drag.activeIngredientId}
          />
          <aside className="scene-flavor" aria-label="酒杯右侧风味表">
            <FlavorProfile profile={drink.flavor} compact />
          </aside>
        </div>

        <ParallaxLayer className="scene-layer foreground-layer" depth={10} point={parallax}>
          <div className="foreground-edge" aria-hidden="true" />
        </ParallaxLayer>
      </div>
    );
  },
);
