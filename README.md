<p align="center">
  <img src="logo.png" width="96" alt="智触心桥 Logo" />
</p>

# 智触心桥 SmartBridge

面向智力障碍群体与高龄老人的数字生活仿真训练平台。用户说出想学的事情（如"用手机打电话""ATM 取钱"），AI 自动生成带交互的仿真练习界面，一步步带着练。

## 功能

- **语音输入** — 点一下大按钮开始说话，再点一下停止，听清后自动生成练习
- **拍照识别** — 拍下不会用的东西，AI 照着照片生成练习
- **摄像头扫描** — 打开摄像头看环境，自动识别设备并生成课程
- **AI 课程生成** — 把任何生活技能拆成 3-8 步交互练习，每步画出仿真界面
- **六种手势** — 点按、长按、滑动、拖拽、滑条、输入，贴近真实操作
- **即时反馈** — 做对得星鼓励，做错语音提示，3 次后自动带过
- **磁盘缓存** — 已生成的课程秒级加载，总缓存上限 1GB，按使用频率淘汰
- **双模式** — 老人/数字新手模式（大字慢速）和儿童/学生模式（游戏化）
- **无障碍设计** — WCAG AAA 级对比度（>=7:1），高饱和纯色，大字号

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装

```bash
cd web
npm install
```

### 配置

在 `web/.env` 中配置 LLM 接口：

```
LLM_API_URL=https://your-api-endpoint/v1/chat/completions
LLM_API_KEY=your-api-key
LLM_MODEL=your-model-name
```

### 运行

```bash
# 启动前端开发服务器
npm run dev

# 启动 API 服务（需要单独终端）
npm run server

# 构建生产版本
npm run build
```

开发服务器默认 `http://localhost:5173`，API 默认 `http://localhost:3001`。

局域网手机访问：

```bash
npm run dev -- --host 0.0.0.0
```

## 技术栈

- **前端** — React 19 + TypeScript + Vite
- **后端** — Express 5 + TypeScript (tsx 运行)
- **AI** — 兼容 OpenAI API 的 LLM 服务（视觉模型用于摄像头功能）

## 项目结构

```
SmartBridge/
  web/
    src/
      App.tsx          # 主界面：首页、练习、生成、完成
      App.css          # 全部样式（无障碍高对比设计）
      course.ts        # 课程解析、手势分类
      demoCourses.ts   # 本地离线课程
      Icons.tsx        # SVG 图标组件
    api.ts             # 后端 API：课程生成、视觉识别、缓存
    server.ts          # Express 服务入口
    .env               # LLM 配置（不提交）
    .cache/courses/    # 课程缓存目录（不提交）
```

## 设计原则

- **拟物但不过时** — 厚边框 + 硬投影 + 内高光，像真实可按下的机器按键
- **一屏一焦点** — 首页不滚动，一个大按钮对应一个动作
- **错一次再提示** — 首次不显示高亮框，给用户自主探索的空间
- **完整设备** — 手机课程必须画完整外形（外框+状态栏+底部指示器），不只画屏幕内容

---

方括号千抹两份米饭队 制作
