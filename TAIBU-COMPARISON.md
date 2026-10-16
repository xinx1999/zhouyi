# taibu（太卜）vs zhouyi（周易算）· 对比分析

- **对比时间**：2026-10-16
- **taibu 版本**：`master` 分支浅克隆快照（最近推送 2026-10-14），641 stars / 129 forks
- **数据来源**：实际 clone 后统计代码与结构，非凭印象

---

## 一句话结论

**两个项目做的是同一件事的两个层次：zhouyi 是「一个应用」，taibu 是「一个平台」。**

领域思想上两者高度一致（都坚持"卦象必须由程序算，模型不得自己起卦"），但**工程化和领域深度差了一个量级**——taibu 有 204 个测试文件和完整 CI，zhouyi 是 0。不过 zhouyi 也有自己的优势：**部署极简、无外部服务依赖**。

---

## 一、两个项目分别是什么

| | **zhouyi（周易算）** | **taibu（太卜）** |
| --- | --- | --- |
| 定位 | 单一体验：《周易》占卜 | 命理工具箱：15+ 术数体系 |
| 覆盖 | 周易（9 种起卦法）+ 灵签 + 每日一卦 | 八字、紫微斗数、六爻、梅花易数、奇门遁甲、大六壬、小六壬、太乙、塔罗、西方占星、黄历、合盘、面相手相、MBTI、周公解梦 |
| 形态 | Web 应用 | Web + iOS/Android + **MCP Server** + **npm SDK** + **Agent Skill** |
| 线上 | 静态托管地址 | mingai.fun · mcp.mingai.fun |
| 许可 | MIT | 根目录 **AGPL-3.0-only**（三个包 MIT，见第六节） |

---

## 二、量化对比

| 指标 | zhouyi | taibu | 倍数 |
| --- | --- | --- | --- |
| TS/TSX 代码行 | **5,927** | **30,921** | 5.2× |
| 核心算法行 | 966（`divination.ts` 单文件） | 22,066（`packages/core`，16 个 domain） | 22.8× |
| 测试文件 | **0** | **204** | — |
| CI workflow | **0** | 3（`quality.yml` 跑 `pnpm verify`，30 分钟全层验收） | — |
| typecheck 脚本 | 无（6 处错误潜伏） | `pnpm typecheck` | — |
| lint | 无 | eslint + **架构守卫**（`lint:guards`） | — |
| 依赖服务 | Node + SQLite（零外部服务） | Supabase(PostgreSQL) + Redis + Docker | — |
| 构建产物 | 218 KB JS | Next.js 全栈 | — |

---

## 三、架构对比

### zhouyi

```
Vite SPA (React 18)  ──/api──▶  Express 单体  ──▶  Agnes AI
                                    │
                                SQLite 单文件
```

单仓、前后端分离、**零外部服务依赖**——拷走 `dist/` + 一个 Node 进程就能跑。

### taibu

```
Next.js 16 (App Router, React 19)
   ├── src/app/{bazi,ziwei,liuyao,meihua,qimen,...}   # 每个术数一个路由
   ├── packages/core         # 纯计算引擎（MIT，发布为 npm taibu-core）
   ├── packages/mcp          # MCP 协议封装（MIT）
   ├── packages/mcp-server   # MCP 服务端（MIT）
   ├── supabase/             # 数据库 schema
   ├── skills/taibu-divination  # Agent Skill（把 core 打包成零依赖 bundle）
   ├── android/ ios/         # Capacitor 移动端
   └── docker-compose*.yml   # 4 种部署形态
```

**关键差异**：taibu 把**计算引擎抽成了独立可发布的包**（`taibu-core`），Web / MCP / Skill 都只是它的消费者。zhouyi 的引擎和 Web 应用耦合在一个仓库里，无法单独复用。

---

## 四、领域实现对比（重点）

### 4.1 代码组织

| | zhouyi | taibu |
| --- | --- | --- |
| 组织方式 | `divination.ts` 单文件 966 行，塞下 9 种起卦法 + 纳甲 + 每日数据 + prompt 生成 | 每 domain 一个目录，统一四件套：`calculate.ts`（算法）/ `json.ts`（结构化）/ `text.ts`（规范文本）/ `types.ts`（类型） |
| 六爻 | 纳甲排盘（宫属/世应/干支/六亲/六神） | **2,522 行**：另含用神/原神/伏神/仇神、空亡、旺衰、刑冲合害、互卦/错卦/综卦、应期推测 |
| 梅花 | 起卦 + 本卦/之卦/动爻/过程说明 | **1,237 行**：另含互卦/错卦/综卦、体用、体用生克、月令旺衰（旺相休囚死）、阶段推演、应期线索、定性吉凶 |
| 输出形态 | `CastResult`（结构化）+ 一段 prompt 文本 | 结构化 **+** 规范 Markdown 证据文本 **+** 独立的解读方法论文件 |

### 4.2 最有价值的一个差异：证据与解读分离

**zhouyi 的做法**——`hexagramToPrompt()` 把两件事混在一段文本里：

```
【本次卦象已经由系统为你起卦，请严格依据以下卦象解读…】
本卦：第11卦 地天泰（上地下天）
六爻（自下而上）：…
请严格依据上述卦象，依次给出：① 本卦卦辞…② 爻辞…③ 之卦…④ 指引…⑤ 「## 总结」
        ↑ 卦象"证据"                    ↑ 作答"要求"
```

**taibu 的做法**——拆成两层：

- `text.ts` → 只输出**纯证据**的规范 Markdown（`# 梅花易数主证据 / ## 起卦与环境 / ## 卦象演变 / ## 体用主轴 / ## 阶段推演`），并按 `detailLevel` 控制详略；
- `interpretation/liuyao.md`、`interpretation/meihua.md` → 单独的**解读方法论**（该体系的专家角色、流派技法、分析框架），供模型按需加载。

> **这是 zhouyi 最值得借鉴的一点**：证据是"事实"，解读指引是"方法"。混在一起会导致改解读风格时容易碰到证据生成逻辑。

### 4.3 领域思想的共同点（说明方向没错）

两个项目**独立地做出了同一个核心决策**：

| 项目 | 原文 |
| --- | --- |
| taibu | 「盘面必须由工具计算，不可凭记忆推算干支、卦象、星曜」 |
| zhouyi | 「严格依据所提供的卦象进行解读，**不得另起一卦**」 |

这印证了 zhouyi 的架构方向是对的——**把确定性交给代码，把解释权交给模型**。

---

## 五、工程化对比（最大差距）

| 维度 | zhouyi | taibu |
| --- | --- | --- |
| 单元/路由/协议测试 | 无 | 204 个测试文件（`src/tests` 140 + `core/tests` 33 + `scripts/tests` 23 …） |
| CI 门禁 | 无 | `quality.yml`：PR 与 master 推送触发，`pnpm verify` 一次构建跑完 SQL、真实 Auth/REST、浏览器层，30 分钟超时 |
| 类型检查 | 无脚本；实测潜伏 6 处错误 | `pnpm typecheck`（先构建包再全量 tsc） |
| Lint | 无 | eslint + **自定义架构守卫** `scripts/check-architecture-guards.mjs` |
| 发布流程 | 无 | `publish-github-packages.yml` 自动发 `taibu-core` / `taibu-mcp` |
| 包边界 | 无 | pnpm workspace，core 可独立 `npm install taibu-core` 使用 |

> 呼应上一轮对 zhouyi 的体检结论：**zhouyi 缺的正是这一整层**。taibu 的做法（`typecheck` + `lint:guards` + `verify`）可以直接作为补齐时的参照。

---

## 六、License 与可复用性（最关键的一节）

taibu 采用**混合许可**，边界必须分清：

| 路径 | 许可 | 能否用于闭源/商用 |
| --- | --- | --- |
| `packages/core` | **MIT** | ✅ 可以，保留版权声明即可 |
| `packages/mcp` | **MIT** | ✅ 可以 |
| `packages/mcp-server` | **MIT** | ✅ 可以 |
| 其余（Web、服务端、部署、运行时代码） | **AGPL-3.0-only** | ⚠️ 商用不禁止，但**对外提供网络服务时必须开源全部修改** |

**实务结论**：

1. ✅ **可以** `npm install taibu-core`（MIT）直接复用它的 16 种排盘引擎——这是合法且推荐的做法。
2. ❌ **不要**把 taibu 的 `src/`（Next.js 页面、API 路由）或服务端代码复制进 zhouyi——那部分是 AGPL，会给 zhouyi 带来传染性开源义务。
3. ℹ️ AGPL 的传染范围是"基于它修改/衍生的作品"，**独立调用 MIT 包不受影响**（npm 依赖属于正常使用）。

---

## 七、各自的长处

### zhouyi 的优势（不要盲目对标丢掉）

- **部署极简**：一个 Node 进程 + 一个 SQLite 文件，零外部服务。taibu 需要 Supabase + Redis + Docker。
- **可自持**：不依赖任何第三方托管服务，适合私有化/离线场景。
- **代码可读**：5,927 行，一个人能通读；taibu 的 30,921 行需要专门投入才能掌握。
- **起卦引擎已实测正确**：64 卦覆盖、文王卦序、纳甲、铜钱概率分布全部通过验证。
- **续答（resume）三层防重复设计**是 zhouyi 独有的巧思，taibu 未必有此机制。

### taibu 的优势

- 领域深度：把每个术数都做到了"完整断卦流程"，而非只到"起卦"。
- 工程化：测试/CI/类型检查/lint 齐全，可持续演进。
- 可复用：引擎抽包发布，Web/MCP/Skill 多形态消费。
- 分发渠道：MCP Server 让它在 AI Agent 生态里可直接被调用。
- 多端：Capacitor 打包 iOS/Android。

---

## 八、对 zhouyi 的具体建议

| 选项 | 内容 | 说明 |
| --- | --- | --- |
| **A** | 装 `taibu-core`（MIT），给 zhouyi 加八字/紫微/奇门等新体系 | 最快见效，零 License 风险 |
| **B** | 借鉴"证据与解读分离"重构 `hexagramToPrompt` + `prompt.ts` | 纯思路借鉴，不涉及代码复制，无 License 问题 |
| **C** | 参照 taibu 补齐 zhouyi 的工程化（typecheck + lint + test + CI） | 即上一轮体检的 B 项，现在有了参照实现 |
| **D** | 借鉴它的 domain 四件套结构，拆分 `divination.ts`（966 行单文件） | 纯重构，不改行为 |
| **E** | 把 zhouyi 的起卦引擎也抽成独立包（对标 `taibu-core`） | 中长期，为复用铺路 |

> **不建议**：直接复制 taibu 的 Web/服务端代码——那部分是 AGPL-3.0-only。
