import type { IngredientId, RgbColor } from "./ingredient";

export type DrinkIngredient = {
  ingredientId: IngredientId;
  amountPct: number;
};

export type FlavorProfile = {
  sweetness: number;
  acidity: number;
  bitterness: number;
  alcohol: number;
  freshness: number;
  body: number;
};

export type MoodProfile = {
  valence: number;
};

export type LiquidVisualState = {
  level: number;
  color: RgbColor;
  opacity: number;
  fizz: number;
  cloudiness: number;
  viscosity: number;
  foam: number;
};

export type FlavorKey = keyof FlavorProfile;

export type DrinkState = {
  ingredients: DrinkIngredient[];
  totalPct: number;
  flavor: FlavorProfile;
  mood: MoodProfile;
  liquid: LiquidVisualState;
};

export type DragState = {
  activeIngredientId: IngredientId | null;
  isDragging: boolean;
  isInsidePourZone: boolean;
  isPouring: boolean;
};

export type SceneState = "mixing" | "serving" | "result";
