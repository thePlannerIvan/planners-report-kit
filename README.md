# Planners Report Kit

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-2563eb)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](https://nodejs.org)
[![Offline](https://img.shields.io/badge/report-single--file%20offline-0f766e)](scripts/validate-report.mjs)

**离线 HTML 报告的统一装配与交付门：把骨架、样式、内容和署名水印安全打包成“断网也能双击打开”的单文件网页，没拼完绝不出盘。**

> 作者：阿祖不看 TVC（小红书同名）· [demyth.info](https://demyth.info) · [Lawyif@163.com](mailto:Lawyif@163.com)

---

## 一句话看懂：谁在用我、我帮你保证什么

日常使用定性/定量分析 Skill 时，你不需要直接调用本仓库——[`planners-quali-box`](https://github.com/thePlannerIvan/planners-quali-box) 与 [`planners-quanti-box`](https://github.com/thePlannerIvan/planners-quanti-box) 会在最后自动调用它生成可交付报告。

*(注：制作可编辑 `.pptx` 和视频关键帧的是 [`planners-ppt-hell`](https://github.com/thePlannerIvan/planners-ppt-hell)，交互审阅靠 [`planners-review-core`](https://github.com/thePlannerIvan/planners-review-core)，它们都不使用本报告装配包。)*

它只解决一个刚性交付问题——**避免报告带着坏图、漏填占位符或外部 CDN 断链发到客户电脑上**：

```text
报告骨架 HTML  +  专属 CSS 样式  +  报告内容片段  +  字段数据（placeholders）
  └─ render-report.mjs 装配
       ├─ 注入唯一来源的署名水印（contracts/attribution.json）
       ├─ 自动扫描遗漏未填的 {{占位符}} → 没填干净直接报错、不写盘
       └─ 自动拦截外链脚本 / 在线字体 / CDN（除非显式 --allow-external）
  └─ 输出：一份完全独立、支持打印、断网也能直接双击打开的 report.html
```

---

## 什么时候我需要直接安装 / 运行它？

如果你在开发**自己的报告类 Skill 或自定义离线 HTML 研究简报**，不希望每次手写字符串拼接脚本、也不希望重复写一遍打印样式检查与防外链校验，可以直接把本工具当成标准打包出口：

- 你负责提供报告自己的结构骨架（保留 `{{REPORT_STYLE}}` 与 `{{REPORT_CONTENT}}`）、专属视觉 CSS 和真实业务图表/判断内容；
- 本工具负责安全替换占位符、注入统一水印，并在写盘前跑通离线与必需标记校验。

---

## 快速开始与安装

### 安装

```bash
npx skills add https://github.com/thePlannerIvan/planners-report-kit --skill planners-report-kit
```

或克隆至本地 Skill 目录（使用 `planners-quali-box` / `planners-quanti-box` 时会自动拉取，无需手工预先安装）：

```bash
git clone https://github.com/thePlannerIvan/planners-report-kit.git ~/.codex/skills/planners-report-kit
# 或
git clone https://github.com/thePlannerIvan/planners-report-kit.git ~/.claude/skills/planners-report-kit
```

### 自己写 HTML 报告时这样调用

```text
我手上已经有一份报告骨架 HTML、样式 CSS 和内容片段，用 planners-report-kit 把它装配并校验成单文件离线报告。
```

---

<details>
<summary>开发者说明：装配 / 校验 CLI、目录结构与自检命令（普通用户可忽略）</summary>

### 装配与校验命令

```bash
# 1. 装配单文件离线报告（有未解析占位符或违规外链会阻止写盘）
node scripts/render-report.mjs \
  --frame "<报告骨架.html>" \
  --style "<本报告样式.css>" \
  --content "<内容片段.html>" \
  --placeholders "<占位符表.json>" \
  --out "<report.html>"

# 2. 对已有 HTML 报告跑离线契约与定制标记校验
node scripts/validate-report.mjs "<report.html>" --require 'id="answer"' --require 'nav-toggle'

# 3. 运行内置回归测试
node evals/run.mjs
```

- 默认水印来自 `contracts/attribution.json`，支持通过 `--watermark` 覆盖（fork 二开时修改该 JSON 即可）。
- `validate-report.mjs` 默认拒绝外部 `<script src>` / `<link>` / 字体引用；仅明确用于联网场景时才可显式传 `--allow-external`。
- 环境要求：Node.js 20+，零第三方依赖，不依赖 DSH。

### 目录结构

```text
planners-report-kit/
├── SKILL.md
├── GOTCHAS.md
├── contracts/
│   └── attribution.json                # 署名水印唯一配置源
├── scripts/
│   ├── render-report.mjs               # 单文件装配管线
│   └── validate-report.mjs             # 离线安全与完整性校验器
├── evals/
│   └── run.mjs                         # 装配与校验回归测试
└── references/
    └── architecture.md                 # 与 Quali-Box / Quanti-Box 的边界说明
```

</details>

---

## 品牌边界、开源协议与商业合作

- **许可协议**：以 [AGPL-3.0-only](LICENSE) 开源发布；可商用，修改版或通过网络提供的服务须公开源码。
- **水印与商标**：研究报告页内会保留产品水印（来自 `contracts/attribution.json`），开发者文档信息不默认写入客户报告内容中；商标与 fork 规范见 [TRADEMARK.md](TRADEMARK.md)，归属声明见 [NOTICE](NOTICE)。
- **商业支持**：企业报告模板定制、私有部署或闭源授权，请联系 `Lawyif@163.com` 或访问 [demyth.info](https://demyth.info)，详见 [COMMERCIAL.md](COMMERCIAL.md)。

## 相关项目

- [Planners Quali Box](https://github.com/thePlannerIvan/planners-quali-box) —— 定性研究洞察与报告生成
- [Planners Quanti Box](https://github.com/thePlannerIvan/planners-quanti-box) —— 定量决策统计与报告生成
- [Planners Source Index](https://github.com/thePlannerIvan/planners-source-index) —— 来源登记与盲区核对契约
