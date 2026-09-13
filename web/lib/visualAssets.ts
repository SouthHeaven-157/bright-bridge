/**
 * Replaceable visual asset registry.
 *
 * Keep paths here so later art swaps never touch interaction or mix logic.
 * Every raster layer sits above an SVG/CSS fallback in its component.
 */
export const VISUAL_ASSETS = {
  sceneBackground: "/assets/user-provided/2026-09-13/bar-background.png",
  counterForeground: "/assets/user-provided/2026-09-13/bar-counter-foreground.png",
  octopusBartender: "/assets/octopus/mechanical-bartender-v2-alpha.png",
  ingredientBottles: {
    gin: "/assets/user-provided/2026-09-13/gin.png",
    rum: "/assets/user-provided/2026-09-13/rum.png",
    vodka: "/assets/user-provided/2026-09-13/vodka.png",
    lemon: "/assets/user-provided/2026-09-13/lemon.png",
    lime: "/assets/user-provided/2026-09-13/lime.png",
    honey: "/assets/user-provided/2026-09-13/honey.png",
    oolong: "/assets/user-provided/2026-09-13/oolong.png",
    soda: "/assets/user-provided/2026-09-13/soda.png",
    campari: "/assets/user-provided/2026-09-13/ingredients-expanded/campari.png",
    "sweet-vermouth": "/assets/user-provided/2026-09-13/ingredients-expanded/sweet-vermouth.png",
    "dry-vermouth": "/assets/user-provided/2026-09-13/ingredients-expanded/dry-vermouth.png",
    "simple-syrup": "/assets/user-provided/2026-09-13/ingredients-expanded/simple-syrup.png",
    tonic: "/assets/user-provided/2026-09-13/ingredients-expanded/tonic.png",
    "ginger-beer": "/assets/user-provided/2026-09-13/ingredients-expanded/ginger-beer.png",
    "ad-milk": "/assets/user-provided/2026-09-13/ingredients-expanded/ad-milk.png",
    "wangzai-milk": "/assets/user-provided/2026-09-13/ingredients-expanded/wangzai-milk.png",
    "soy-milk": "/assets/user-provided/2026-09-13/ingredients-expanded/soy-milk.png",
    "osmanthus-wine": "/assets/user-provided/2026-09-13/ingredients-expanded/osmanthus-wine.png",
    umeshu: "/assets/user-provided/2026-09-13/ingredients-expanded/umeshu.png",
  },
  glassware: {
    highball: "/assets/user-provided/2026-09-13/glassware/highball.png",
    tumbler: "/assets/user-provided/2026-09-13/glassware/tumbler.png",
    cocktail: "/assets/user-provided/2026-09-13/glassware/cocktail.png",
    collins: "/assets/user-provided/2026-09-13/glassware/collins.png",
  },
} as const;

export const VISUAL_ASSET_SLOTS = [
  "sceneBackground",
  "counterForeground",
  "octopusBartender",
  "ingredientBottles",
  "glassware",
  "drinkGlass",
  "resultCardBase",
] as const;
