const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('小程序工程入口和页面文件齐全', () => {
  for (const relative of [
    'project.config.json',
    'miniprogram/app.js',
    'miniprogram/app.json',
    'miniprogram/app.wxss',
    'miniprogram/pages/index/index.js',
    'miniprogram/pages/index/index.json',
    'miniprogram/pages/index/index.wxml',
    'miniprogram/pages/index/index.wxss',
    'miniprogram/assets/world-nasa.jpg'
  ]) {
    assert.ok(fs.existsSync(path.join(root, relative)), `缺少 ${relative}`);
  }
});

test('所有 JSON 文件都能解析', () => {
  const files = [
    'project.config.json', 'project.private.config.json', 'package.json',
    'miniprogram/app.json', 'miniprogram/sitemap.json',
    'miniprogram/pages/index/index.json', 'miniprogram/assets/source.json'
  ];
  files.forEach(file => assert.doesNotThrow(() => JSON.parse(read(file)), file));
});

test('WXML 绑定的事件都在页面脚本中实现', () => {
  const wxml = read('miniprogram/pages/index/index.wxml');
  const script = read('miniprogram/pages/index/index.js');
  const handlers = [...wxml.matchAll(/(?:bindtap|catchtap)="([A-Za-z0-9_]+)"/g)].map(match => match[1]);
  for (const handler of new Set(handlers)) {
    assert.match(script, new RegExp(`\\n\\s{2}${handler}\\s*\\(`), `缺少事件函数 ${handler}`);
  }
});

test('页面不依赖远程图片或网页套壳', () => {
  const wxml = read('miniprogram/pages/index/index.wxml');
  assert.doesNotMatch(wxml, /https?:\/\//);
  assert.doesNotMatch(wxml, /<web-view\b/);
  assert.match(wxml, /\/assets\/world-nasa\.jpg/);
});
