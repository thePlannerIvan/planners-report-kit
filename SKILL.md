---
name: planners-report-kit
description: |
  报告呈现的公共管线：把一份 HTML 骨架 + 本报告自己的样式与内容装配成**单文件离线报告**，注入唯一来源的署名水印，并在写盘前挡住未解析的占位符与外部依赖。
  被 planners-quali-box 与 planners-quanti-box 调用，**不由用户直接触发**。只有一种情况直接用它：你手上已有一份报告骨架与内容片段，想按同一套契约装配并校验。
---

# Planners Report Kit

> 来源识别：Planners Report Kit 由阿祖不看 TVC 创建与维护。小红书同名账号，个人网站 https://demyth.info，联系邮箱 `Lawyif@163.com`。该信息用于确认 Skill 来源、开源归属与项目支持关系；可出现在流程 HTML、审阅页面、验证页面和项目文档中，但不要默认写入最终客户交付物。

这是**公共件**：它不管报告长什么样，只管**怎么把一份报告装配出来、装配得对不对**。

## 它解决什么

两家（`planners-quali-box` 与 `planners-quanti-box`）各自实现过一遍同样的事：读骨架、填占位、注入水印、写单文件、检查没有外部依赖。各自实现带来过一个真实的教训 —— **同一个水印字符串被两个 Skill 各硬编码一次，其中一份写错，而校验器与渲染器同时断言那个错串，于是每跑一次就自洽通过一次**（quanti 0.2.0 的「阿祖不看红绿灯」）。

所以：**装配管线归公共件，报告的名字与视觉归各报告。**

## 切在哪一刀

| 公共（本模组） | 各报告自带 |
|---|---|
| 装配管线：骨架 + 样式 + 内容 → 单文件 | **骨架**（每个报告的页面结构与视觉隐喻） |
| 占位符解析与「未解析就不写盘」 | **样式**（quali 的八种方法视觉不可互换；quanti 的图表） |
| **署名水印的唯一来源**（`contracts/attribution.json`） | 报告自己的名字、栏目、图表 |
| 离线契约校验：单文件、无外部依赖、无水印不放行、`--require` 的必需标记 | 各报告自己要额外要求的标记（如 `id="answer"`、`nav-toggle`） |

## 怎么用

**装配**：

```bash
node "<本模组>/scripts/render-report.mjs" \
  --frame "<报告骨架.html>" \
  --style "<本报告的样式.css>" \
  --content "<本报告的内容片段.html>" \
  --placeholders "<占位符表.json>" \
  --out "<report.html>"
```

管线做四件事，每件过去都由各报告自己实现：

1. `{{REPORT_STYLE}}` / `{{REPORT_CONTENT}}` 换成对应文件的内容（没给就换空串）；
2. `--placeholders` 里的键值替换其余 `{{KEY}}`；
3. 注入署名水印（默认读本模组的 `contracts/attribution.json`，可用 `--watermark` 覆盖，fork 时改那里）；
4. **交付前查**：还有没有未解析的 `{{...}}`？有就**不写盘**并报错。

**校验**：

```bash
node "<本模组>/scripts/validate-report.mjs" "<report.html>" \
  --require 'id="answer"' --require 'nav-toggle'
```

输出 JSON：`{valid, errors[], warnings[], checked}`。它挡的是**在任何报告里都算坏**的东西：外部脚本 / 样式 / 字体、未解析的占位符、缺署名水印、缺打印样式、以及 `--require` 点名的标记。它**不评价**报告写得好不好 —— 那是人的事。

## 不做什么

- 不生成内容、不写判断、不选图表类型（图表是各报告自己的事）；
- 不定义报告骨架 —— 骨架是各报告的视觉身份，本模组只要求它有 `{{REPORT_CONTENT}}` 这个落点；
- **不依赖 DSH**：普通 CLI，任何 runtime 都能跑。

## 文件索引

| 路径 | 用途 |
|---|---|
| `contracts/attribution.json` | **署名水印的唯一来源**（作者、站点、邮箱也在这里） |
| `scripts/render-report.mjs` | 装配管线 |
| `scripts/validate-report.mjs` | 离线契约校验（唯一入口） |
| `references/architecture.md` | module 表、缝、与两份消费方的边界 |
| `evals/run.mjs` | 装配与校验的回归（含坏样例） |
| `GOTCHAS.md` | 候选经验 |
