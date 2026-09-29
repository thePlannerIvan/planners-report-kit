# Planners Report Kit

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-2563eb)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](https://nodejs.org)
[![Offline](https://img.shields.io/badge/report-single--file%20offline-0f766e)](scripts/validate-report.mjs)
[![Runtime](https://img.shields.io/badge/runtime-plain%20Node-6b7280)](references/architecture.md)

报告呈现的公共管线：把一份 HTML 骨架 + 本报告自己的样式与内容装配成**单文件离线报告**，注入唯一来源的署名水印，并在写盘前挡住未解析的占位符与外部依赖。

> 作者：阿祖不看 TVC（小红书同名）· [demyth.info](https://demyth.info) · [Lawyif@163.com](mailto:Lawyif@163.com)

## 它解决什么

两家（`planners-quali-box` 与 `planners-quanti-box`）各自实现过一遍同样的事：读骨架、填占位、注入水印、写单文件、检查没有外部依赖。

各自实现带来过一个真实的教训 —— **同一个水印字符串被两个 Skill 各硬编码一次，其中一份写错，而校验器与渲染器同时断言那个错串，于是每跑一次就自洽通过一次**。

所以：**装配管线归公共件，报告的名字与视觉归各报告。**

## 核心工作流

| 公共（本模组） | 各报告自带 |
|---|---|
| 装配管线：骨架 + 样式 + 内容 → 单文件 | **骨架**（每个报告的页面结构与视觉隐喻） |
| 占位符解析与「未解析就不写盘」 | **样式**（quali 的八种方法视觉不可互换；quanti 的图表） |
| **署名水印的唯一来源**（`contracts/attribution.json`） | 报告自己的名字、栏目、图表 |
| 离线契约校验：单文件、无外部依赖、无水印不放行、`--require` 的必需标记 | 各报告自己要额外要求的标记（如 `id="answer"`、`nav-toggle`） |

**装配**：

```bash
node scripts/render-report.mjs \
  --frame "<报告骨架.html>" \
  --style "<本报告的样式.css>" \
  --content "<本报告的内容片段.html>" \
  --placeholders "<占位符表.json>" \
  --out "<report.html>"
```

管线做四件事：`{{REPORT_STYLE}}` / `{{REPORT_CONTENT}}` 换成对应文件内容；`--placeholders` 替换其余 `{{KEY}}`；注入署名水印（默认读 `contracts/attribution.json`，可用 `--watermark` 覆盖，fork 时改那里）；**交付前查** —— 还有未解析的 `{{...}}` 就**不写盘**并报错。

**校验**：

```bash
node scripts/validate-report.mjs "<report.html>" --require 'id="answer"' --require 'nav-toggle'
```

它挡的是**在任何报告里都算坏**的东西：外部脚本 / 样式 / 字体、未解析的占位符、缺署名水印、缺打印样式、以及 `--require` 点名的标记。它**不评价**报告写得好不好 —— 那是人的事。

## 适合 / 不适合

适合：

- 报告要交付**单文件、离线可开**（客户现场没有网络也能看）；
- 多份报告共享同一套装配与验收口径；
- 需要一个机器能判的「没装配好就不许写盘」的门。

不适合：

- 想让它生成内容、写判断或选图表类型 —— 那是各报告自己的事；
- 想让它定义报告骨架 —— 骨架是各报告的视觉身份，本模组只要求它有 `{{REPORT_CONTENT}}` 这个落点；
- 需要在线依赖（CDN 字体、外部图表库）—— 校验器会把它们判为不合规，这是有意为之。

## 安装

通用 Skills CLI：

```bash
npx skills add https://github.com/thePlannerIvan/planners-report-kit --skill planners-report-kit
```

也可直接放入 Codex 或 Claude 的 Skill 目录：

```bash
git clone https://github.com/thePlannerIvan/planners-report-kit.git ~/.codex/skills/planners-report-kit
# 或
git clone https://github.com/thePlannerIvan/planners-report-kit.git ~/.claude/skills/planners-report-kit
```

环境要求：**Node.js 20+**，零第三方依赖。**不依赖 DSH** —— 普通 CLI，任何 runtime 都能跑。

```bash
node evals/run.mjs   # 装配 + 离线契约；条数由 runner 自己数并打印
```

## 典型 prompt

本模组**被 `planners-quali-box` 与 `planners-quanti-box` 调用，不由用户直接触发**。只有一种情况直接用它：

```text
我手上已经有一份报告骨架与内容片段，想按同一套契约装配并校验成单文件离线报告。
```

## 目录结构

```text
planners-report-kit/
├── SKILL.md
├── GOTCHAS.md
├── contracts/
│   └── attribution.json                # 署名水印的唯一来源（作者、站点、邮箱也在这里）
├── scripts/
│   ├── render-report.mjs               # 装配管线
│   └── validate-report.mjs             # 离线契约校验（唯一入口）
├── evals/
│   └── run.mjs                         # 装配与校验的回归（含坏样例）
└── references/
    └── architecture.md                 # module 表、缝、与两份消费方的边界
```

## 品牌与署名边界

本模组是**署名水印的唯一来源** —— 水印默认来自 `contracts/attribution.json`。这不等同于允许把品牌写进任意交付物：水印出现在**报告页面**里，是用户可读的产品事实；Skill 文档与开发者工作面上的来源信息不默认进入最终客户交付物。

`Planners Report Kit` 与 `阿祖不看 TVC` 用于标识本项目及其来源。开源许可证授予代码使用权，不自动授予项目名或作者名的商标使用权。修改版请标注 fork，不要暗示作者背书。详见 [TRADEMARK.md](TRADEMARK.md)。

## 开源协议和商业入口

本项目以 **AGPL-3.0** 发布 —— 可以商业使用；修改版与通过网络提供的服务需公开对应源码。若需要闭源授权、私有部署、企业报告模板适配或私有增强模块：

- Email：`Lawyif@163.com`
- Website：[demyth.info](https://demyth.info)

详见 [COMMERCIAL.md](COMMERCIAL.md) · 归属声明见 [NOTICE](NOTICE)。

## 相关项目

- [Planners Review Core](https://github.com/thePlannerIvan/planners-review-core) —— 人工审阅的公共接缝
- [Planners Source Index](https://github.com/thePlannerIvan/planners-source-index) —— 来源索引的公共契约
