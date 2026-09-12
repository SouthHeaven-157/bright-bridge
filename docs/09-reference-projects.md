# Reference Projects

这些项目仅作为可选技术参考，不是强制架构、实现模板或 Source of Truth。只有遇到对应技术问题时才查阅，不为了模仿而增加依赖、复杂度或无关功能。

## 可选参考

### Velvet Pour

- 地址：https://github.com/Itssanthoshhere/Velvet-Pour
- 可参考：酒类氛围、动画节奏、Parallax、全屏场景。
- 不参考：滚动驱动页面、大量滚动动画、整套网站结构。

### Kinetic

- 地址：https://github.com/Sammii-HK/kinetic
- 可参考：Framer Motion Drag、Spring、Gesture、Card reveal、回弹与回位。
- 原则：只参考当前交互需要的具体实现，不复制 Demo 架构。

### Interactive SVG React

- 地址：https://github.com/matiasbenedetto/Interactive-SVG-React
- 可参考：SVG 与 React state 联动、动态 shape、Drag、`clipPath`。
- 原则：借鉴状态驱动思路，不复制其几何绘图逻辑或组件结构。

### Bartender / Startender

- 地址：https://github.com/olga-urentseva/bartender
- 地址：https://github.com/DH2643-Group10/startender
- 可参考：Ingredient、Cocktail、Recipe 类型和 TypeScript 数据组织。
- 不参考：登录、数据库、收藏、搜索、评论、用户系统和传统 Web App UI。

## 使用规则

- 当前项目 `docs/` 和用户最新确认的需求优先于参考项目。
- 参考项目与当前规范冲突时，以当前规范为准。
- 如果有更简单、稳定、现代且满足需求的实现，应采用更合适的方案。
- 未出现具体技术阻塞时，不主动拉取或复制参考仓库。
