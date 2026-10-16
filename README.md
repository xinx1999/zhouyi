# 周易算 · 易经占卜 Web 应用

一个轻量、响应式（桌面 / 平板 / 手机三端自适应）的「周易算」网页 AI 应用，古风国潮视觉风格。
后端接入 **Agnes AI**，内置「周易占卜师」角色，可依据《周易》与诸种传统术数为你起卦解疑，给出卦象、卦辞、爻辞与处世指引。

> 这不是一个「Agent Web 应用」模板：去掉了会话/权限/工具调用等繁复框架，只保留纯粹的占卜对话体验。

🌐 **线上地址**：https://env-00jy6kb8yokx-static.normal.cloudstatic.cn/zy/

---

## 功能特性

### 🔮 十二大术数体系（全部可用）
| 体系 | 实现方式 | 说明 |
| --- | --- | --- |
| 六爻（纳甲） | 自研引擎 | 铜钱/数字/时间/汉字/方位/声音/报数/姓名生辰/揲蓍 九法起卦 + 纳甲排盘（世应·六亲·六神） |
| 梅花易数 | 自研引擎 | 6 种起卦 + 体用/互错综/吉凶 |
| 八字 | 引库 `lunar-javascript` | 四柱·十神·藏干·五行·大运·神煞 |
| 紫微斗数 | 引库 `iztro` | 十二宫·主星·四化·大限 |
| 奇门遁甲 | 引库 `qimen-dunjia`（MIT） | 九宫五层盘 + 拆补法定局 |
| 大六壬 | 引库 `liuren-ts-lib`（Apache-2.0） | 天地盘·四课·三传·49 神煞 |
| 塔罗 | 自研（78 张） | 5 牌阵 · 正逆位 |
| MBTI | 自研 | 80 题 · 四维计分 · 16 型 |
| 周公解梦 | 自研（286 意象） | 长词优先匹配 |
| 合盘（合婚） | 自研（复用八字） | 五维比对 + 加权参考分 |
| 面相 | 多模态（LLM 内置视觉） | 上传照片 → 观察描述 → 断论 |
| 手相 | 多模态（LLM 内置视觉） | 上传掌图 → 掌纹/掌丘观察 → 断论 |

### 🧧 通用能力
- **灵签**：100 签（古典等级印章 + 上上/上吉/中吉/中平/下下）
- **每日数据**：今日一卦 · 今日一签 · 每日一句 · 宜忌
- **可视化卦象**：六爻阴阳、变爻（老阳○ / 老阴×）高亮、本卦 → 之卦并排，附「起卦过程」明细
- **免打字起卦**：随机起卦 / 问事业 / 问感情 / 问健康 一键成卦；对话中也有快捷起卦条
- **流式解读**：SSE 实时输出占卜师解卦
- **历史与续答**：SQLite 持久化，未完成的解读可一键续答（幂等防重复）
- **三端适配**：同一套响应式布局，PC 宽屏、平板、手机竖屏均好用

---

## 技术栈

- **后端**：Node.js + Express + TypeScript（Agnes OpenAI 兼容流式接口）
- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + lucide-react
- **起卦引擎**：`server/divination.ts` 等纯 TS（六十四卦文王卦序 + 九种起卦算法）
- **术数库**：`lunar-javascript`（八字/紫微/农历）· `iztro`（紫微斗数）· `qimen-dunjia`（奇门）· `liuren-ts-lib`（大六壬）
- **数据库**：SQLite（`better-sqlite3`，WAL 模式，消息与会话持久化）
- **视觉理解**：面相/手相复用 LLM 内置多模态能力，图片经 canvas 压缩后以多模态 content 直传，零额外视觉依赖

### 架构总览
统一步骤：**后端计算或取数 → 注入 `systemPrompt` → 模型解读**。
结构化结果（卦象/排盘）持久化在会话 `meta` 中，续答时无需前端重传即可复现；方法论分层（事实 / 解读法 / 语气约束）写在 `server/interpretation.ts`，可独立演进每个体系。

---

## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 同时启动前端(5173)与后端(3000)
```

浏览器打开 http://localhost:5173

---

## 项目结构

```
zhouyi/
├── server/
│   ├── index.ts          # Express 服务：路由 + SSE 流式 + 多体系分发
│   ├── divination.ts     # 周易起卦引擎（九法 + 卦象→提示词 + 每日数据）
│   ├── ganzhi.ts         # 干支 / 五行 / 旺衰 / 合冲害
│   ├── hexagram.ts       # 六十四卦表 / 卦象构建
│   ├── liuyao.ts         # 纳甲六爻断卦要素（空亡/用神/旺衰/应期）
│   ├── meihua.ts         # 梅花易数体用分析
│   ├── interpretation.ts # 各体系方法论常量（断卦法 / 语气约束）
│   ├── db.ts             # SQLite 操作（会话/消息/求签）
│   ├── bazi.ts  ziwei.ts  tarot.ts  qimen.ts  daliuren.ts  dream.ts  hepan.ts  mbti.ts  # 各体系计算/取数 + *ToPrompt
│   ├── tarot-data.ts  dream-data.ts  # 词库/牌库数据
│   └── lunar-javascript.d.ts
├── src/
│   ├── App.tsx           # 前端主组件（消息/会话/加载态/错误态）
│   ├── api.ts            # 前端 API 层（SSE 解析 + 各体系请求）
│   ├── prompt.ts         # 周易占卜师默认系统提示词
│   ├── types.ts          # 类型定义（与起卦引擎对齐）
│   ├── styles.css        # 古风国潮主题 + 响应式
│   ├── components/
│   │   ├── HomeView.tsx          # 首页（今日/起卦/各体系入口）
│   │   ├── HexagramCard.tsx      # 可视化卦象卡片
│   │   ├── NajiaPanel.tsx  MeihuaPanel.tsx
│   │   ├── BaziPanel.tsx  ZiweiPanel.tsx  QimenPanel.tsx  DaliurenPanel.tsx
│   │   ├── TarotPanel.tsx  DreamPanel.tsx  HepanPanel.tsx  MbtiQuiz.tsx
│   │   ├── ImageReadingModal.tsx # 面相/手相 上传+预览+解读
│   │   ├── LingQian*.tsx  CastModal.tsx  BirthModal.tsx  TarotModal.tsx  DreamModal.tsx  HepanModal.tsx
│   │   ├── ChatView.tsx  MessageBubble.tsx  Composer.tsx  QuickActions.tsx  Header.tsx  SettingsModal.tsx  ConfirmModal.tsx  Loading.tsx  MiniGua.tsx  YarrowSteps.tsx
│   └── castCategories.ts  content.ts  main.tsx
├── tests/
│   └── regression.ts     # 十二体系回归测试（零依赖，tsx 运行）
├── data/chat.db          # SQLite 数据库（gitignore）
├── .env                  # Agnes API Key 等配置（gitignore）
└── package.json
```

---

## 配置

后端使用 **Agnes AI**（`https://apihub.agnes-ai.com/v1`）。复制 `.env.example` 为 `.env` 填入 Key：

```bash
cp .env.example .env
# AGNES_API_KEY=sk-xxx
# AGNES_MODEL=agnes-2.0-flash
```

也可在应用内「设置」页填入（仅当前进程有效，重启需重设）。

> ⚠️ 若按 README 的公网地址部署，**请设置 `APP_ADMIN_TOKEN` 环境变量**并在应用「设置」中输入同一令牌，否则 `/api/save-env-config` 可被任意访客覆盖你的 API Key。

### 接口说明

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/check-login` | GET | Agnes Key 配置状态 |
| `/api/models` | GET | 模型列表（自动从 Agnes 拉取） |
| `/api/chat` | POST | 发送消息（SSE：init → hexagram/bazi/... → text → done）；body 支持 `cast`(起卦) 及 `bazi`/`ziwei`/`qimen`/`daliuren`/`dream`/`hepan`/`face`/`palm` 等结构化数据字段 |
| `/api/bazi` `/api/ziwei` `/api/tarot` `/api/mbti` `/api/qimen` `/api/daliuren` `/api/dream` `/api/hepan` | POST | 各体系排盘/计算（返回结构化结果，供前端展示与续答） |
| `/api/mbti/questions` | GET | MBTI 题库 |
| `/api/lingqian` | POST | 求签 |
| `/api/daily` | GET | 今日一卦 / 今日一签 / 每日一句 / 宜忌 |
| `/api/history` | GET | 历史会话列表 |
| `/api/sessions/*` | GET/POST/DELETE | 会话读写与删除 |
| `/api/save-env-config` | POST | 运行时设置 API Key / BaseURL / 模型（建议配 `APP_ADMIN_TOKEN` 保护） |

`/api/chat` 的 body 支持以下形态：
```jsonc
{ "message": "我想问事业", "cast": { "method": "coin" } }
{ "message": "请排八字", "bazi": { "gender": "male", "year": 1990, "month": 5, "day": 20, "hour": 8 } }
{ "message": "请为我看面相", "face": { "imageBase64": "...", "mimeType": "image/png" } }
```
后端会先由对应引擎计算/取数，把结构化结果注入 `systemPrompt`，模型严格据此解卦（不会自行另起一卦或编造事实）。

---

## 开发 / 质量门禁

```bash
npm run dev        # 前后端同时
npm run dev:server # 仅后端（tsx watch）
npm run dev:client # 仅前端（vite）
npm run build      # 生产构建（先 typecheck 再 vite build）
npm run typecheck  # 类型检查（前端 + 后端 + 测试，零错误才通过）
npm test           # 十二体系回归测试（38 项断言，零依赖）
```

---

## License

MIT
