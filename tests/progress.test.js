const test = require('node:test');
const assert = require('node:assert/strict');
const { ProgressStore } = require('../miniprogram/utils/progress');

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    data
  };
}

test('新用户从第一步开始', () => {
  const store = new ProgressStore(memoryStorage(), 'parent-a');
  assert.deepEqual(store.read(), { lessonId: 'europe-01', step: 0, completed: false });
});

test('保存后可以继续第二步', () => {
  const storage = memoryStorage();
  new ProgressStore(storage, 'parent-a').saveStep(1);
  assert.equal(new ProgressStore(storage, 'parent-a').read().step, 1);
});

test('完成状态可以持久保存', () => {
  const storage = memoryStorage();
  new ProgressStore(storage, 'parent-a').complete();
  assert.deepEqual(new ProgressStore(storage, 'parent-a').read(), {
    lessonId: 'europe-01', step: 1, completed: true
  });
});

test('两个学习者使用不同存储键', () => {
  const storage = memoryStorage();
  new ProgressStore(storage, 'parent-a').complete();
  assert.equal(new ProgressStore(storage, 'parent-b').read().completed, false);
});

test('重看不会撤销已完成状态', () => {
  const storage = memoryStorage();
  const store = new ProgressStore(storage, 'parent-a');
  store.complete();
  store.saveStep(0);
  assert.deepEqual(store.read(), { lessonId: 'europe-01', step: 0, completed: true });
});

test('非法步骤会被拒绝', () => {
  const store = new ProgressStore(memoryStorage(), 'parent-a');
  assert.throws(() => store.saveStep(2), /步骤超出范围/);
});

test('空学习者标识会被拒绝', () => {
  assert.throws(() => new ProgressStore(memoryStorage(), '  '), /学习者标识/);
});

test('损坏记录不让页面崩溃', () => {
  const storage = memoryStorage({ 'travel-mini:v1:parent-a': '{broken' });
  const store = new ProgressStore(storage, 'parent-a');
  assert.equal(store.read().completed, false);
  assert.ok(store.warning);
});

test('写入失败时不返回成功', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const store = new ProgressStore(storage, 'parent-a');
  assert.throws(() => store.complete(), /quota/);
});
