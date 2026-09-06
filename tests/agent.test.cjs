const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../agent/chat.js'), 'utf8');
const storageKey = 'yeuhub_agent_session_v1';

function agent(options = {}) {
  class Element {
    constructor() { this.value = ''; this.textContent = ''; this.hidden = true; this.children = []; this.events = {}; this.style = {}; this.scrollHeight = 70; this.dataset = {}; }
    addEventListener(type, callback) { this.events[type] = callback; }
    append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
    replaceChildren() { this.children = []; }
    focus() { document.activeElement = this; }
    set innerHTML(value) { throw new Error('Untrusted HTML must never be rendered'); }
  }
  const nodes = new Map();
  const prompts = [new Element()];
  prompts[0].dataset.prompt = '介绍一下海浩';
  const document = {
    hidden: false, events: {},
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); },
    createElement() { return new Element(); },
    querySelectorAll() { return prompts; },
    addEventListener(type, callback) { this.events[type] = callback; },
  };
  const stored = new Map(options.saved ? [[storageKey, JSON.stringify(options.saved)]] : []);
  const state = { remaining: options.locked ? 0 : 100000, confirmed: true, failWrite: false };
  const calls = [];
  const timers = new Map();
  const sandbox = {
    URL, AbortController, TypeError, document,
    location: { href: 'https://yeuhub.me/agent/', replace(url) { this.destination = url; } },
    YeuhubAccess: { remainingMs: () => state.remaining, lock() { state.remaining = 0; } },
    YEUHUB_AGENT_CONFIG: options.ready ? { endpoint: 'https://agent.example.test/chat', knowledgeReady: true } : {},
    sessionStorage: { getItem: key => stored.get(key), setItem(key, value) { if (state.failWrite) throw new Error('quota'); stored.set(key, value); }, removeItem: key => stored.delete(key) },
    confirm: () => state.confirmed,
    events: {}, addEventListener(type, callback) { this.events[type] = callback; },
    setTimeout(callback, delay) { const id = Symbol(); timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    async fetch(url, init) { calls.push({ url, init }); return options.fetch ? options.fetch(url, init) : { ok: true, json: async () => ({ answer: '来自模型服务的回答' }) }; },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox);
  const node = id => document.getElementById(id);
  return { node, state, stored, calls, sandbox, prompts, timers, document,
    async send(text) { node('messageInput').value = text; return node('chatForm').events.submit({ preventDefault() {} }); },
  };
}

test('direct locked visits redirect before showing the chat; expiry also hides it', () => {
  const locked = agent({ locked: true });
  assert.equal(locked.sandbox.location.destination, '../index.html#work');
  assert.equal(locked.node('agentApp').hidden, true);
  assert.equal(locked.calls.length, 0);
  const a = agent();
  assert.equal(a.node('agentApp').hidden, false);
  a.state.remaining = 0;
  a.sandbox.events.storage();
  assert.equal(a.node('agentApp').hidden, true);
  assert.equal(a.sandbox.location.destination, '../index.html#work');
});

test('unconfigured service preserves questions and never fabricates a reply or sends a request', async () => {
  const a = agent();
  a.prompts[0].events.click();
  assert.equal(a.node('messageInput').value, '介绍一下海浩');
  await a.send('可以介绍一下你吗？');
  assert.equal(a.calls.length, 0);
  assert.equal(a.node('messages').children.length, 0);
  assert.equal(a.node('messageInput').value, '可以介绍一下你吗？');
  assert.match(a.node('feedbackText').textContent, /尚未接入/);
});

test('configured chat sends history and renders actual answers and sources as safe text', async () => {
  const a = agent({ ready: true, fetch: async () => ({ ok: true, json: async () => ({ answer: '<img src=x onerror=alert(1)>', sources: [{ title: '<script>bad</script>', url: 'javascript:alert(1)' }, { title: '资料', url: 'https://example.test/info' }] }) }) });
  await a.send('你好');
  assert.equal(a.calls.length, 1);
  assert.equal(a.calls[0].init.credentials, 'omit');
  assert.deepEqual(JSON.parse(a.calls[0].init.body).messages, [{ role: 'user', content: '你好' }]);
  const reply = a.node('messages').children[1];
  assert.equal(reply.children[1].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(reply.children[2].children[0].href, undefined);
  assert.equal(reply.children[2].children[1].href, 'https://example.test/info');
  assert.equal(JSON.parse(a.stored.get(storageKey)).messages.length, 2);
  await a.send('继续');
  assert.equal(JSON.parse(a.calls[1].init.body).messages.length, 3);
});

test('service errors and invalid responses preserve draft; retry does not duplicate user messages', async () => {
  let failure = true;
  const a = agent({ ready: true, fetch: async () => failure ? { ok: false, status: 429 } : { ok: true, json: async () => ({ answer: '恢复正常' }) } });
  await a.send('我的问题');
  assert.equal(a.node('messageInput').value, '我的问题');
  assert.equal(a.node('messages').children.length, 0);
  assert.equal(a.node('retryButton').hidden, false);
  assert.match(a.node('feedbackText').textContent, /频繁/);
  failure = false;
  await a.node('retryButton').events.click();
  assert.equal(a.node('messages').children.length, 2);
  assert.equal(JSON.parse(a.calls[1].init.body).messages.length, 1);
  const invalid = agent({ ready: true, fetch: async () => ({ ok: true, json: async () => ({ answer: '' }) }) });
  await invalid.send('问题');
  assert.equal(invalid.node('messageInput').value, '问题');
  assert.equal(invalid.node('messages').children.length, 0);
});

test('stop cancels an in-flight request and restores the draft', async () => {
  const a = agent({ ready: true, fetch: (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) });
  const sending = a.send('请介绍项目');
  assert.equal(a.node('stopButton').hidden, false);
  await a.send('double click');
  assert.equal(a.calls.length, 1);
  a.node('stopButton').events.click();
  await sending;
  assert.equal(a.node('messageInput').value, '请介绍项目');
  assert.equal(a.node('messages').children.length, 0);
  assert.equal(a.node('thinking').hidden, true);
});

test('Chinese IME confirmation and Shift+Enter do not submit; Enter does', async () => {
  const a = agent({ ready: true });
  a.node('messageInput').value = '中文输入';
  const key = a.node('messageInput').events.keydown;
  for (const modifiers of [{ isComposing: true }, { keyCode: 229 }, { shiftKey: true }]) {
    await key({ key: 'Enter', preventDefault() { throw new Error('must allow composition/newline'); }, ...modifiers });
  }
  assert.equal(a.calls.length, 0);
  await key({ key: 'Enter', preventDefault() {} });
  assert.equal(a.calls.length, 1);
});

test('session drafts restore, clearing requires confirmation, locking clears tab storage', () => {
  const a = agent({ saved: { messages: [{ role: 'assistant', content: '之前的回答' }], draft: '未发送' } });
  assert.equal(a.node('messageInput').value, '未发送');
  assert.equal(a.node('messages').children.length, 1);
  a.state.confirmed = false;
  a.node('newChatButton').events.click();
  assert.equal(a.node('messages').children.length, 1);
  a.state.confirmed = true;
  a.node('newChatButton').events.click();
  assert.equal(a.node('messages').children.length, 0);
  assert.equal(a.node('messageInput').value, '');
  a.node('lockButton').events.click();
  assert.equal(a.stored.has(storageKey), false);
  assert.equal(a.sandbox.location.destination, '../index.html#work');
});

test('new chat ignores responses from an older in-flight request', async () => {
  let resolve;
  const a = agent({ ready: true, fetch: () => new Promise(done => { resolve = done; }) });
  const sending = a.send('旧问题');
  a.node('newChatButton').events.click();
  resolve({ ok: true, json: async () => ({ answer: '已清空的旧回答' }) });
  await sending;
  assert.equal(a.node('messages').children.length, 0);
  assert.equal(JSON.parse(a.stored.get(storageKey)).messages.length, 0);
});
