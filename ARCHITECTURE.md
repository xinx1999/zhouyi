# 周易算 · 项目技术文档

> 一个古风墨金风格的《周易》占卜 Web 应用：前端 React + Vite + TypeScript + Tailwind，后端 Express + SQLite，接 Agnes AI（OpenAI 兼容）做流式解卦。
> 本文档说明技术栈、每个文件的具体作用，以及数据库存储字段的逻辑。

---

## 一、技术栈

### 前端
| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | React 18.2 + TypeScript 5.3 | 函数组件 + Hooks |
| 构建 | Vite 5 | `@vitejs/plugin-react` 插件 |
| 样式 | Tailwind CSS 3（`tailwind.config.js` 自定义墨金/朱红古风调色板）+ 少量 `styles.css` 关键帧动画 | 显式 class 规避 dev 缓存 |
| 图标 | lucide-react 0.563 | |
| 流式通信 | 原生 `fetch` + `ReadableStream` 读取 SSE（`text/event-stream`） | 不依赖额外 SSE 库 |

### 后端
| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 服务 | Express 4.18（`server/index.ts`，端口 3000） | |
| 运行 | `tsx` 直接跑 TS（`npm run server` / `dev:server`） | 勿用 `node` |
| 数据库 | better-sqlite3 12（SQLite 文件 `data/chat.db`，WAL 模式） | 同步 API，简单可靠 |
| 配置 | dotenv + 进程内环境变量 | `AGNES_API_KEY`、`AGNES_BASE_URL`、`AGNES_MODEL`、`PORT` |
| 大模型 | Agnes AI（OpenAI 兼容 `/v1/chat/completions`，stream=true） | 解卦文本由模型生成 |

### 数据库
- 引擎：**SQLite**（单文件 `data/chat.db`），启用 WAL 提升并发。
- 两张表：`sessions`（会话/记录）、`messages`（消息）。二者通过 `session_id` 外键级联删除。

### 常用脚本（`package.json`）
```bash
npm run dev          # 同时起前端(vite :5173) 与 后端(tsx watch :3000)
npm run dev:server   # 仅后端（watch 模式）
npm run dev:client   # 仅前端
npm run build        # vite 生产构建
npm run server       # 单次启动后端（tsx server/index.ts）
```

---

## 二、目录结构与各文件作用

```
zhouyi-agent/
├── index.html                # SPA 入口 HTML
├── vite.config.ts            # Vite 配置（React 插件、端口等）
├── tailwind.config.js        # Tailwind 主题：墨金/朱红/panel 等古风色板
├── postcss.config.js
├── tsconfig*.json
├── .env / .env.example       # Agnes API Key / BaseURL / Model
├── README.md / DEVELOPMENT.md
├── public/                   # 静态资源（如 qian-barrel.png 签筒图）
├── data/chat.db              # SQLite 数据库（运行时生成）
├── src/                      # 前端源码
└── server/                   # 后端源码
```

### 前端 `src/`
| 文件 | 具体作用 |
| --- | --- |
| `main.tsx` | React 入口，挂载 `<App/>`，引入全局 `styles.css`。 |
| `App.tsx` | **应用状态中枢**。管理 `messages / sessionId / isLoading / view / daily / history` 等；核心函数 `doSend`（发送+流式渲染+`AbortController` 中止旧流+续答 `resume`）；`openHistory`（打开历史并**自动续答未完成记录**，含 `resumeLockRef` 防重锁，锁须在 `await loadSession` **之前**上锁）；`guardIncomplete`（起新卦前检测未完成并记录，弹「返回上一卦」确认）；首页 / 对话视图切换；挂载各弹窗（CastModal / SettingsModal / LingQianDetailModal / ConfirmModal）。 |
| `api.ts` | 前端 API 层。封装 `fetchModels / fetchDaily / fetchHistory / loadSession / deleteHistory / recordLingQian / saveEnvConfig`；`sendChat` 用 `fetch` 读取 SSE，解析 `init/hexagram/text/done/error` 事件，支持 `AbortSignal`（`AbortError` 静默忽略，避免旧流报错）。 |
| `types.ts` | 全局类型。含 `CastMethod`（起卦法，`person` 为本项目新增）、`CastRequest`（各起卦参数 + `name/birthday/gender`）、`HexLine/TrigramInfo/HexagramInfo/NajiaData/YarrowYao/CastResult`、`ChatMessage`、`DailyData`、`HistoryItem` 等。 |
| `content.ts` | 静态内容数据。`HOT_QUESTIONS`（热门问题，点击即起卦）、`LEARNING`（易学入门推荐）、`LINGQIAN`（签诗库）、`dailyLingQian()`（按日种子的今日签）、`LINGQIAN_LEVEL_COLOR`（签等级配色）。 |
| `prompt.ts` | `DEFAULT_SYSTEM_PROMPT`：设定「周易占卜师」角色与解卦结构，强约束模型**严格依据系统给出的卦象解读、不得拒答、结尾必须产出「## 总结」白话段**。 |
| `castCategories.ts` | 起卦法元数据。`CAST_CATEGORIES`（梅花易数 / 铜钱法 / 揲蓍法三大类及其方法）、`CAST_META`（方法→标题/说明速查表）、`CastMethodKey` 类型。 |
| `components/Header.tsx` | 顶部栏：Logo「易」印、标题「周易算」、首页 / 新占 / 设置入口。 |
| `components/HomeView.tsx` | 首页：今日一卦（MiniGua）、今日一签、热门问题、**常用起卦**网格（随机 / 姓名生辰 / 铜钱）、进阶起卦法（展开 `CAST_CATEGORIES`）、最近使用历史。承接各类 `onXxx` 回调。 |
| `components/ChatView.tsx` | 对话视图。空态展示起卦引导 + `QuickActions`；有消息则逐条渲染 `MessageBubble`。 |
| `components/QuickActions.tsx` | 对话空态的一键占卜（随机 / 问事业 / 感情 / 健康）与自定义起卦网格（九法入口）。 |
| `components/CastModal.tsx` | 起卦弹窗。按所选起卦法渲染不同输入（数字 / 时间 / 汉字 / 方位 / 声音 / 报数 / **姓名生辰**等），校验后 `onSubmit` 抛出 `CastRequest`。 |
| `components/Composer.tsx` | 底部输入框。文本输入 + 起卦按钮（演卦中显示 `Loading`）。 |
| `components/ConfirmModal.tsx` | 通用确认弹窗（用于「上一卦尚未完成」提醒等），支持 Esc 关闭。 |
| `components/MessageBubble.tsx` | 单条消息气泡。用户右对齐；助手左对齐，内含 `HexagramCard` 与「总结」高亮卡（从正文抽取 `## 总结`）。 |
| `components/HexagramCard.tsx` | 卦象可视化卡。本卦 / 之卦六爻、`methodName` 中文名、起卦过程、揲蓍分步（`YarrowSteps`）、纳甲排盘（`NajiaPanel`）。 |
| `components/NajiaPanel.tsx` | 纳甲六爻排盘面板：宫属、世应、六爻干支 / 六亲 / 六神。 |
| `components/YarrowSteps.tsx` | 揲蓍法十八变分步明细（可展开）。 |
| `components/MiniGua.tsx` | 轻量 SVG 卦象（今日一卦卡片用），可选爻位标注。 |
| `components/LingQian.tsx` | 灵签求签：签筒图片 + 摇签动画 + 抽签（随机 / 今日），结果由 HomeView 以弹窗呈现，并 `onRecord` 写入历史。 |
| `components/LingQianDetail.tsx` | 签文详情纯展示（签号 / 等级朱印 / 签诗 / 解曰 / 分项）。 |
| `components/LingQianDetailModal.tsx` | 从「记录」点开求签的弹窗容器。 |
| `components/SettingsModal.tsx` | 设置弹窗：配置 Agnes `apiKey/baseUrl/model`（仅当前进程有效）。 |
| `components/Loading.tsx` | 加载指示器（`block` 居中 / `inline` 行内）。 |

### 后端 `server/`
| 文件 | 具体作用 |
| --- | --- |
| `index.ts` | Express 入口。路由：`/api/health`、`/api/check-login`、`/api/save-env-config`、`/api/models`、`/api/daily`、`/api/history`、`/api/lingqian`、`/api/sessions`（CRUD）、`/api/chat`（SSE 流式占卜）。`/api/chat` 处理 `cast` 起卦、`resume` 续答幂等（已完成则跳过生成）、调用 Agnes 流式返回。 |
| `db.ts` | SQLite 访问层。建表 `sessions/messages`（WAL）；会话 / 消息 CRUD、`setSessionMeta`、`recordLingQian`、`isSessionIncomplete`（未完成判定）、`getRecentSessions`；含 `meta` 列迁移。 |
| `divination.ts` | **周易起卦引擎**。`castCoin/castNumber/castTime/castChar/castDirection/castSound/castReport/castYarrow/castPerson` 九种起卦法；`buildHexagram` 由六爻构造别卦；`trigramByMod8` 先天八卦取数；`najiaForHex` 京房纳甲排盘；`getDailyData` 每日卦 / 宜忌 / 每日一句；`hexagramToPrompt` 生成注入 `systemPrompt` 的卦象文本。 |

---

## 三、数据库存储字段逻辑

数据库文件：`data/chat.db`（SQLite，WAL）。两个核心表 + 一个索引。

### 3.1 `sessions` 表（会话 / 记录）
| 字段 | 类型 | 含义与写入逻辑 |
| --- | --- | --- |
| `id` | TEXT PK | UUID。前端生成（`crypto.randomUUID()`）并贯穿整个对话生命周期。 |
| `title` | TEXT | 标题。对话类：取首条用户消息前 30 字；灵签类：`灵签 · 第N签 名`。 |
| `model` | TEXT | 该会话使用的模型 id（灵签记录固定为 `'lingqian'`）。 |
| `sdk_session_id` | TEXT | 预留（对接外部 SDK 会话），当前恒 `null`。 |
| `meta` | TEXT(JSON) | **关键字段**，存放起卦信息与记录类型：<br>• 对话类：`{type:'chat', hexName, hexSeq, method, cast?}`，`cast` 为**完整 CastRequest**（用于 resume 时无需前端重传即可复现同一卦象）。<br>• 灵签类：`{type:'lingqian', num, name, level, source}`。 |
| `created_at` | TEXT | ISO 时间，建会话时写入。 |
| `updated_at` | TEXT | ISO 时间；**每写入一条消息自动刷新**，因此历史列表按它倒序即「最近使用」。 |

### 3.2 `messages` 表（消息）
| 字段 | 类型 | 含义与写入逻辑 |
| --- | --- | --- |
| `id` | TEXT PK | UUID。 |
| `session_id` | TEXT FK | 关联 `sessions.id`，`ON DELETE CASCADE`（删会话连带删消息）。 |
| `role` | TEXT | `'user'` 或 `'assistant'`（建表 CHECK 约束）。 |
| `content` | TEXT | 消息文本。**助手消息若为空（`''`）表示解读中断、未落库**——这是「未完成」判定的关键信号。 |
| `model` | TEXT | 该消息所用模型；`user` 消息恒 `null`。 |
| `created_at` | TEXT | ISO 时间，排序依据（升序 = 对话时序）。 |
| `tool_calls` | TEXT | 预留（当前恒 `null`）。 |

索引：`idx_messages_session_id`（按会话查消息加速）。

### 3.3 「未完成」判定逻辑（`isSessionIncomplete`）
取该会话**最后一条消息**：
- `role = 'user'` → 起卦中断，尚无助手回复 ⇒ 未完成；
- `role = 'assistant'` 且 `content` 为空 ⇒ 解读流式中断、未落库 ⇒ 未完成；
- 其余 ⇒ 已完成。

该判定同时用于：① 前端 `openHistory` 打开即自动续答；② 后端 `/api/history` 的 `incomplete` 标记（首页「最近使用」展示与 `guardIncomplete` 拦截）。

### 3.4 起卦字段流向
```
CastRequest（前端 CastModal 收集）
   │  POST /api/chat
   ▼
castDivination(req) → CastResult（结构化卦象：本卦/之卦/动爻/notes/纳甲/揲蓍）
   │  ├─ 写入 session.meta.cast（持久化完整起卦请求，供 resume 复现）
   │  ├─ SSE 推送 hexagram 事件 → 前端 HexagramCard 可视化
   │  └─ hexagramToPrompt(cast) 拼入 systemPrompt
   ▼
Agnes /chat/completions（stream） → SSE text 事件 → 前端逐字渲染解读
   │
   ▼
后端落库 assistant 消息（content 完整）⇒ 会话转为「已完成」
```

### 3.5 续答（resume）字段约定
- 前端 `openHistory(id)` 加载消息后，若判为未完成则自动 `doSend(resume=true)`：**不重复存 user 消息**，仅补助手解读。
- 后端 `/api/chat?resume=true` 从 `session.meta.cast` 还原完整 `CastRequest` 复现卦象；并以「会话已完成则跳过生成」做**幂等兜底**。
- 前端 `resumeLockRef` 在 `await loadSession` **之前**同步上锁，防止「从记录点开」与「返回上一卦」快速重复触发而堆出多个回答（两条路径最终都走 `openHistory(id) → doSend(resume)`，逻辑一致）。

### 3.6 起卦法字段备注（本项目新增 `person`）
`CastRequest.method` 取值：`coin / number / time / char / direction / sound / report / yarrow / najia / person`。
- `person`（姓名生辰起卦，本次新增）：携带 `name`（姓名）、`birthday`（公历 `YYYY-MM-DD`）、`gender`（`'male' | 'female'`）。后端 `castPerson` 以「姓名所禀之数定上卦、生辰年月日之和定下卦、姓名+生辰+性别取余定动爻」推导，**一人一卦**。
- 原 `number`（数字起卦）已从「常用起卦」UI（首页网格 + 进阶起卦法）移除，改由 `person` 替入；后端 `castDivination` 仍保留 `number` 分支以便兼容历史数据。
