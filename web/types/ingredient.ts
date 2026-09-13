export type IngredientId =
  | "gin"
  | "rum"
  | "vodka"
  | "lemon"
  | "lime"
  | "honey"
  | "oolong"
  | "soda"
  | "campari"
  | "sweet-vermouth"
  | "dry-vermouth"
  | "simple-syrup"
  | "tonic"
  | "ginger-beer"
  | "ad-milk"
  | "wangzai-milk"
  | "soy-milk"
  | "osmanthus-wine"
  | "umeshu";

export type IngredientCategory =
  | "spirit"
  | "citrus"
  | "sweetener"
  | "tea"
  | "mixer"
  | "aperitif"
  | "fortified-wine"
  | "dairy"
  | "plant-milk"
  | "floral-wine"
  | "fruit-wine";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type Ingredient = {
  id: IngredientId;
  name: string;
  nameZh: string;
  category: IngredientCategory;
  abv: number;
  sweetness: number;
  acidity: number;
  bitterness: number;
  body: number;
  freshness: number;
  moodValence: number;
  color: RgbColor;
  opacity: number;
  fizz: number;
  cloudiness: number;
  viscosity: number;
  foam: number;
};
