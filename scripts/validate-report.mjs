#!/usr/bin/env node
/**
 * 报告的离线契约校验（唯一入口）。
 *
 * 用法：
 *   node validate-report.mjs <report.html> [--require '<marker>']... [--attribution <json>] [--text]
 *
 * 它挡的是**在任何报告里都算坏**的东西：
 *   · 不是单文件：外部脚本 / 样式 / 字体 / @import / url(http\)
 *   · 还有未解析的 {{PLACEHOLDER}}
 *   · 缺署名水印
 *   · 缺打印样式
 *   · --require 点名的必需标记
 * 它**不评价**报告写得好不好 —— 那是人的事。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ATTRIBUTION = resolve(HERE, '..', 'contracts', 'attribution.json');

const errors = [];
const warnings = [];
const err = (code, message) => errors.push({ code, message });
const warn = (code, message) => warnings.push({ code, message });

function parseArgs(argv) {
  const out = { requires: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--require') { out.requires.push(argv[i + 1]); i += 1; continue; }
    if (!key.startsWith('--')) { if (!out.file) out.file = key; continue; }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out[key.slice(2)] = next; i += 1; } else out[key.slice(2)] = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.file) {
  console.error("用法：node validate-report.mjs <report.html> [--require '<marker>'] [--attribution <json>] [--text]");
  process.exit(2);
}
const path = resolve(args.file);
if (!existsSync(path)) { console.error(`找不到报告：${path}`); process.exit(2); }
const html = readFileSync(path, 'utf8');

const external = [
  [/<script[^>]+src\s*=/i, 'external_script', '报告里有外部脚本'],
  [/<link[^>]+rel\s*=\s*["']?stylesheet/i, 'external_stylesheet', '报告里有外部样式表'],
  [/@import\s+(?:url\()?["']?https?:/i, 'css_import', 'CSS 里有外部 @import'],
  [/url\(\s*["']?https?:/i, 'css_url', 'CSS 里有外部 url()'],
  [/<iframe[^>]+src\s*=\s*["']?https?:/i, 'external_iframe', '报告里有外部 iframe'],
];
for (const [pattern, code, message] of external) if (pattern.test(html)) err(code, message);

const unresolved = [...new Set((html.match(/\{\{[A-Z0-9_]+\}\}/g) ?? []))];
if (unresolved.length) err('unresolved_placeholders', `还有未解析的占位符：${unresolved.join(' ')}`);

const attribution = existsSync(resolve(String(args.attribution ?? DEFAULT_ATTRIBUTION)))
  ? JSON.parse(readFileSync(resolve(String(args.attribution ?? DEFAULT_ATTRIBUTION)), 'utf8')) : {};
const watermark = String(args.watermark ?? attribution.watermark ?? '').trim();
const hasWatermark = watermark ? html.includes(watermark) : false;
if (!hasWatermark) err('missing_watermark', `报告里没有署名水印（应包含「${watermark || '（未配置）'}」）`);

if (!/@media\s+print/i.test(html)) err('missing_print_style', '报告没有打印样式（@media print）');

for (const marker of args.requires) {
  if (!html.includes(marker)) err('missing_required_marker', `报告缺少必需标记：${marker}`);
}

if (html.length < 800) warn('suspiciously_small', `报告只有 ${html.length} 字节，可能是空壳`);

const fatal = errors.length > 0;
const payload = { valid: !fatal, errors, warnings, checked: { path, bytes: Buffer.byteLength(html), watermark: hasWatermark, requires: args.requires.length } };
if (args.text) {
  for (const w of warnings) console.log(`WARN  [${w.code}] ${w.message}`);
  for (const e of errors) console.log(`ERROR [${e.code}] ${e.message}`);
  console.log(fatal ? `\n不合规：${errors.length} 个错误、${warnings.length} 个警告` : `\n合规：${warnings.length} 个警告`);
} else {
  console.log(JSON.stringify(payload, null, 2));
}
process.exit(fatal ? 1 : 0);
