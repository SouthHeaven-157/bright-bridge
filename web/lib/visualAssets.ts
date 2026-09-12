/**
 * Replaceable visual asset registry.
 *
 * Keep paths here so later art swaps never touch interaction or mix logic.
 * Every raster layer sits above an SVG/CSS fallback in its component.
 */
export const VISUAL_ASSETS = {
  sceneBackground: "/assets/scene/alien-tavern-background-v2.png",
  octopusBartender: "/assets/octopus/mechanical-bartender-v2-alpha.png",
} as const;

export const VISUAL_ASSET_SLOTS = [
  "sceneBackground",
  "octopusBartender",
  "ingredientBottles",
  "drinkGlass",
  "resultCardBase",
] as const;
