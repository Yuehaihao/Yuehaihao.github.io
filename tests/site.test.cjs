const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const scripts = html => [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
const key = 'yeuhub_fitness_records_v1';

// Exercise the inline application with storage and control stubs; no browser required.
function app(file = 'fitness/index.html', records = []) {
  const data = new Map([[key, JSON.stringify(records)]]);
  const nodes = new Map();
  const alerts = [];
  const state = { confirmed: false, failWrite: false };
  const document = {
    activeElement: null,
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById(id) {
      if (['audioWave', 'emailTiltWrap', 'heroDot', 'heroPupil'].includes(id)) return null;
      if (!nodes.has(id)) nodes.set(id, {
        value: '', textContent: '', innerHTML: '', hidden: true,
        style: { setProperty() {} },
        classList: { add() {}, remove() {} },
        events: {},
        addEventListener(type, handler) { this.events[type] = handler; },
        focus() { document.activeElement = this; },
        select() {},
      });
      return nodes.get(id);
    },
  };
  const sandbox = {
    document,
    localStorage: {
      getItem: item => data.get(item) ?? null,
      setItem(item, value) {
        if (state.failWrite) throw new Error('Storage quota exceeded');
        data.set(item, value);
      },
      removeItem: item => data.delete(item),
    },
    alert: message => alerts.push(message),
    confirm: () => state.confirmed,
    addEventListener() {},
    setTimeout() { return 1; },
    clearTimeout() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  let code = scripts(read(file)).join('\n');
  if (file.startsWith('fitness/')) {
    code = code.replace(/\}\)\(\);\s*$/, `globalThis.api = {
      parseExercises, totalSets, totalMinutes, exerciseMeta, dateKey, parseDate,
      currentStreak, buildInsight, saveTraining, deleteRecord, getRecords,
      openImageConfirm, closeImageConfirm
    }; })();`);
  }
  vm.runInContext(code, sandbox);
  return { ...sandbox.api, data, state, alerts, document, node: id => document.getElementById(id) };
}

test('homepage exposes existing tools; all active pages have valid script syntax and local links', () => {
  const homepage = read('index.html');
  for (const route of ['email-check', 'country-query', 'industry-keyword', 'fitness']) {
    assert.ok(homepage.includes(`href="${route}/index.html"`), route);
  }
  assert.match(homepage, /<h1\b/);
  for (const file of ['index.html', 'fitness/index.html', 'email-check/index.html', 'country-query/index.html', 'industry-keyword/index.html']) {
    const html = read(file);
    scripts(html).forEach(script => new vm.Script(script, { filename: file }));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `duplicate IDs in ${file}`);
    for (const [, link] of html.matchAll(/\b(?:href|src)="([^"<>]*)"/g)) {
      if (!link || /^(?:[a-z]+:|\/\/|#)/i.test(link) || link.includes("'")) continue;
      const target = link.split(/[?#]/)[0];
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), decodeURIComponent(target))), `${file}: ${link}`);
    }
  }
  assert.ok(read('fitness/index.html').indexOf('id="record-training"') < read('fitness/index.html').indexOf('id="heatmapGrid"'));
});

test('homepage still starts locked and rejects an incorrect password', () => {
  const a = app('index.html');
  assert.equal(a.node('gateLocked').hidden, false);
  assert.equal(a.node('gateOpen').hidden, true);
  a.node('gateInput').value = 'deliberately-wrong-regression-fixture';
  a.node('gateForm').events.submit({ preventDefault() {} });
  assert.equal(a.node('gateError').hidden, false);
  assert.equal(a.node('gateOpen').hidden, true);
  assert.equal(a.data.has('yeuhub_gate_unlock_ts'), false);
});

test('accepts common set/rep formats and decimal weights without changing units', () => {
  const a = app();
  for (const input of ['卧推 4x10 60.5kg', '卧推 60.5kg 4×10', '卧推 4组10次 60.5公斤', '卧推 4组×10次 60.5kg']) {
    const [exercise] = a.parseExercises(input);
    assert.deepEqual([exercise.sets, exercise.reps, exercise.weight], [4, 10, 60.5], input);
  }
  const [single] = a.parseExercises('卧推 60kg×8');
  assert.equal(single.sets, 1);
  assert.equal(single.series[0].reps, 8);
  assert.match(a.exerciseMeta(single), /1 组/);
  assert.equal(a.parseExercises('侧平举 4组')[0].sets, 4);
  assert.equal(a.totalMinutes(a.parseExercises('跑步 1.5分钟\n拉伸 10min')), 11.5);
});

test('preserves individual weight series and grouped drop sets', () => {
  const a = app();
  const [series] = a.parseExercises('卧推 60kg×8，55kg×10');
  assert.equal(series.sets, 2);
  const [drops] = a.parseExercises('侧平举 递减组 10kg×8 8kg×10 | 10kg×8 6kg×12');
  assert.equal(drops.sets, 2);
  assert.equal(drops.dropGroups.length, 2);
  assert.equal(drops.dropGroups[1][1].weight, 6);
});

test('recognizes common accessory exercises without confusing leg and biceps curls', () => {
  const a = app();
  for (const [name, group] of [['高位下拉', '背部'], ['腿弯举', '后链'], ['哑铃弯举', '二头'], ['绳索下压', '三头'], ['保加利亚分腿蹲', '下肢']]) {
    assert.equal(a.parseExercises(`${name} 3x12`)[0].group, group);
  }
});

test('current streak ends at today or yesterday and does not reuse an old longest streak', () => {
  const a = app();
  const records = days => days.map(day => ({ date: `2026-09-${String(day).padStart(2, '0')}` }));
  assert.equal(a.currentStreak(records([1, 2, 3, 4, 5, 9]), a.parseDate('2026-09-10')), 1);
  assert.equal(a.currentStreak(records([8, 9, 10, 10]), a.parseDate('2026-09-10')), 3);
  assert.equal(a.currentStreak(records([1, 2, 3, 4, 5]), a.parseDate('2026-09-10')), 0);
});

test('reading old records and appending a workout retains the same storage and original records', () => {
  const old = { id: 'legacy', date: '2026-08-24', raw: '卧推 3x8 60kg', feeling: '不错', exercises: [{ name: '卧推', group: '胸部', sets: 3, reps: 8, weight: 60, minutes: 0 }], images: [], createdAt: '2026-08-24T12:00:00.000Z' };
  const a = app('fitness/index.html', [old]);
  a.node('trainingDate').value = '2026-08-25';
  a.node('trainingInput').value = '高位下拉 3组10次 40kg';
  a.saveTraining();
  const saved = JSON.parse(a.data.get(key));
  assert.equal(saved.length, 2);
  assert.deepEqual(saved[0], old);
  assert.equal(saved[1].exercises[0].sets, 3);
  assert.equal(a.data.has('yeuhub_fitness_avatar_session_v1'), false, 'backfilling must not start a current workout');
});

test('future/invalid dates and storage failures preserve the unsaved workout', () => {
  const a = app();
  a.node('trainingInput').value = '卧推 3x8 60kg';
  for (const date of ['2099-01-01', '2026-02-30', '']) {
    a.node('trainingDate').value = date;
    a.saveTraining();
    assert.equal(JSON.parse(a.data.get(key)).length, 0);
    assert.equal(a.node('trainingInput').value, '卧推 3x8 60kg');
  }
  a.node('trainingDate').value = '2026-08-25';
  a.state.failWrite = true;
  a.saveTraining();
  assert.equal(JSON.parse(a.data.get(key)).length, 0);
  assert.equal(a.node('trainingInput').value, '卧推 3x8 60kg');
});

test('deletion requires confirmation and retains data on storage failure', () => {
  const a = app('fitness/index.html', [{ id: 'keep', date: '2026-08-24', exercises: [] }]);
  a.deleteRecord('keep');
  assert.equal(JSON.parse(a.data.get(key)).length, 1);
  a.state.confirmed = true;
  a.state.failWrite = true;
  a.deleteRecord('keep');
  assert.equal(JSON.parse(a.data.get(key)).length, 1);
  a.state.failWrite = false;
  a.deleteRecord('keep');
  assert.equal(JSON.parse(a.data.get(key)).length, 0);
});

test('image confirmation supports keyboard escape, focus return and tab wrapping', () => {
  const a = app();
  a.node('imageDropzone').focus();
  a.openImageConfirm('');
  const handler = a.node('imageConfirmModal').events.keydown;
  handler({ key: 'Tab', shiftKey: true, preventDefault() {} });
  assert.equal(a.document.activeElement, a.node('cancelImageParseBtn'));
  handler({ key: 'Tab', shiftKey: false, preventDefault() {} });
  assert.equal(a.document.activeElement, a.node('imageParsedInput'));
  handler({ key: 'Escape', preventDefault() {} });
  assert.equal(a.node('imageConfirmModal').hidden, true);
  assert.equal(a.document.activeElement, a.node('imageDropzone'));
});
