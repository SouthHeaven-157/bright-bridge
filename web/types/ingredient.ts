export type IngredientId =
  | "gin"
  | "rum"
  | "vodka"
  | "lemon"
  | "lime"
  | "honey"
  | "oolong"
  | "soda";

export type IngredientCategory =
  | "spirit"
  | "citrus"
  | "sweetener"
  | "tea"
  | "mixer";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type Ingredient = {
  id: IngredientId;
  name: string;
  category: IngredientCategory;
  abv: number;
  sweetness: number;
  acidity: number;
  bitterness: number;
  body: number;
  freshness: number;
  color: RgbColor;
  opacity: number;
  fizz: number;
  cloudiness: number;
};
