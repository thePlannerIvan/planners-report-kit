#!/usr/bin/env node
/**
 * 报告装配管线（唯一一份）。
 *
 * 用法：
 *   node render-report.mjs --frame <frame.html> --out <report.html>
 *        [--style <style.css>] [--content <content.html>]
 *        [--placeholders <map.json>] [--attribution <attribution.json>]
 *        [--watermark <text>] [--allow-external]
 *
 * 四件事：填 {{REPORT_STYLE}} / {{REPORT_CONTENT}} → 填 {{KEY}} → 注入水印 → 查未解析。
 * **还有未解析的占位符就不写盘** —— 一份带着 {{PLACEHOLDER}} 的报告比没有报告更糟。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ATTRIBUTION = resolve(HERE, '..', 'contracts', 'attribution.json');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out[key.slice(2)] = next; i += 1; } else out[key.slice(2)] = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.frame || !args.out) {
  console.error('用法：node render-report.mjs --frame <frame.html> --out <report.html> [--style <css>] [--content <html>] [--placeholders <json>] [--attribution <json>] [--watermark <text>]');
  process.exit(2);
}

const framePath = resolve(args.frame);
if (!existsSync(framePath)) { console.error(`找不到骨架：${framePath}`); process.exit(2); }
let html = readFileSync(framePath, 'utf8');

const readOptional = (value, label) => {
  if (!value || value === true) return '';
  const p = resolve(value);
  if (!existsSync(p)) { console.error(`找不到${label}：${p}`); process.exit(2); }
  return readFileSync(p, 'utf8');
};

// 1) 样式与内容落点
html = html.replaceAll('{{REPORT_STYLE}}', readOptional(args.style, '样式'));
html = html.replaceAll('{{REPORT_CONTENT}}', readOptional(args.content, '内容'));

// 2) 其余占位符（--placeholders 给文件，--placeholders-json 给内联 JSON —— 调用方不必写临时文件）
const mapSource = args['placeholders-json'] && args['placeholders-json'] !== true
  ? String(args['placeholders-json'])
  : (args.placeholders && args.placeholders !== true ? readFileSync(resolve(args.placeholders), 'utf8') : null);
if (mapSource) {
  const map = JSON.parse(mapSource);
  for (const [key, value] of Object.entries(map)) html = html.replaceAll(`{{${key}}}`, String(value));
}

// 3) 署名水印：唯一来源在本模组的 contracts/attribution.json
const attributionPath = resolve(String(args.attribution ?? DEFAULT_ATTRIBUTION));
const attribution = existsSync(attributionPath) ? JSON.parse(readFileSync(attributionPath, 'utf8')) : {};
const watermark = String(args.watermark ?? attribution.watermark ?? '').trim();
if (watermark) {
  if (html.includes('{{WATERMARK}}')) {
    html = html.replaceAll('{{WATERMARK}}', watermark);
  } else if (!html.includes(watermark)) {
    // 骨架没有留水印位、也没有自己写：补一个固定在页面的水印，保证不会漏
    const tag = `<div class="personal-watermark" aria-label="作者水印" style="position:fixed;right:16px;bottom:12px;z-index:80;font:700 10px/1 ui-monospace,monospace;opacity:.6;pointer-events:none">${watermark}</div>`;
    html = html.includes('</body>') ? html.replace('</body>', `${tag}\n</body>`) : `${html}\n${tag}\n`;
  }
}

// 4) 未解析的占位符：不写盘
const unresolved = [...new Set((html.match(/\{\{[A-Z0-9_]+\}\}/g) ?? []))];
if (unresolved.length) {
  // stdout 永远是 JSON 载荷（与 validate-report.mjs 一致），人读的话在 stderr
  console.log(JSON.stringify({ valid: false, error: 'unresolved_placeholders', unresolved, written: false }, null, 2));
  console.error(`未解析的占位符：${unresolved.join(' ')} —— report.html 未写盘`);
  process.exit(1);
}

const outPath = resolve(args.out);
writeFileSync(outPath, html, 'utf8');
console.log(JSON.stringify({ valid: true, out: outPath, bytes: Buffer.byteLength(html), watermark }, null, 2));
