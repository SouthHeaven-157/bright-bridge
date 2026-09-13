# AI 酒名与 Drink Card 接入规范

## 范围

AI 只在用户点击 Serve 后为冻结的最终饮品生成：

- `name`：2～10 个汉字的情绪化酒名。
- `tagline`：一句克制的短文案。
- `description`：2～3 句以气味、温度、触感、时间、场景或记忆表达的故事。

不使用 Loneliness。当前情绪输入只有 mixEngine 已计算的“忧郁—喜悦”双向值。AI 不参与配方、风味、情绪或动态酒液计算。

## 数据流

```text
Serve
→ 冻结 DrinkState 与杯型
→ 现有 Serve 演出立即开始
→ 并行 POST /api/generate-drink-story
→ Drink Card 按固定时长出现
→ 响应成功后写入 name / tagline / description
```

外部请求不得直接写在 `DrinkCard.tsx`。统一入口：

- 客户端调用：`web/lib/ai/generateDrinkStory.ts`
- 生命周期编排：`web/components/GameViewport.tsx`
- 服务端代理：`web/app/api/generate-drink-story/route.ts`
- 卡片展示：`web/components/DrinkCard.tsx`

## 输入与输出

请求只包含最终配料 ID/整数比例、六维风味、`mood.valence` 和杯型。服务端负责把 ID 转换为中英文名称并构造提示词。

上游必须只返回：

```json
{
  "name": "酒名",
  "tagline": "一句短文案",
  "description": "2～3句描述"
}
```

服务端对字段类型、空值和长度进行校验；不把未经检查的上游对象直接传给页面。

## 配置与安全

`web/.env.local`：

```dotenv
AI_API_BASE_URL=https://api.openai-next.com/v1
AI_API_KEY=
AI_MODEL=gpt-4o-mini
```

- `.env.local` 必须被 Git 忽略；Key 不写进源码、示例文件、文档、日志、截图或客户端 Bundle。
- 服务端代理采用 OpenAI-compatible `/chat/completions`，设置 JSON 输出、20 秒超时和基础请求频率限制。
- 页面只看到项目内 API；上游鉴权和原始错误不得返回浏览器。

## UI 与生命周期

- `loading`：保留完整配方卡，只在标题区显示加载骨架。
- `success`：显示酒名、tagline 和 description。
- `error`：只显示“重新生成”操作，不插入回退酒名或故事。
- 重置、组件卸载或新请求开始时 Abort 前一请求；使用请求 ID 阻止旧响应覆盖当前结果。
- AI 失败不得阻塞 Serve、Drink Card、MIX AGAIN 或配方信息展示。

## 验收

- 自动浏览器回归使用本地 Fetch Mock 验证三段生成内容，避免反复消耗真实额度。
- 真实联调只通过项目 API 路由执行一次，确认配置、模型、中文 JSON 和解析链路可用。
- 非法配料、超 100% 配方、缺失六维风味、越界情绪或非法杯型必须返回 4xx；上游失败返回安全的 5xx。
