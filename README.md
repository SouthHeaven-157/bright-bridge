# Bright Bridge × 情绪酒馆

单一 Vinext/React 项目，整合生活技能仿真训练与赛博外星调酒互动游戏。

- `/bridge`：智触心桥 BrightBridge
- `/`：情绪酒馆
- BrightBridge 语音包含“情绪酒馆”、“抑郁”、“伤心”、“痛苦”等触发词时，直接站内跳转到酒馆。

## 本地运行

```bash
cd web
npm ci
npm run dev
```

默认访问 `http://localhost:5173`。环境变量参考 `web/.env.example` 和 `web/.dev.vars.example`，不要提交真实密钥。

## 验证

```bash
cd web
npx tsc --noEmit
npm run test:mix
npm run build
```

完整需求、架构与验收规范见 `docs/00-文档索引.md`。
