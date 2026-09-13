import assert from "node:assert/strict";
import test from "node:test";
import { INGREDIENTS, INGREDIENTS_BY_ID } from "./ingredients";
import {
  createDrinkState,
  incrementIngredient,
  setRecipe,
} from "./mixEngine";

test("empty recipe returns stable safe defaults", () => {
  const drink = createDrinkState();

  assert.equal(drink.totalPct, 0);
  assert.deepEqual(drink.liquid.color, { r: 0, g: 0, b: 0 });
  assert.equal(drink.liquid.level, 0);
  assert.equal(drink.liquid.viscosity, 0);
  assert.equal(drink.liquid.foam, 0);
  assert.equal(drink.mood.valence, 0);
  assert.ok(Object.values(drink.flavor).every(Number.isFinite));
});

test("ingredient catalog contains 19 unique and bounded entries", () => {
  assert.equal(INGREDIENTS.length, 19);
  assert.equal(new Set(INGREDIENTS.map((ingredient) => ingredient.id)).size, INGREDIENTS.length);

  for (const ingredient of INGREDIENTS) {
    const normalized = [
      ingredient.abv,
      ingredient.sweetness,
      ingredient.acidity,
      ingredient.bitterness,
      ingredient.body,
      ingredient.freshness,
      ingredient.opacity,
      ingredient.fizz,
      ingredient.cloudiness,
      ingredient.viscosity,
      ingredient.foam,
    ];
    assert.ok(normalized.every((value) => value >= 0 && value <= 1), `${ingredient.id} has an out-of-range parameter`);
    assert.ok(ingredient.moodValence >= -1 && ingredient.moodValence <= 1, `${ingredient.id} has an out-of-range mood parameter`);
    assert.ok(Object.values(ingredient.color).every((value) => value >= 0 && value <= 255), `${ingredient.id} has an invalid RGB channel`);
  }
});

test("new carbonated and opaque ingredients remain percentage-weighted", () => {
  const drink = setRecipe([
    { ingredientId: "tonic", amountPct: 50 },
    { ingredientId: "ad-milk", amountPct: 50 },
  ]);

  assert.equal(drink.liquid.fizz, 0.46);
  assert.equal(drink.liquid.cloudiness, 0.49);
  assert.equal(drink.flavor.body, 0.44);
  assert.ok(Math.abs(drink.mood.valence - 0.235) < 1e-9);
});

test("single ingredient mirrors its properties", () => {
  const drink = setRecipe([{ ingredientId: "gin", amountPct: 100 }]);
  const gin = INGREDIENTS_BY_ID.get("gin")!;

  assert.equal(drink.totalPct, 100);
  assert.equal(drink.flavor.alcohol, gin.abv);
  assert.equal(drink.flavor.freshness, gin.freshness);
  assert.deepEqual(drink.liquid.color, gin.color);
  assert.equal(drink.liquid.level, 1);
  assert.equal(drink.liquid.viscosity, gin.viscosity);
  assert.equal(drink.mood.valence, gin.moodValence);
});

test("dynamic liquid properties remain percentage-weighted", () => {
  const drink = setRecipe([
    { ingredientId: "honey", amountPct: 25 },
    { ingredientId: "soda", amountPct: 75 },
  ]);

  assert.equal(drink.liquid.viscosity, 0.2775);
  assert.equal(drink.liquid.foam, 0.695);
  assert.equal(drink.liquid.fizz, 0.75);
});

test("mixed recipe uses percentage-weighted values", () => {
  const drink = setRecipe([
    { ingredientId: "gin", amountPct: 25 },
    { ingredientId: "lemon", amountPct: 75 },
  ]);

  assert.equal(drink.totalPct, 100);
  assert.equal(drink.flavor.alcohol, 0.1);
  assert.equal(drink.flavor.acidity, 0.7125);
  assert.ok(Math.abs(drink.mood.valence - 0.235) < 1e-9);
  assert.deepEqual(drink.liquid.color, { r: 240, g: 215, b: 109 });
});

test("increments stay integer and never exceed 100 percent", () => {
  let drink = createDrinkState();
  drink = incrementIngredient(drink, "gin", 35.9);
  drink = incrementIngredient(drink, "soda", 90);
  drink = incrementIngredient(drink, "gin", 10);

  assert.equal(drink.totalPct, 100);
  assert.deepEqual(drink.ingredients, [
    { ingredientId: "gin", amountPct: 35 },
    { ingredientId: "soda", amountPct: 65 },
  ]);
});

test("duplicate recipe entries merge and negative increments remove empty items", () => {
  let drink = setRecipe([
    { ingredientId: "honey", amountPct: 10 },
    { ingredientId: "honey", amountPct: 8 },
  ]);
  assert.deepEqual(drink.ingredients, [{ ingredientId: "honey", amountPct: 18 }]);

  drink = incrementIngredient(drink, "honey", -30);

  assert.deepEqual(drink, createDrinkState());
});
