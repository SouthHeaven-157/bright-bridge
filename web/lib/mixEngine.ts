import { INGREDIENTS_BY_ID } from "./ingredients";
import { GAMEPLAY_CONFIG } from "./gameConfig";
import type { DrinkIngredient, DrinkState } from "../types/drink";
import type { IngredientId } from "../types/ingredient";

const EMPTY_DRINK: DrinkState = {
  ingredients: [],
  totalPct: 0,
  flavor: {
    sweetness: 0,
    acidity: 0,
    bitterness: 0,
    alcohol: 0,
    freshness: 0,
    body: 0,
  },
  mood: {
    valence: 0,
  },
  liquid: {
    level: 0,
    color: { r: 0, g: 0, b: 0 },
    opacity: 0,
    fizz: 0,
    cloudiness: 0,
    viscosity: 0,
    foam: 0,
  },
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const roundChannel = (value: number) => Math.round(clamp(value, 0, 255));

function normalizeRecipe(recipe: readonly DrinkIngredient[]) {
  const totals = new Map<IngredientId, number>();
  let remaining = GAMEPLAY_CONFIG.maxTotalPct;

  for (const item of recipe) {
    if (!INGREDIENTS_BY_ID.has(item.ingredientId) || remaining <= 0) continue;

    const amount = Math.min(remaining, Math.max(0, Math.trunc(item.amountPct)));
    if (amount === 0) continue;

    const current = totals.get(item.ingredientId) ?? 0;
    const accepted = Math.min(amount, GAMEPLAY_CONFIG.maxTotalPct - current, remaining);
    totals.set(item.ingredientId, current + accepted);
    remaining -= accepted;
  }

  return [...totals.entries()].map(([ingredientId, amountPct]) => ({
    ingredientId,
    amountPct,
  }));
}

export function mixDrink(recipe: readonly DrinkIngredient[]): DrinkState {
  const ingredients = normalizeRecipe(recipe);
  const totalPct = ingredients.reduce((sum, item) => sum + item.amountPct, 0);

  if (totalPct === 0) {
    return structuredClone(EMPTY_DRINK);
  }

  const weighted = (property: "sweetness" | "acidity" | "bitterness" | "abv" | "freshness" | "body" | "moodValence" | "opacity" | "fizz" | "cloudiness" | "viscosity" | "foam") =>
    ingredients.reduce((sum, item) => {
      const ingredient = INGREDIENTS_BY_ID.get(item.ingredientId)!;
      return sum + ingredient[property] * item.amountPct;
    }, 0) / totalPct;

  const color = ingredients.reduce(
    (sum, item) => {
      const ingredient = INGREDIENTS_BY_ID.get(item.ingredientId)!;
      return {
        r: sum.r + ingredient.color.r * item.amountPct,
        g: sum.g + ingredient.color.g * item.amountPct,
        b: sum.b + ingredient.color.b * item.amountPct,
      };
    },
    { r: 0, g: 0, b: 0 },
  );

  return {
    ingredients,
    totalPct,
    flavor: {
      sweetness: clamp(weighted("sweetness")),
      acidity: clamp(weighted("acidity")),
      bitterness: clamp(weighted("bitterness")),
      alcohol: clamp(weighted("abv")),
      freshness: clamp(weighted("freshness")),
      body: clamp(weighted("body")),
    },
    mood: {
      valence: clamp(weighted("moodValence"), -1, 1),
    },
    liquid: {
      level: totalPct / GAMEPLAY_CONFIG.maxTotalPct,
      color: {
        r: roundChannel(color.r / totalPct),
        g: roundChannel(color.g / totalPct),
        b: roundChannel(color.b / totalPct),
      },
      opacity: clamp(weighted("opacity")),
      fizz: clamp(weighted("fizz")),
      cloudiness: clamp(weighted("cloudiness")),
      viscosity: clamp(weighted("viscosity")),
      foam: clamp(weighted("foam")),
    },
  };
}

export function createDrinkState(recipe: readonly DrinkIngredient[] = []) {
  return mixDrink(recipe);
}

export function setRecipe(recipe: readonly DrinkIngredient[]) {
  return mixDrink(recipe);
}

export function incrementIngredient(
  current: Readonly<DrinkState>,
  ingredientId: IngredientId,
  deltaPct: number,
) {
  const delta = Math.trunc(deltaPct);
  if (delta === 0 || !INGREDIENTS_BY_ID.has(ingredientId)) return mixDrink(current.ingredients);

  const recipe = current.ingredients.map((item) => ({ ...item }));
  const existing = recipe.find((item) => item.ingredientId === ingredientId);

  if (delta > 0) {
    const accepted = Math.min(delta, Math.max(0, GAMEPLAY_CONFIG.maxTotalPct - current.totalPct));
    if (accepted === 0) return mixDrink(recipe);

    if (existing) {
      existing.amountPct += accepted;
    } else {
      recipe.push({ ingredientId, amountPct: accepted });
    }
  } else if (existing) {
    existing.amountPct = Math.max(0, existing.amountPct + delta);
  }

  return mixDrink(recipe);
}
