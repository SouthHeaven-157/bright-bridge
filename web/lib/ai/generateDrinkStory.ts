import type { GlassType } from "../glassTypes";
import type { DrinkState } from "../../types/drink";

export type DrinkStory = {
  name: string;
  tagline: string;
  description: string;
};

export type DrinkStoryStatus = "idle" | "loading" | "success" | "error";

export async function generateDrinkStory(
  drink: DrinkState,
  glassware: GlassType,
  signal?: AbortSignal,
): Promise<DrinkStory> {
  const response = await fetch("/api/generate-drink-story", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ingredients: drink.ingredients,
      flavor: drink.flavor,
      moodValence: drink.mood.valence,
      glassware,
    }),
    signal,
  });

  if (!response.ok) throw new Error(`Drink story request failed with status ${response.status}`);
  return response.json() as Promise<DrinkStory>;
}
