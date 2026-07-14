# 周易算 · 易经占卜 Web 应用

一个轻量、响应式（桌面 / 平板 / 手机三端自适应）的「周易算」网页 AI 应用，古风国潮视觉风格。
后端接入 **Agnes AI**，内置「周易占卜师」角色，可依据《周易》为你起卦解疑，给出卦象、卦辞、爻辞与处世指引。

> 这不是一个「Agent Web 应用」模板：去掉了会话/权限/工具调用等繁复框架，只保留纯粹的占卜对话体验。

🌐 **线上地址**：https://env-00jy6kb8yokx-static.normal.cloudstatic.cn/zy/

## 功能特性

- 🔮 **三种起卦**：三枚铜钱法 · 数字起卦（梅花易数）· 时间起卦（梅花易数）
- 🧧 **可视化卦象**：六爻阴阳、变爻（老阳○ / 老阴×）高亮、本卦 → 之卦并排，附「起卦过程」明细
- ⚡ **免打字起卦**：随机起卦 / 问事业 / 问感情 / 问健康 一键成卦；对话中也有快捷起卦条
- 💬 **流式解读**：SSE 实时输出占卜师解卦
- 📱 **三端适配**：同一套响应式布局，PC 宽屏、平板、手机竖屏均好用
- 🎨 **古风国潮**：墨色底 + 金线 + 朱红印，毛笔标题字体

## 技术栈

- **后端**：Node.js + Express + TypeScript（Agnes OpenAI 兼容流式接口）
- **前端**：React 18 + TypeScript + Vite（原生 CSS，无重型 UI 库）
- **起卦引擎**：`server/divination.ts`（六十四卦文王卦序 + 三种算法，结构化输出）
- **数据库**：SQLite（better-sqlite3，消息持久化）

## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 同时启动前端(5173)与后端(3000)
```

浏览器打开 http://localhost:5173

## 项目结构

```
zhouyi-agent/
├── server/
│   ├── index.ts        # Express 服务：/api/chat(SSE)、/api/models、/api/save-env-config 等
│   ├── divination.ts   # 周易起卦引擎（铜钱/数字/时间三种算法 + 卦象→提示词）
│   └── db.ts           # SQLite 操作
├── src/
│   ├── App.tsx         # 前端主组件（消息/会话/加载态）
│   ├── api.ts          # 前端 API 层（SSE 解析）
│   ├── prompt.ts       # 周易占卜师默认系统提示词
│   ├── types.ts        # 类型定义（与起卦引擎对齐）
│   ├── styles.css      # 古风国潮主题 + 响应式
│   └── components/
│       ├── Header.tsx / ChatView.tsx / MessageBubble.tsx
│       ├── HexagramCard.tsx   # 可视化卦象卡片
│       ├── QuickActions.tsx    # 快捷起卦
│       ├── CastModal.tsx       # 数字/时间起卦弹窗
│       ├── SettingsModal.tsx   # Agnes 连接设置
│       └── Composer.tsx
├── data/chat.db        # SQLite 数据库
├── .env                # Agnes API Key 等配置（gitignore）
└── package.json
```

## 配置

后端使用 **Agnes AI**（`https://apihub.agnes-ai.com/v1`）。复制 `.env.example` 为 `.env` 填入 Key：

```bash
cp .env.example .env
# AGNES_API_KEY=sk-xxx
# AGNES_MODEL=agnes-2.0-flash   # 1.5-flash 会拒答占卜，建议用 2.0-flash
```

也可在应用内「设置」页填入（仅当前进程有效，重启需重设）。

### 接口说明

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/check-login` | GET | Agnes Key 配置状态 |
| `/api/models` | GET | 模型列表（自动从 Agnes 拉取） |
| `/api/chat` | POST | 发送消息（SSE：init → hexagram → text → done） |
| `/api/save-env-config` | POST | 运行时设置 API Key / BaseURL / 模型 |

`/api/chat` 请求体支持 `cast` 字段：
```json
{ "message": "我想问事业", "cast": { "method": "coin" } }
{ "cast": { "method": "number", "numbers": [8, 3] } }
{ "cast": { "method": "time", "timestamp": 1700000000000 } }
```
后端会先由 `divination.ts` 起卦，通过 `hexagram` 事件把结构化卦象推给前端绘图，同时把卦象注入 systemPrompt，模型严格据此解卦（不会自行另起一卦）。

## 开发

```bash
npm run dev        # 前后端同时
npm run dev:server # 仅后端（tsx watch）
npm run dev:client # 仅前端（vite）
npm run build      # 生产构建（vite build）
```

## License

MIT
