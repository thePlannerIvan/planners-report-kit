#!/usr/bin/env node
/**
 * 报告呈现管线与离线契约的回归。
 * 用法：node evals/run.mjs
 *
 * 这里能自动验的是**机械**那一半：占位符不漏、水印不缺、外部依赖拦得住、必需标记在不在。
 * 「这份报告写得好不好」是人的事，不在这里。
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const RENDER = join(ROOT, 'scripts', 'render-report.mjs');
const VALIDATE = join(ROOT, 'scripts', 'validate-report.mjs');
const ATTRIBUTION = JSON.parse(readFileSync(join(ROOT, 'contracts', 'attribution.json'), 'utf8'));
const WATERMARK = ATTRIBUTION.watermark;

let failed = 0;
// 断言条数自己数，不靠文档复述（文档复述过的数字已经漂过）。
let assertions = 0;
const ok = m => { assertions++; console.log(`  ✓ ${m}`); };
const bad = m => { failed++; assertions++; console.log(`  ✗ ${m}`); };
const run = (script, args) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch { /* 非 JSON */ }
  return { code: r.status, out: parsed, stderr: r.stderr };
};
const codes = r => (r.out?.errors || []).map(e => e.code);

const dir = mkdtempSync(join(tmpdir(), 'reportkit-'));
const write = (name, content) => { const p = join(dir, name); writeFileSync(p, content, 'utf8'); return p; };

const FRAME = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>{{TITLE}}</title>
<style>body{font-family:system-ui}.personal-watermark{position:fixed;right:16px;bottom:12px}
@media print{body{background:#fff}}</style><style>{{REPORT_STYLE}}</style></head>
<body><header><h1>{{TITLE}}</h1></header><main>{{REPORT_CONTENT}}</main>
<footer>{{WATERMARK}}</footer></body></html>`;

console.log('报告呈现 · 回归');

const framePath = write('frame.html', FRAME);
const stylePath = write('style.css', '.finding{box-shadow:none}');
const contentPath = write('content.html', '<section id="answer"><h2>先看答案</h2><p>结论。</p></section>');
const mapPath = write('map.json', JSON.stringify({ TITLE: '测试报告' }));

// ---------- 1. 装配 ----------
console.log('\n[装配]');
{
  const out = join(dir, 'good.html');
  const r = run(RENDER, ['--frame', framePath, '--style', stylePath, '--content', contentPath, '--placeholders', mapPath, '--out', out]);
  if (r.code === 0 && existsSync(out)) {
    const html = readFileSync(out, 'utf8');
    const checks = [
      [!/\{\{[A-Z0-9_]+\}\}/.test(html), '没有残留占位符'],
      [html.includes('测试报告'), '占位符表生效'],
      [html.includes('.finding{box-shadow:none}'), '样式注入'],
      [html.includes('id="answer"'), '内容注入'],
      [html.includes(WATERMARK), '水印来自唯一来源'],
    ];
    const bads = checks.filter(([pass]) => !pass).map(([, label]) => label);
    if (!bads.length) ok('骨架 + 样式 + 内容 + 占位符 → 单文件，全项通过');
    else bad(`装配结果不对：${bads.join('、')}`);
  } else bad(`装配失败：exit=${r.code} ${r.stderr}`);
}

// ---------- 2. 未解析占位符：不许写盘 ----------
console.log('\n[未解析占位符]');
{
  const brokenFrame = write('broken-frame.html', FRAME.replace('{{TITLE}}', '{{TYPO_KEY}}'));
  const out = join(dir, 'never-written.html');
  const r = run(RENDER, ['--frame', brokenFrame, '--content', contentPath, '--placeholders', mapPath, '--out', out]);
  if (r.code !== 0 && !existsSync(out) && r.out?.error === 'unresolved_placeholders') {
    ok(`拒绝写盘，并点名了 ${JSON.stringify(r.out.unresolved)}`);
  } else bad(`带未解析占位符却写了盘：exit=${r.code} exists=${existsSync(out)}`);
}

// ---------- 3. 骨架没留水印位：也要补上 ----------
console.log('\n[水印兜底]');
{
  const noSlot = write('no-slot.html', '<!doctype html><html><head><title>{{TITLE}}</title><style>@media print{}</style></head><body>{{REPORT_CONTENT}}</body></html>');
  const out = join(dir, 'no-slot-out.html');
  run(RENDER, ['--frame', noSlot, '--content', contentPath, '--placeholders', mapPath, '--out', out]);
  const html = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (html.includes(WATERMARK)) ok('骨架没留位也补上了水印（不会漏）');
  else bad('骨架没留水印位时漏了水印');
}

// ---------- 4. 离线契约 ----------
console.log('\n[离线契约：必须拦得住]');
const cases = [
  ['外部脚本', h => h.replace('</body>', '<script src="https://cdn.example.com/x.js"></script></body>'), 'external_script'],
  ['外部样式表', h => h.replace('</body>', '<link rel="stylesheet" href="https://cdn.example.com/x.css"></body>'), 'external_stylesheet'],
  ['CSS 里的外部字体', h => h.replace('</style>', '@font-face{src:url(https://fonts.example.com/x.woff2)}</style>', ), 'css_url'],
  ['缺水印', h => h.replace(WATERMARK, '某某人'), 'missing_watermark'],
  ['缺打印样式', h => h.replace(/@media print\{[^}]*\}/, ''), 'missing_print_style'],
  ['未解析占位符', h => h.replace('</body>', '{{LEFTOVER}}</body>'), 'unresolved_placeholders'],
];
{
  const base = readFileSync(join(dir, 'good.html'), 'utf8');
  for (const [label, mutate, expect] of cases) {
    const p = write(`bad-${expect}.html`, mutate(base));
    const r = run(VALIDATE, [p]);
    if (r.code !== 0 && codes(r).includes(expect)) ok(`${label} → ${expect}`);
    else bad(`${label} → 期望 ${expect}，实际 ${JSON.stringify(codes(r))}`);
  }
  const rGood = run(VALIDATE, [join(dir, 'good.html')]);
  if (rGood.code === 0 && rGood.out?.valid) ok('干净报告 → 合规');
  else bad(`干净报告被拦：${JSON.stringify(codes(rGood))}`);

  const rReq = run(VALIDATE, [join(dir, 'good.html'), '--require', 'nav-toggle']);
  if (rReq.code !== 0 && codes(rReq).includes('missing_required_marker')) ok('--require 的必需标记不在 → missing_required_marker');
  else bad(`--require 没生效：${JSON.stringify(codes(rReq))}`);

  const rReq2 = run(VALIDATE, [join(dir, 'good.html'), '--require', 'id="answer"']);
  if (rReq2.code === 0) ok('--require 的标记在 → 放行');
  else bad(`该放行却拦了：${JSON.stringify(codes(rReq2))}`);
}

rmSync(dir, { recursive: true, force: true });
console.log(failed ? `\n${assertions} 条断言，${failed} 条失败` : `\n全部通过（${assertions} 条断言：装配 3 组 + 离线契约 ${assertions - 3} 条）`);
process.exit(failed ? 1 : 0);
