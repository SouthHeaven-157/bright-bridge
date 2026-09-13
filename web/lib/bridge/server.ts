import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Persona = "child" | "senior";
type ApiResult = { status: number; body: Record<string, unknown> };

type ChatMessage = {
  role: "system" | "user";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
};

const COURSE_SYSTEM = `你是培智学校的生活技能课老师。把用户想学的事情拆成 3 到 8 步交互练习，每步用纯 HTML+CSS 画出完整设备或生活场景。
只输出一个完整 HTML 文档，不要 Markdown、解释或 JSON。
格式：<!doctype html><html><head><title>课程名</title></head><body>
<section class="sb-step" data-guide="操作说明" data-why="原因" data-action="tap" data-target="元素id" data-direction="right"><style>/* CSS */</style><div class="device" style="width:100%;height:100%"><!-- 界面 --></div></section>
</body></html>
动作只能是 tap、long_press、swipe、drag、slider、input。data-target 必须对应真实 id，目标至少 44×44。drag 增加 data-drop；input 使用真实 input/textarea 并增加 data-value。不要输出 script、事件属性或外部链接。画布 360×620，不出现滚动条。`;

const VISION_FRAMES_SYSTEM = `根据同一场景的多张图片，判断练习者最可能想学的 1 到 3 个生活任务。只根据真实出现的人和物判断。只返回严格 JSON：{"practices":[{"task":"最多20字"}]}。无法判断时返回 {"practices":[]}。`;
const VISION_CHECK_SYSTEM = `你是耐心的生活技能助教。根据摄像头图片和当前操作说明判断用户是否跟上。只返回严格 JSON：{"onTrack":true,"hint":"最多30字的中文指导"}。`;

const CACHE_DIR = join(process.cwd(), ".cache", "courses");
const MAX_CACHE_BYTES = 1024 * 1024 * 1024;
type CacheMeta = { hits: number; lastUsed: number; size: number; createdAt: number };

function cacheKey(task: string, persona: string, images: string[] = []) {
  const fingerprint = images.length
    ? images.map((image) => `${image.length}:${image.slice(24, 96)}`).join("|")
    : "";
  return createHash("md5").update(`${persona}:${task}:${fingerprint}`).digest("hex");
}

async function readCacheMeta(base: string): Promise<CacheMeta> {
  try { return JSON.parse(await readFile(`${base}.meta.json`, "utf8")) as CacheMeta; }
  catch { return { hits: 0, lastUsed: 0, size: 0, createdAt: 0 }; }
}

async function cacheGet(task: string, persona: string, images: string[]) {
  const base = join(CACHE_DIR, cacheKey(task, persona, images));
  try {
    const html = await readFile(`${base}.html`, "utf8");
    const meta = await readCacheMeta(base);
    await writeFile(`${base}.meta.json`, JSON.stringify({ ...meta, hits: meta.hits + 1, lastUsed: Date.now() }), "utf8");
    return html;
  } catch { return null; }
}

async function evictCacheIfNeeded() {
  try {
    const files = (await readdir(CACHE_DIR)).filter((file) => file.endsWith(".html"));
    const entries = await Promise.all(files.map(async (file) => {
      const base = join(CACHE_DIR, file.slice(0, -5));
      const meta = await readCacheMeta(base);
      if (!meta.size) { try { meta.size = (await stat(`${base}.html`)).size; } catch { meta.size = 0; } }
      return { base, meta };
    }));
    let total = entries.reduce((sum, entry) => sum + entry.meta.size, 0);
    if (total <= MAX_CACHE_BYTES) return;
    entries.sort((a, b) => a.meta.hits - b.meta.hits || a.meta.lastUsed - b.meta.lastUsed);
    for (const entry of entries) {
      if (total <= MAX_CACHE_BYTES) break;
      await Promise.allSettled([unlink(`${entry.base}.html`), unlink(`${entry.base}.meta.json`)]);
      total -= entry.meta.size;
    }
  } catch { /* cache is optional */ }
}

async function cachePut(task: string, persona: string, images: string[], html: string) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const base = join(CACHE_DIR, cacheKey(task, persona, images));
    await writeFile(`${base}.html`, html, "utf8");
    const now = Date.now();
    await writeFile(`${base}.meta.json`, JSON.stringify({ hits: 1, lastUsed: now, size: Buffer.byteLength(html), createdAt: now }), "utf8");
    await evictCacheIfNeeded();
  } catch { /* cache is optional */ }
}

function modelConfig() {
  const fallbackBase = process.env.AI_API_BASE_URL?.replace(/\/$/, "");
  return {
    url: process.env.BRIDGE_LLM_API_URL || (fallbackBase ? `${fallbackBase}/chat/completions` : ""),
    key: process.env.BRIDGE_LLM_API_KEY || process.env.AI_API_KEY || "",
    model: process.env.BRIDGE_LLM_MODEL || process.env.AI_MODEL || "",
  };
}

export function bridgeHealth(): ApiResult {
  const config = modelConfig();
  return { status: 200, body: { ok: true, model: config.model || "(未配置)", configured: Boolean(config.url && config.key && config.model) } };
}

async function callModel(messages: ChatMessage[], timeoutMs: number, temperature: number) {
  const config = modelConfig();
  if (!config.url || !config.key || !config.model) throw new Error("NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${config.key}` },
      body: JSON.stringify({ model: config.model, temperature, messages }),
    });
    if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("EMPTY_RESPONSE");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function imagesFrom(value: unknown, limit: number) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.startsWith("data:image/")).slice(0, limit)
    : [];
}

function parseJsonLoose(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as Record<string, unknown>; } catch { return null; }
}

function roughCheck(html: string) {
  const trimmed = html.trim();
  if (!/^<!doctype html/i.test(trimmed)) return "开头不是 HTML 文档";
  const sections = trimmed.match(/<section[^>]*class="[^"]*sb-step[^"]*"/g) ?? [];
  if (sections.length < 2 || sections.length > 12) return `步骤数量 ${sections.length} 不正确`;
  if (!/data-target="/.test(trimmed)) return "缺少 data-target";
  if (!/<title>[^<]+<\/title>/.test(trimmed)) return "缺少 title";
  if (/<script\b|\son\w+\s*=/i.test(trimmed)) return "包含不允许的脚本";
  return null;
}

function extractHtml(raw: string) {
  const match = raw.match(/<!doctype html>[\s\S]*<\/html>/i);
  return (match?.[0] ?? raw.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "")).trim();
}

export async function generateBridgeCourse(input: unknown): Promise<ApiResult> {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const persona = body.persona as Persona;
  const images = imagesFrom(body.images, 3);
  if (!task || task.length > 120) return { status: 400, body: { error: "请输入想学的事情。" } };
  if (persona !== "child" && persona !== "senior") return { status: 400, body: { error: "练习模式不正确。" } };
  const cached = await cacheGet(task, persona, images);
  if (cached) {
    const problem = roughCheck(cached);
    if (!problem) return { status: 200, body: { html: cached, source: "cache" } };
    const base = join(CACHE_DIR, cacheKey(task, persona, images));
    await Promise.allSettled([unlink(`${base}.html`), unlink(`${base}.meta.json`)]);
  }
  if (!bridgeHealth().body.configured) return { status: 503, body: { error: "服务端还没有配置模型密钥。", fallback: true } };
  const who = persona === "senior" ? "老年人或数字新手" : "培智学生或儿童";
  const text = `练习者：${who}。他要学的事情：${task}`;
  const content: ChatMessage["content"] = images.length
    ? [...images.map((url) => ({ type: "image_url" as const, image_url: { url } })), { type: "text", text }]
    : text;
  try {
    let html = extractHtml(await callModel([{ role: "system", content: COURSE_SYSTEM }, { role: "user", content }], 180_000, 0.3));
    let problem = roughCheck(html);
    if (problem) {
      html = extractHtml(await callModel([
        { role: "system", content: COURSE_SYSTEM },
        { role: "user", content },
        { role: "user", content: `上次输出未通过检查：${problem}。请只重新输出完整 HTML。` },
      ], 180_000, 0.3));
      problem = roughCheck(html);
    }
    if (problem) return { status: 502, body: { error: `AI 生成的界面未通过检查：${problem}`, fallback: true } };
    await cachePut(task, persona, images, html);
    return { status: 200, body: { html, source: "ai" } };
  } catch (error) {
    const timeout = error instanceof Error && error.name === "AbortError";
    const unconfigured = error instanceof Error && error.message === "NOT_CONFIGURED";
    return { status: unconfigured ? 503 : 502, body: { error: timeout ? "AI 响应超时。" : "AI 暂时不可用。", fallback: true } };
  }
}

export async function analyzeBridgeFrames(input: unknown): Promise<ApiResult> {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const images = imagesFrom(body.images, 6);
  if (!images.length) return { status: 400, body: { error: "没有画面" } };
  if (!bridgeHealth().body.configured) return { status: 503, body: { error: "服务端还没有配置模型密钥" } };
  const who = body.persona === "child" ? "儿童" : "老人";
  try {
    const content: ChatMessage["content"] = [
      { type: "text", text: `练习者：${who}。请综合判断这 ${images.length} 帧画面。` },
      ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];
    const parsed = parseJsonLoose(await callModel([{ role: "system", content: VISION_FRAMES_SYSTEM }, { role: "user", content }], 45_000, 0.2));
    if (!parsed || !Array.isArray(parsed.practices)) return { status: 502, body: { error: "AI 没看明白" } };
    const practices = parsed.practices
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({ task: typeof item.task === "string" ? item.task.slice(0, 60) : "" }))
      .filter((item) => item.task)
      .slice(0, 3);
    return { status: 200, body: { practices } };
  } catch { return { status: 502, body: { error: "识别失败" } }; }
}

export async function checkBridgeFrame(input: unknown): Promise<ApiResult> {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const image = imagesFrom([body.image], 1)[0];
  const guide = typeof body.guide === "string" ? body.guide.trim().slice(0, 200) : "";
  if (!image) return { status: 400, body: { error: "画面格式不对" } };
  if (!guide) return { status: 400, body: { error: "缺少步骤说明" } };
  if (!bridgeHealth().body.configured) return { status: 503, body: { error: "服务端还没有配置模型密钥" } };
  const who = body.persona === "child" ? "儿童" : "老人";
  const content: ChatMessage["content"] = [
    { type: "text", text: `练习者：${who}。当前这一步：${guide}` },
    { type: "image_url", image_url: { url: image } },
  ];
  try {
    const parsed = parseJsonLoose(await callModel([{ role: "system", content: VISION_CHECK_SYSTEM }, { role: "user", content }], 45_000, 0.2));
    if (!parsed) return { status: 502, body: { error: "AI 没看明白" } };
    return { status: 200, body: { onTrack: Boolean(parsed.onTrack), hint: typeof parsed.hint === "string" ? parsed.hint.slice(0, 60) : "" } };
  } catch { return { status: 502, body: { error: "识别失败" } }; }
}
