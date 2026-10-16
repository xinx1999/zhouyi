# 周易算 · 项目体检报告

- **体检时间**：2026-10-16
- **体检方式**：通读全部源码（约 5900 行）+ 实际安装依赖 + 跑生产构建 + 离线跑起卦引擎校验
- **仓库状态**：`main` 分支，8 次提交，工作区干净；`node_modules` / `data` / `.env` 均未纳入版本管理

---

## 一、一句话结论

**代码质量明显高于一般 Demo——起卦引擎经我实测是正确的，架构（尤其是"续答"幂等设计）有真功夫；但工程化是短板：项目没有类型检查关卡，导致 6 处类型错误长期潜伏，且 `DEVELOPMENT.md` 整份文档与代码完全无关。**

---

## 二、这个项目是什么

一个《周易》占卜 Web 应用（古风墨金 UI），前后端一体：

| 层 | 技术 | 关键文件 |
| --- | --- | --- |
| 前端 | React 18 + TS + Vite + Tailwind | `src/App.tsx`（状态中枢）、`src/components/*`（19 个组件） |
| 后端 | Express + tsx 运行 TS | `server/index.ts`（路由 + SSE 流式） |
| 起卦引擎 | 纯 TS，无依赖 | `server/divination.ts`（966 行） |
| 存储 | SQLite（better-sqlite3，WAL） | `server/db.ts` |
| 大模型 | Agnes AI（OpenAI 兼容流式） | `.env` 配 Key |

功能面相当完整：**9 种起卦法**（铜钱 / 数字 / 时间 / 汉字 / 方位 / 声音 / 报数 / 姓名生辰 / 揲蓍）、纳甲六爻排盘、灵签 100 签、今日一卦 / 今日一签 / 每日一句、流式解卦、历史记录与"未完成续答"。

---

## 三、我实测了什么（结论有据）

### ✅ 1. 起卦引擎 —— 全部通过

写脚本离线跑了 `server/divination.ts`，结果 **ALL PASS**：

- **64 卦全覆盖且唯一**：1–8 × 1–8 共 64 组输入，恰好产出 64 个不同卦，无重复无缺失。
- **文王卦序抽查全部正确**：乾为天(1)、坤为地(2)、水雷屯(3)、山水蒙(4)、地天泰(11)、天地否(12)、坎为水(29)、离为火(30)、水火既济(63)、火水未济(64)。
- **纳甲排盘 64/64**：任意卦都能正确排出宫属、世应、干支、六亲、六神。
- **九种起卦法结构合法**：六爻齐备、动爻在 1–6 内、有变爻必有之卦且变爻阴阳确实反转。
- **铜钱法概率分布正确**：3000 次采样，老阴/老阳各约 12.5%、少阴/少阳各约 37.5%，与理论值（1/8、3/8、3/8、1/8）吻合。

> 这部分是项目的核心价值，**它是对的**。

### ✅ 2. 生产构建 —— 通过

`vite build` 成功：52 个模块，产物 JS 218.6 kB（gzip 83.6 kB）+ CSS 33.4 kB（gzip 7.7 kB），耗时 1.7s。体积健康。

### ⚠️ 3. 依赖安装 —— 首次失败，重试成功

首次 `npm install` 因 esbuild 安装脚本报 `EBUSY`（Windows 文件占用）中断，导致 `@esbuild/win32-x64`、`@vitejs/plugin-react` 缺失；**重试一次即补齐**。属环境偶发，非项目缺陷。

### ❌ 4. 类型检查 —— 6 处错误（前端 1 + 后端 5）

| # | 位置 | 错误 | 实际影响 |
| --- | --- | --- | --- |
| 1 | `src/components/HomeView.tsx:132` | `CastPreset` 缺 `label` 字段 | 无（该字段未被使用） |
| 2 | `server/divination.ts:725` | `liuShen` 是 `string`，非 `LiuShen` 联合类型 | 无（值合法） |
| 3 | `server/index.ts:288` | `createSession` 缺 `sdk_session_id`/`meta` | 无（INSERT 语句自己写死了字段） |
| 4 | `server/index.ts:405` | 同上，缺 `meta` | 无 |
| 5 | `server/divination.ts:373` | 字符串展开需 ES2015+ target | 无（tsx 用 esbuild 转译） |
| 6 | `server/divination.ts:533` | 同上 | 无 |

**关键点：这 6 个错误当前都不影响运行**，但它们能存在，说明一个真问题——

> **项目没有任何类型检查关卡。** `npm run build` 只跑 `vite build`（esbuild 转译，**不做类型检查**），`package.json` 里也没有 `typecheck` / `lint` / `test` 脚本。所以第 1 条那种"改了类型定义、调用处忘了改"的错误，会被静默放过并打进产物。这次的 `CastPreset.label` 就是活例：类型上刻意加了 `label`（注释写着"显式，不再用 message 推断"），`HomeView` 的调用处漏改。

### ❌ 5. `tsconfig.node.json` 配置不完整

没有设置 `target`（默认落到 ES5）和 `lib`，所以 `server/` 在项目自己的配置下就检查不通过（上面第 5、6 条）。

---

## 四、问题清单（按优先级）

### 🔴 高：文档误导

- **`DEVELOPMENT.md` 整份跑题。** 它描述的是一个「CodeBuddy Agent SDK + TDesign + React Router」的 Web Agent 模板，通篇提到 `useChat.ts`、`Sidebar.tsx`、`PermissionDialog.tsx`、`@tencent-ai/agent-sdk`、`useAgents.ts`……**这些文件在本项目里一个都不存在**。它是从模板原样复制来的，与实际代码（周易占卜 + Agnes AI）毫无关系。任何人（包括 AI）照它开发都会走错方向。**这是当前最该修的一项。**
- **`README.md` 部分过时**：写"三种起卦"，实际是九种；写"原生 CSS，无重型 UI 库"，实际用了 Tailwind + lucide-react；项目结构图漏了 `castCategories.ts`、`YarrowSteps`、`NajiaPanel` 等。
- 对比之下，**`ARCHITECTURE.md` 是准确且详尽的**——写得很好，可作范本。

### 🟠 中：健壮性

- **SSE 解析静默失败会误导排查方向。** `src/api.ts` 与 `server/index.ts` 在解析 SSE 行时用空 `catch {}` 跳过。单行跳过没问题，但当**整个响应都不是 SSE**（有些网关会用 200 返回 JSON 错误体或一整页 HTML）时，每行都被跳过，最终只报"模型没有返回内容"——而真因其实是"地址不对"。建议：把收到的原文摆出来，而不是替用户猜原因。
- **前端首屏全部静默降级。** `fetchModels` / `fetchDaily` / `fetchHistory` 的失败都被 `.catch(() => {})` 吞掉。后端没起时首页只是静默空白，且 `model` 为空会导致后续发消息报出难以理解的错误。
- **`/api/save-env-config` 无鉴权**，任何人可运行时覆盖 API Key。本地自用可接受，若按 README 里的公网地址部署则需加保护。

### 🟡 低：代码细节

- `src/components/HexagramCard.tsx` 的 `methodName()` 里 `case 'najia'` 是**死代码**——`CastResult.method` 永远只会是基础法（`najia` 是通过 `najia: true` 附加的）。结果是纳甲模式下卡片标题显示"三枚铜钱法"，而历史列表却显示"纳甲六爻"，两处不一致。
- `/api/history` 对每条记录都调一次 `isSessionIncomplete`，是 N+1 查询（limit 上限 500）。数据量小时无感，但可优化为一次 JOIN。
- `server/index.ts` 用 `catch {}` 忽略 DB 迁移错误（列已存在时正常），可接受，但静默吞掉所有异常。

---

## 五、亮点（值得保留的设计）

1. **"续答"的三层防重复设计**——前端 `resumeLockRef` 在 `await` 前同步上锁 + 后端 `generating` 内存锁 + 数据库 `isSessionIncomplete` 幂等判定。注释把"为什么必须在这里上锁"写清楚了，这是踩过坑才会有的代码。
2. **起卦结果结构化持久化**到 `session.meta.cast`，续答时无需前端重传即可复现同一卦象。
3. **"未完成"判定基于消息内容而非标志位**，避免陈旧标志导致误判。
4. **前后端类型严格对齐**（`src/types.ts` ↔ `server/divination.ts`），领域模型干净。
5. **领域实现扎实**：纳甲世应表、揲蓍十八变分步明细、灵签 100 签的等级配比，都不是随手糊的。

---

## 六、建议的下一步（可任选）

| 选项 | 内容 | 成本 |
| --- | --- | --- |
| A | 重写 `DEVELOPMENT.md`，使其与实际代码一致 | 小 |
| B | 修掉 6 处类型错误 + 补 `typecheck` 脚本 + 补全 `tsconfig.node.json` | 小 |
| C | 修 SSE / 首屏静默失败，让报错指向真因 | 中 |
| D | 同步更新 README 的过时描述 | 小 |
