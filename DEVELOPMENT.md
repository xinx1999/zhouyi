# 周易算 · 二次开发指南

> 本文档基于 **2026-10-16** 对代码的实际通读与实测编写，与仓库当前代码一致。
>
> - 想看**项目简介与快速开始** → 见 `README.md`
> - 想看**架构总览与数据库字段详解** → 见 `ARCHITECTURE.md`
> - 想看**改哪里、怎么加功能** → 就是本文档

---

## 目录

- [一、先跑起来](#一先跑起来)
- [二、真实技术栈](#二真实技术栈)
- [三、目录结构（真实）](#三目录结构真实)
- [四、核心机制](#四核心机制)
  - [4.1 SSE 流式协议](#41-sse-流式协议)
  - [4.2 起卦引擎](#42-起卦引擎)
  - [4.3 续答（resume）机制](#43-续答resume机制)
  - [4.4 数据库](#44-数据库)
- [五、常见二次开发场景](#五常见二次开发场景)
- [六、API 参考（真实）](#六api-参考真实)
- [七、调试技巧](#七调试技巧)
- [八、已知问题与待办](#八已知问题与待办)
- [九、构建与部署](#九构建与部署)

---

## 一、先跑起来

```bash
npm install          # 首次可能因 esbuild 报 EBUSY 而中断，重试一次即可
cp .env.example .env # 填入 AGNES_API_KEY
npm run dev          # 同时起前端(:5173) 与 后端(:3000)
```

浏览器打开 <http://localhost:5173>。

> `npm run dev` 前会自动执行 `predev` 钩子（`scripts/free-ports.mjs`），杀掉仍占用 3000/5173/5174 的孤儿进程，避免 `EADDRINUSE`。

**没有 API Key 也能启动**，但首页数据与解卦都会失败——`/api/models` 会返回空列表，发消息会报错。

### 脚本一览

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 前端 + 后端一起起（`concurrently`） |
| `npm run dev:server` | 仅后端（`tsx watch server/index.ts`） |
| `npm run dev:client` | 仅前端（`vite`） |
| `npm run server` | 单次启动后端（不 watch） |
| `npm run build` | 生产构建（**仅前端**，产物在 `dist/`） |
| `npm run preview` | 预览构建产物 |
| `npm run free-ports` | 手动清理端口 |

> ⚠️ **后端必须用 `tsx` 跑，不能直接 `node`**——源码是 TS 且用了 ESM + `.js` 后缀导入。

---

## 二、真实技术栈

### 前端

| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | React 18.2 + TypeScript 5.3 | 函数组件 + Hooks，无路由库（视图靠 `view` 状态切换） |
| 构建 | Vite 5 | `@vitejs/plugin-react` |
| 样式 | **Tailwind CSS 3** + 少量 `src/styles.css` 关键帧动画 | 古风色板定义在 `tailwind.config.js` |
| 图标 | lucide-react 0.563 | |
| 字体 | Google Fonts：`Ma Shan Zheng`（毛笔标题）+ `Noto Serif SC`（正文） | 在 `index.html` 引入 |
| 流式 | 原生 `fetch` + `ReadableStream` 读 SSE | **不依赖任何 SSE 库** |

> 注意：Tailwind 的 `content` 只扫 `index.html` 与 `src/**/*.{js,ts,jsx,tsx}`。**新增组件时无需改配置**，但如果新增了源码目录需要同步改 `tailwind.config.js`。

### 后端

| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 服务 | Express 4.18 | `server/index.ts`，默认端口 3000 |
| 运行 | `tsx`（直接跑 TS，watch 模式） | 见上文警告 |
| 数据库 | better-sqlite3 12（**同步 API**） | 单文件 `data/chat.db`，WAL 模式 |
| 配置 | dotenv + 进程内环境变量 | 见下 |
| 大模型 | Agnes AI（OpenAI 兼容 `/v1/chat/completions`） | 流式解卦 |

### 环境变量（`.env`）

```bash
PORT=3000
AGNES_API_KEY=your_api_key_here
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1
AGNES_MODEL=            # 留空则自动取 Agnes 返回的第一个文本模型
```

> **坑**：`AGNES_MODEL` 留空时，`/api/models` 会自动挑第一个**文本类**模型（过滤掉 image/video/tts/embedding 等）。README 提到 `1.5-flash` 会拒答占卜，建议显式指定 `2.0-flash`。
>
> 也可在应用内「设置」页填 Key，但**只在当前进程有效**，重启即失效（代码见 `/api/save-env-config`）。

### Vite 代理

前端所有 `/api/*` 请求由 `vite.config.ts` 代理到 `http://localhost:3000`。所以前端代码里一律写相对路径（`fetch('/api/daily')`），不要写死 host。

---

## 三、目录结构（真实）

```
zhouyi/
├── index.html                  # SPA 入口（含 favicon「易」印 SVG、字体引入）
├── vite.config.ts              # Vite 配置 + /api 代理
├── tailwind.config.js          # 古风色板：ink/gold/vermilion/fg/line/jade
├── tsconfig.json               # 前端配置（include: src）
├── tsconfig.node.json          # 构建脚本 + server（include: vite.config.ts, server/**）
├── .env / .env.example
├── public/qian-barrel.png      # 签筒图片
├── scripts/free-ports.mjs      # predev：清理端口孤儿进程
├── data/chat.db                # SQLite（运行时生成，已 gitignore）
├── server/                     # 后端
│   ├── index.ts                # Express 入口 + 全部路由 + SSE 流式
│   ├── divination.ts           # 起卦引擎（966 行，核心资产）
│   └── db.ts                   # SQLite 访问层
└── src/                        # 前端
    ├── main.tsx                # React 入口
    ├── App.tsx                 # 应用状态中枢
    ├── api.ts                  # 前端 API 层（含 SSE 解析）
    ├── types.ts                # 全局类型（与 divination.ts 对齐）
    ├── prompt.ts               # 占卜师系统提示词
    ├── content.ts              # 静态内容：热门问题 / 灵签 100 签 / 今日签
    ├── castCategories.ts       # 起卦法元数据 + 分类分组
    ├── styles.css              # 关键帧动画 + 少量非 Tailwind 样式
    └── components/             # 17 个组件
```

### 组件职责速查

| 组件 | 职责 |
| --- | --- |
| `Header.tsx` | 顶栏：Logo 印、标题、首页 / 新占 / 设置入口 |
| `HomeView.tsx` | 首页（605 行）：四个 Tab——今日 / 起卦 / 灵签 / 记录 |
| `ChatView.tsx` | 对话视图：空态引导 + 消息列表 |
| `MessageBubble.tsx` | 消息气泡；助手消息会**抽取 `## 总结` 段渲染成高亮卡** |
| `HexagramCard.tsx` | 卦象可视化：本卦/之卦六爻、起卦过程、揲蓍/纳甲挂载 |
| `NajiaPanel.tsx` | 纳甲六爻排盘表：宫属、世应、干支、六亲、六神 |
| `YarrowSteps.tsx` | 揲蓍法十八变分步明细 |
| `MiniGua.tsx` | 轻量 SVG 卦象（今日一卦用），可选爻位标注 |
| `LingQian.tsx` | 求签：签筒 + 摇签动画 + 抽签（随机 / 今日） |
| `LingQianDetail.tsx` / `LingQianDetailModal.tsx` | 签文详情（纯展示 / 弹窗容器） |
| `QuickActions.tsx` | 对话空态：一键占卜 + 自定义起卦九宫格 |
| `CastModal.tsx` | 起卦弹窗：按起卦法渲染不同输入并校验 |
| `Composer.tsx` | 底部输入框 |
| `ConfirmModal.tsx` | 通用确认弹窗（Esc 可关） |
| `SettingsModal.tsx` | 设置：Agnes `apiKey/baseUrl/model` |
| `Loading.tsx` | 加载指示器（`block` / `inline` / `dark`） |

---

## 四、核心机制

### 4.1 SSE 流式协议

`POST /api/chat` 返回 `text/event-stream`，共 **5 种事件**：

| 事件 | 载荷 | 时机 |
| --- | --- | --- |
| `init` | `{sessionId, userMessageId, assistantMessageId, model}` | 流开始 |
| `hexagram` | `{data: CastResult}` | **仅当本次带 `cast`**，先于文本推送，供前端绘图 |
| `text` | `{content: string}` | 逐字增量 |
| `done` | `{}` | 流结束（**已落库**） |
| `error` | `{message: string}` | 出错 |

前端解析在 `src/api.ts` 的 `sendChat()`：按 `\n` 切行 → 取 `data:` 前缀 → `JSON.parse` → 按 `type` 分发到回调。

**注意两个反直觉的地方**：

1. **`init` 可能不带任何 `text` 就 `done`。** 续答时若会话已完成、或该会话正在生成中，后端会直接返回 `init + done` 跳过生成（幂等兜底）。前端 `onDone` 会检测到助手气泡内容为空并**移除这个空气泡**——这是有意为之，不要"优化"掉。
2. **后端会剥离模型自带的开场白。** Agnes 每条回复都会带「你好。我是 Agnes-2.0-Flash，由 Sapiens AI 开发。」，`server/index.ts` 用 `AGNES_INTRO_CANDIDATES` 在流式输出开头做前缀匹配并剥除。缓冲到超过最长候选长度仍未匹配就整体放行。**换模型后若开场白变了，需要同步更新这个候选数组。**

### 4.2 起卦引擎

`server/divination.ts` 是项目的核心资产，**纯函数、无副作用、可离线测试**。

**9 种起卦法**（`castDivination(req)` 统一入口，按 `req.method` 分派）：

| method | 算法要点 |
| --- | --- |
| `coin` | 三枚铜钱抛六次；3正=老阳(9)、2正=少阳(7)、1正=少阴(8)、0正=老阴(6) |
| `number` | 数一÷8余定上卦、数二÷8余定下卦、(和)÷6余定动爻 |
| `time` | (年+月+日)÷8 定上卦、(年+月+日+时)÷8 定下卦、和÷6 定动爻 |
| `char` | 汉字取 Unicode 码点求和；前半字定上卦、后半字定下卦、全和定动爻 |
| `direction` | 方位先天数定上卦、此刻时辰定下卦、和定动爻 |
| `sound` | 声数定上卦、句数定下卦、和定动爻 |
| `report` | 报 1 数（上下卦相承）或 2 数（同数字法） |
| `person` | 姓名码点之和定上卦、生辰年月日之和定下卦、再合性别(男1女2)定动爻 |
| `yarrow` | 揲蓍法：49 策，三变成一爻、十八变成卦，**记录每变明细** |

**两个附加能力**（不是独立 method）：

- **纳甲排盘**：传 `najia: true`，会在基础卦之上附加 `najia`（本卦）与 `najiaZhi`（变卦）——京房纳甲，含宫属/世应/干支/六亲/六神。
- **揲蓍明细**：`yarrow` 法自带 `yarrowSteps`，前端 `YarrowSteps` 组件分步展示。

**统一约定**：六爻数组一律**自下而上**（初爻 → 上爻），`changingPositions` 用 1–6 表示爻位。

**注入模型的提示词**：`hexagramToPrompt(cast)` 把结构化卦象转成文本拼进 systemPrompt，并强约束模型"严格依据此卦解读、不得另起一卦、结尾必须产出 `## 总结`"。

### 4.3 续答（resume）机制

这是本项目最精妙也最容易改坏的部分，**改之前务必先读懂**。

**要解决的问题**：用户起卦后，流式解读中途被打断（关页面、切走），数据库里只留下一条 `user` 消息或一条空 `assistant` 消息。用户下次从「记录」点开时，应该自动补完解读，而**不能堆出多个回答**。

**"未完成"的判定**（`db.isSessionIncomplete`）——取会话最后一条消息：

- 末条是 `user` → 起卦中断，未完成
- 末条是 `assistant` 且 `content` 为空 → 解读流式中断未落库，未完成
- 其余 → 已完成

**三层防重复**（任何一层单独看都不够，是配合起来才成立）：

| 层 | 位置 | 作用 |
| --- | --- | --- |
| 1 | 前端 `resumeLockRef` | **必须在 `await loadSession` 之前同步上锁**，否则并发点击会在 await 挂起期都挤进去 |
| 2 | 后端 `generating`（内存 Set） | 同一会话并发 resume 时跳过，避免各生成一条 |
| 3 | 后端幂等判定 | `isResume && !isSessionIncomplete()` → 已完成就跳过生成 |

**续答时不重复存用户消息**：后端从 `session.meta.cast` 还原完整 `CastRequest` 复现同一卦象，不需要前端重传。前端 `doSend(..., resume=true)` 也不追加用户气泡。

**两条进入续答的路径最终都走** `openHistory(id) → doSend(resume)`：从记录点开、以及「返回上一卦」确认按钮。所以修 `openHistory` 时两条路径同时生效。

### 4.4 数据库

两张表 + 一个索引，详见 `ARCHITECTURE.md` 第三节。**开发时要记住的三点**：

1. **`sessions.meta` 是 JSON 字符串**，存两类记录：对话类 `{type:'chat', hexName, hexSeq, method, cast}`、灵签类 `{type:'lingqian', num, name, level, source}`。`cast` 字段是**完整 CastRequest**，续答复现卦象就靠它。
2. **助手消息 `content` 为空 = 解读中断**，这是"未完成"判定的信号。不要给空内容补占位符。
3. **`sessions.updated_at` 在每次写消息时自动刷新**，历史列表按它倒序即"最近使用"。

`db.ts` 里已有**列迁移逻辑**（`sdk_session_id`、`meta`），新增列时可仿照写。

---

## 五、常见二次开发场景

### 场景 1：新增一种起卦法（以最近新增的 `person` 为模板）

需要**同时改 6 个地方**，漏一个就会出现"界面能点但后端报未知起卦方式"或反之：

| # | 文件 | 改什么 |
| --- | --- | --- |
| 1 | `server/divination.ts` | ① `CastMethod` 类型加值；② 写 `castXxx()` 函数；③ `castDivination()` 的 `switch` 加 `case` |
| 2 | `src/types.ts` | ① `CastMethod` 类型加值；② `CastRequest` 加所需参数 |
| 3 | `src/castCategories.ts` | ① `CastMethodKey` 类型加值；② `METHOD_META` 加元数据（title/short/icon/hint/when）；③ 决定挂在 `CAST_CATEGORIES` 哪个分类下 |
| 4 | `src/components/CastModal.tsx` | ① `submit()` 加校验与 `onSubmit` 分支；② 输入区渲染（复用 `inputsFor()` 或加独立块） |
| 5 | `src/components/HexagramCard.tsx` | `methodName()` 加 `case`（否则卡片标题显示英文 id） |
| 6 | `src/components/HomeView.tsx` | `methodLabel()` 加映射（否则历史记录标签显示英文 id） |

> **第 2、3 步的类型是两份独立的定义**（`types.ts` 的 `CastMethod` 与 `castCategories.ts` 的 `CastMethodKey`），别只改一份。

**纳甲类的新方法**：不要新增 `method: 'najia'`。`najia` 只是 UI 概念——前端传的是 `{method: <基础法>, najia: true}`，后端在基础卦之上附加排盘。`CastResult.method` 永远是基础法。

### 场景 2：改系统提示词 / 解卦风格

编辑 `src/prompt.ts` 的 `DEFAULT_SYSTEM_PROMPT`。它由前端随每次请求作为 `systemPrompt` 传给后端，后端再拼接卦象文本。

**必须保留的约定**：结尾要求模型输出 `## 总结` 段落——`MessageBubble.tsx` 的 `splitSummary()` 靠这个标记抽取高亮卡。改格式要同步改这个正则。

### 场景 3：换模型 / 换大模型厂商

- **只换模型**：改 `.env` 的 `AGNES_MODEL`，或应用内「设置」页填。
- **换厂商**：改 `AGNES_BASE_URL` + `AGNES_API_KEY`，因为走的是 OpenAI 兼容协议，通常无需改代码。**但两处 Agnes 特有的逻辑要处理**：
  1. `server/index.ts` 的 `AGNES_INTRO_CANDIDATES`（剥离开场白）——新厂商没有这句开场白的话，留着无害；有新开场白则需加入候选。
  2. `model` 列表过滤规则（`/(image|img|video|tts|speech|audio|embedding|realtime|vector)/`）——如果新厂商的文本模型名里含这些词会被误过滤。

### 场景 4：改主题色与字体

- **色板**：`tailwind.config.js` 的 `theme.extend.colors`（`ink` / `gold` / `vermilion` / `fg` / `line` / `jade`）。改这里会全局生效。
- **字体**：`tailwind.config.js` 的 `fontFamily`（`serif` / `brush`）+ `index.html` 的 Google Fonts 引入。
- **动画**：`tailwind.config.js` 的 `keyframes`/`animation`，或 `src/styles.css`。
- **主题色 meta**：`index.html` 的 `<meta name="theme-color">`。

### 场景 5：改灵签内容

全部在 `src/content.ts`：`LINGQIAN`（签诗库）、`dailyLingQian()`（按日种子的今日签）、`LINGQIAN_LEVEL_COLOR`（等级配色）。

> 签文是**纯前端数据**，后端只存签号/签名/等级/来源。所以扩充签库不需要动数据库。

### 场景 6：新增 API 端点

在 `server/index.ts` 里照现有风格加：

```ts
app.get('/api/xxx', (req, res) => {
  try {
    // ...
    res.json({ data });
  } catch (error: any) {
    console.error('[Xxx] Error:', error);
    res.status(500).json({ error: error?.message || '失败原因' });
  }
});
```

再到 `src/api.ts` 加对应的 `fetch` 封装函数。**每个 handler 都要 try/catch 并返回可读错误**，这是本项目的既有风格。

### 场景 7：改数据库结构

在 `server/db.ts` 建表语句里加列，**并为已有库补一段迁移**（仿照文件里 `sdk_session_id` / `meta` 的写法）：

```ts
try {
  const info = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  if (!info.some((c) => c.name === '新列名')) {
    db.exec("ALTER TABLE sessions ADD COLUMN 新列名 TEXT");
  }
} catch { /* 列可能已存在 */ }
```

### 场景 8：改首页布局

`src/components/HomeView.tsx`（605 行）用四个 Tab 组织：`今日` / `起卦` / `灵签` / `记录`。数据全部由 `App.tsx` 以 props 传入（`daily` / `history` / `loadingXxx` + 一组 `onXxx` 回调），**HomeView 自身不请求接口**。新增模块时保持这个约定。

---

## 六、API 参考（真实）

| 端点 | 方法 | 请求 | 响应 |
| --- | --- | --- | --- |
| `/api/health` | GET | — | `{status, provider, timestamp}` |
| `/api/check-login` | GET | — | `{isLoggedIn, method, envConfigured, cliConfigured, apiKey(掩码), envVars}` |
| `/api/save-env-config` | POST | `{apiKey?, baseUrl?, model?}` | `{success, message, note}` |
| `/api/models` | GET | — | `{models: [{modelId, name, description}], defaultModel, error?}` |
| `/api/daily` | GET | `?date=YYYY-MM-DD`（可选） | `{daily: {date, weekday, hexagram, yi, ji, quote}}` |
| `/api/history` | GET | `?limit=1..500`（默认 50） | `{history: [...]}` |
| `/api/lingqian` | POST | `{num, name, level, source}` | `{id}` |
| `/api/sessions` | GET | — | `{sessions: [...+messageCount]}` |
| `/api/sessions` | POST | `{model?, title?}` | `{session}` |
| `/api/sessions/:id` | GET | — | `{session, messages}` |
| `/api/sessions/:id` | PATCH | `{title?, model?}` | `{success}` |
| `/api/sessions/:id` | DELETE | — | `{success}` |
| `/api/chat` | POST | 见下 | SSE 流 |

### `POST /api/chat` 请求体

```jsonc
{
  "sessionId": "uuid",
  "message": "我想问事业",
  "model": "agnes-2.0-flash",
  "systemPrompt": "（可选）覆盖默认提示词",
  "cast": { "method": "coin" },   // 可选，见下表
  "resume": true                   // 可选，续答模式
}
```

### `cast` 各起卦法参数

```jsonc
{ "method": "coin" }
{ "method": "number",    "numbers": [8, 3] }
{ "method": "time",      "timestamp": 1700000000000 }
{ "method": "char",      "chars": "问道" }
{ "method": "direction", "direction": "qian" }
{ "method": "sound",     "sound": { "count": 3, "sentences": 2 } }
{ "method": "report",    "numbers": [7] }          // 或 [7, 5]
{ "method": "person",    "name": "张三", "birthday": "1990-05-20", "gender": "male" }
{ "method": "yarrow" }
{ "method": "coin",      "najia": true }           // 任意基础法 + najia 排盘
```

> 所有起卦法都可带 `"question": "所问之事"`。

---

## 七、调试技巧

### 看后端日志

`tsx watch` 会把 `console.log` 打到终端。`/api/chat` 有完整的过程日志（会话 id / 模型 / 起卦结果 / 字数），起卦成功会打印：

```
[Chat] 起卦成功：地天泰 之 泽天夬
```

### 看数据库

**环境里没有 `sqlite3` 命令行工具**（已实测），直接用项目自带的 `better-sqlite3`。`node -e` 默认按 CommonJS 解析，可以放心用 `require`：

```bash
# 列出所有表
node -e "const D=require('better-sqlite3');console.log(new D('data/chat.db').prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all())"

# 最近 10 条记录
node -e "const D=require('better-sqlite3');console.table(new D('data/chat.db').prepare('SELECT id,title,updated_at FROM sessions ORDER BY updated_at DESC LIMIT 10').all())"

# 某会话的消息（len 为空=解读中断，即「未完成」）
node -e "const D=require('better-sqlite3');console.table(new D('data/chat.db').prepare('SELECT role,length(content) AS len FROM messages WHERE session_id=? ORDER BY created_at').all('把这里换成会话id'))"
```

> 需先启动过一次服务，`data/chat.db` 与表才会生成。

### 看 SSE 原始流

浏览器 DevTools → Network → 筛选 `Fetch/XHR` → 点开 `/api/chat` 请求 → **EventStream** 标签可看到逐条事件。

或用命令行：

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"测试","cast":{"method":"coin"}}'
```

### 离线验证起卦引擎（推荐）

`divination.ts` 是纯函数，**不必起服务、不必调模型**就能验证。写个临时脚本用 `tsx` 直接跑：

```bash
cat > _check.tmp.ts <<'EOF'
import { castDivination } from './server/divination.js';
const r = castDivination({ method: 'number', numbers: [8, 1] });
console.log(r.benGua.seq, r.benGua.name); // 应为 11 地天泰
EOF
node_modules/.bin/tsx _check.tmp.ts && rm _check.tmp.ts
```

改算法后建议至少验一遍：**64 卦是否仍全覆盖且唯一**（遍历 1..8 × 1..8）、**铜钱法概率是否仍符合 1/8·3/8·3/8·1/8**。

### 类型检查（当前需手动跑）

项目**尚未配置 `typecheck` 脚本**，`npm run build` 也不做类型检查。手动跑：

```bash
# 前端
node_modules/.bin/tsc -p tsconfig.json --noEmit

# 后端（注意：会在根目录生成 tsconfig.node.tsbuildinfo，跑完记得删）
node_modules/.bin/tsc -p tsconfig.node.json --noEmit && rm -f tsconfig.node.tsbuildinfo
```

---

## 八、已知问题与待办

> 以下为 **2026-10-16** 实测（装依赖 + 构建 + 离线校验 + 类型检查）的结果快照。修完请同步更新本节。

### 类型错误（6 处，**均不影响运行**，但说明类型契约已松动）

| 位置 | 问题 |
| --- | --- |
| `src/components/HomeView.tsx:132` | `CastPreset` 缺 `label` 字段（该字段未被使用，故无运行时影响） |
| `server/divination.ts:725` | `liuShen` 推断为 `string`，非 `LiuShen` 联合类型 |
| `server/index.ts:288` | `createSession` 调用缺 `sdk_session_id` / `meta` |
| `server/index.ts:405` | 同上，缺 `meta` |
| `server/divination.ts:373` | 字符串展开需 ES2015+ target（`tsconfig.node.json` 未设 `target`，默认落到 ES5） |
| `server/divination.ts:533` | 同上 |

**根因**：项目没有类型检查关卡，`npm run build` 只跑 `vite build`（esbuild 转译**不检查类型**）。建议补一个 `"typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit"` 并纳入流程。

### 配置问题

- `tsconfig.node.json` 缺 `target` / `lib`，导致 `server/` 在项目自身配置下检查不通过。
- `tsconfig.node.json` 是 `composite: true` 但没设 `outDir`，跑 `tsc -p` 会在项目根留下 `tsconfig.node.tsbuildinfo`。

### 健壮性

- **SSE 解析静默失败**：`src/api.ts` 与 `server/index.ts` 用空 `catch {}` 跳过解析不了的行。单行跳过没问题，但**当整个响应都不是 SSE**（某些网关会用 200 返回 JSON 错误体或一整页 HTML）时每行都被跳过，最终只报"模型没有返回内容"，把排查方向带偏。建议把收到的原文摆出来。
- **首屏静默降级**：`fetchModels` / `fetchDaily` / `fetchHistory` 的失败都被 `.catch(() => {})` 吞掉。后端没起时首页静默空白，且 `model` 为空会让后续发消息报出难懂的错。
- **`/api/save-env-config` 无鉴权**，任何人可运行时覆盖 API Key。本地自用可接受，公网部署需加保护。
- `/api/history` 对每条记录各查一次 `isSessionIncomplete`（N+1），`limit` 上限 500。

### 一致性

- `src/components/HexagramCard.tsx` 的 `methodName()` 里 `case 'najia'` 是**死代码**（`CastResult.method` 永不为 `'najia'`）。结果是纳甲模式下卡片标题显示基础法名（如"三枚铜钱法"），而历史列表显示"纳甲六爻"，两处不一致。

### 文档

- `README.md` 部分过时：写"三种起卦"实为九种；写"原生 CSS，无重型 UI 库"实为 Tailwind + lucide-react。

---

## 九、构建与部署

### 构建

```bash
npm run build     # 产物在 dist/（纯静态前端）
```

实测产物规模：JS 约 218 kB（gzip 84 kB）+ CSS 约 33 kB（gzip 8 kB），**体积健康**。

### 部署形态

**注意：`npm run build` 只构建前端。** 完整的应用需要**两个部分**：

1. **静态前端**（`dist/`）——可部署到任意静态托管。
2. **Node 后端**（`server/`，端口 3000）——必须常驻，它承担起卦、SSE 流式转发、SQLite 持久化、API Key 保管。

前端请求的是相对路径 `/api/*`，所以生产环境需要**把 `/api` 反向代理到后端**（或让后端同时托管 `dist/`）。仅部署 `dist/` 会得到一个"能看不能用"的页面。

### 后端常驻

```bash
# 用 tsx 直接跑（推荐，简单）
npm run server

# 或用 pm2
pm2 start "npx tsx server/index.ts" --name zhouyi
```

### 安全提醒

- `.env` 含 API Key，**已在 `.gitignore` 中，切勿提交**。
- SQLite 文件 `data/chat.db` 同样已 gitignore；部署时需挂载持久化卷，否则重启丢历史。
- 若要公网暴露，**至少**给 `/api/save-env-config` 加访问控制，并考虑给整个 API 加限流（`/api/chat` 每次都会真实调用大模型，产生费用）。
