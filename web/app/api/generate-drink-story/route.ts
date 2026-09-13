import { GLASS_TYPES_BY_ID, type GlassType } from "../../../lib/glassTypes";
import { INGREDIENTS_BY_ID } from "../../../lib/ingredients";
import type { DrinkStory } from "../../../lib/ai/generateDrinkStory";
import type { FlavorProfile } from "../../../types/drink";
import type { IngredientId } from "../../../types/ingredient";

type StoryRequest = {
  ingredients?: Array<{ ingredientId?: unknown; amountPct?: unknown }>;
  flavor?: Partial<Record<keyof FlavorProfile, unknown>>;
  moodValence?: unknown;
  glassware?: unknown;
};

const flavorKeys: Array<keyof FlavorProfile> = ["sweetness", "acidity", "bitterness", "alcohol", "freshness", "body"];
const requestsByIp = new Map<string, number[]>();

function isRateLimited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (requestsByIp.get(ip) ?? []).filter((time) => now - time < 60_000);
  recent.push(now);
  requestsByIp.set(ip, recent);
  return recent.length > 6;
}

function parseStory(content: string): DrinkStory {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const value = JSON.parse(normalized) as Partial<DrinkStory>;
  if (typeof value.name !== "string" || typeof value.tagline !== "string" || typeof value.description !== "string") {
    throw new Error("Invalid story object");
  }
  const story = {
    name: value.name.trim().slice(0, 20),
    tagline: value.tagline.trim().slice(0, 80),
    description: value.description.trim().slice(0, 260),
  };
  if (!story.name || !story.tagline || !story.description) throw new Error("Empty story fields");
  return story;
}

export async function POST(request: Request) {
  if (isRateLimited(request)) return Response.json({ error: "Too many requests" }, { status: 429 });

  const apiKey = process.env.AI_API_KEY;
  const apiBase = (process.env.AI_API_BASE_URL ?? "https://api.openai-next.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  if (!apiKey) return Response.json({ error: "AI service is not configured" }, { status: 503 });

  try {
    const input = await request.json() as StoryRequest;
    if (!Array.isArray(input.ingredients) || input.ingredients.length < 1 || input.ingredients.length > 19) {
      return Response.json({ error: "Invalid ingredients" }, { status: 400 });
    }

    let totalPct = 0;
    const ingredients = input.ingredients.map((item) => {
      if (
        typeof item.ingredientId !== "string" ||
        !INGREDIENTS_BY_ID.has(item.ingredientId as IngredientId) ||
        typeof item.amountPct !== "number" ||
        !Number.isInteger(item.amountPct) ||
        item.amountPct < 1 ||
        item.amountPct > 100
      ) throw new Error("Invalid ingredient item");
      totalPct += item.amountPct;
      const ingredient = INGREDIENTS_BY_ID.get(item.ingredientId as IngredientId)!;
      return `${ingredient.nameZh} / ${ingredient.name}: ${item.amountPct}%`;
    });
    if (totalPct > 100) return Response.json({ error: "Recipe exceeds 100%" }, { status: 400 });
    if (!input.flavor || flavorKeys.some((key) => typeof input.flavor?.[key] !== "number")) {
      return Response.json({ error: "Invalid flavor profile" }, { status: 400 });
    }
    if (typeof input.moodValence !== "number" || input.moodValence < -1 || input.moodValence > 1) {
      return Response.json({ error: "Invalid mood profile" }, { status: 400 });
    }
    if (typeof input.glassware !== "string" || !GLASS_TYPES_BY_ID.has(input.glassware as GlassType)) {
      return Response.json({ error: "Invalid glassware" }, { status: 400 });
    }

    const glass = GLASS_TYPES_BY_ID.get(input.glassware as GlassType)!;
    const moodPosition = Math.round((input.moodValence + 1) * 50);
    const userPrompt = [
      "请根据下面这杯酒，为饮用者生成一个情绪化的中文酒名和一小段故事。",
      "不要解释配方，不要写商品介绍，不要提及 AI。相同配方的情绪轴不同，应呈现明显不同的气质。",
      `配料：\n${ingredients.join("\n")}`,
      `风味：甜度 ${input.flavor.sweetness}，酸度 ${input.flavor.acidity}，苦度 ${input.flavor.bitterness}，酒精感 ${input.flavor.alcohol}，清新度 ${input.flavor.freshness}，酒体 ${input.flavor.body}`,
      `情绪轴：忧郁 0 ↔ 喜悦 100，当前 ${moodPosition}`,
      `杯型：${glass.labelZh} / ${glass.label}`,
      "严格只返回 JSON：{\"name\":\"2到10个汉字\",\"tagline\":\"一句很短的文案\",\"description\":\"2到3句描述\"}",
    ].join("\n\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const upstream = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.9,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "你是一位擅长用酒讲述情绪故事的专业调酒师和中文文学编辑。" },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });
      if (!upstream.ok) return Response.json({ error: "AI service request failed" }, { status: 502 });
      const payload = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("AI returned no content");
      return Response.json(parseStory(content));
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return Response.json({ error: "Unable to generate drink story" }, { status: 502 });
  }
}
