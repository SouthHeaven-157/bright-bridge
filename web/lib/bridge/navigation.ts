export const EMOTION_TAVERN_PATH = "/";

export const EMOTION_TAVERN_TRIGGERS = [
  "情绪酒馆",
  "抑郁",
  "伤心",
  "痛苦",
  "难过",
  "悲伤",
  "低落",
  "不开心",
  "烦恼",
  "焦虑",
  "孤独",
  "绝望",
] as const;

export function shouldOpenEmotionTavern(text: string) {
  const normalized = text.replace(/\s+/g, "");
  return EMOTION_TAVERN_TRIGGERS.some((trigger) => normalized.includes(trigger));
}
