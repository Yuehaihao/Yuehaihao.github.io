(function () {
  'use strict';
  const access = window.YeuhubAccess;
  const node = id => document.getElementById(id);
  const config = window.YEUHUB_AGENT_CONFIG || {};
  const STORAGE_KEY = 'yeuhub_agent_session_v1';
  let messages = [];
  let activeRequest = null;
  let gateTimer;
  let endpoint = '';
  try {
    if (config.endpoint) {
      const parsed = new URL(config.endpoint, window.location.href);
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) endpoint = parsed.href;
    }
  } catch (error) { /* Leave unavailable rather than send to an invalid endpoint. */ }
  const ready = Boolean(endpoint && config.knowledgeReady);

  function guard() {
    clearTimeout(gateTimer);
    const left = access.remainingMs();
    if (left <= 0) {
      if (activeRequest) activeRequest.controller.abort();
      node('agentApp').hidden = true;
      window.location.replace('../index.html#work');
      return false;
    }
    gateTimer = setTimeout(guard, left + 50);
    return true;
  }
  if (!guard()) return;
  node('agentApp').hidden = false;
  window.addEventListener('storage', guard);
  window.addEventListener('pageshow', guard);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) guard(); });

  function feedback(text, retry = false) {
    node('feedbackText').textContent = text;
    node('chatFeedback').hidden = !text;
    node('retryButton').hidden = !retry;
  }
  function persist() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, draft: node('messageInput').value })); }
    catch (error) { feedback('当前浏览器无法暂存对话，刷新后内容可能丢失。'); }
  }
  function safeSources(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 8).filter(item => item && typeof item.title === 'string').map(item => {
      let url = '';
      try {
        const parsed = new URL(item.url);
        if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) url = parsed.href;
      } catch (error) { /* A title without a public URL is still useful. */ }
      return { title: item.title.slice(0, 160), url };
    });
  }
  function addMessage(message) {
    const article = document.createElement('article');
    article.className = `message ${message.role}`;
    const label = document.createElement('p');
    label.className = 'message-label';
    label.textContent = message.role === 'user' ? '你' : '海浩 AI';
    const body = document.createElement('div');
    body.className = 'message-body';
    body.textContent = message.content;
    article.append(label, body);
    if (message.role === 'assistant' && message.sources && message.sources.length) {
      const sources = document.createElement('div');
      sources.className = 'source-links';
      for (const source of safeSources(message.sources)) {
        const item = document.createElement(source.url ? 'a' : 'span');
        item.textContent = `参考：${source.title}`;
        if (source.url) { item.href = source.url; item.target = '_blank'; item.rel = 'noopener noreferrer'; }
        sources.append(item);
      }
      article.append(sources);
    }
    node('messages').append(article);
    return article;
  }
  function scrollToLatest() {
    const scroller = node('conversationScroll');
    scroller.scrollTop = scroller.scrollHeight;
  }
  function syncInput(save = true) {
    const input = node('messageInput');
    node('inputCount').textContent = `${input.value.length} / 4000`;
    node('sendButton').disabled = Boolean(activeRequest) || !input.value.trim();
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    if (save) persist();
  }
  function busy(value) {
    node('thinking').hidden = !value;
    node('stopButton').hidden = !value;
    node('messageInput').disabled = value;
    document.querySelectorAll('[data-prompt]').forEach(button => { button.disabled = value; });
    syncInput(false);
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Array.isArray(saved.messages)) {
      messages = saved.messages.filter(message => message && ['user', 'assistant'].includes(message.role)
        && typeof message.content === 'string' && message.content.length <= 32000).slice(-50)
        .map(message => ({ role: message.role, content: message.content, sources: safeSources(message.sources) }));
      node('messageInput').value = typeof saved.draft === 'string' ? saved.draft.slice(0, 4000) : '';
      messages.forEach(addMessage);
    }
  } catch (error) { /* Corrupt/disabled storage must not prevent a new conversation. */ }
  node('welcome').hidden = messages.length > 0;
  if (ready) {
    node('setupNotice').hidden = true;
    node('serviceStatus').textContent = '已接入对话服务';
    node('knowledgeStatus').textContent = '已接入';
    node('knowledgeDescription').textContent = config.knowledgeDescription || '回答基于海浩提供的资料；资料未覆盖的问题会明确说明。';
  }
  syncInput(false);
  scrollToLatest();

  async function send() {
    if (activeRequest || !guard()) return;
    const input = node('messageInput');
    const text = input.value.trim();
    if (!text) return;
    if (text.length > 4000) { feedback('每条消息最多 4000 字，请精简后发送。'); return; }
    if (!ready) {
      feedback('知识库与对话服务尚未接入，问题已保留在输入框中，暂时无法发送。');
      input.focus();
      return;
    }
    const request = { controller: new AbortController(), timedOut: false };
    activeRequest = request;
    feedback('');
    const pending = addMessage({ role: 'user', content: text });
    node('welcome').hidden = true;
    input.value = '';
    busy(true);
    scrollToLatest();
    const timeout = setTimeout(() => { request.timedOut = true; request.controller.abort(); }, 45000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'omit',
        signal: request.controller.signal,
        body: JSON.stringify({ messages: [...messages.slice(-20).map(({ role, content }) => ({ role, content })), { role: 'user', content: text }] })
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error('提问有点频繁，请稍后再试。');
        throw new Error('对话服务暂时不可用，请稍后重试。');
      }
      const data = await response.json();
      if (typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 32000) throw new Error('未收到有效回答，请重试。');
      if (activeRequest !== request || !guard()) return;
      const answer = { role: 'assistant', content: data.answer.trim(), sources: safeSources(data.sources) };
      messages = [...messages, { role: 'user', content: text }, answer].slice(-50);
      addMessage(answer);
      persist();
    } catch (error) {
      if (activeRequest !== request) return;
      pending.remove();
      input.value = text;
      node('welcome').hidden = messages.length > 0;
      const reason = request.timedOut ? '等待回答超时，问题已保留。' : request.controller.signal.aborted ? '已停止生成，问题已保留。' : error instanceof TypeError ? '连接失败，请检查网络或稍后重试。' : error.message || '发送失败，问题已保留。';
      feedback(reason, !request.controller.signal.aborted || request.timedOut);
      persist();
    } finally {
      clearTimeout(timeout);
      if (activeRequest === request) {
        activeRequest = null;
        busy(false);
        input.focus();
        scrollToLatest();
      }
    }
  }
  node('chatForm').addEventListener('submit', event => { event.preventDefault(); return send(); });
  node('messageInput').addEventListener('input', () => { feedback(''); syncInput(); });
  node('messageInput').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      return send();
    }
  });
  document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
    node('messageInput').value = button.dataset.prompt;
    feedback('');
    syncInput();
    node('messageInput').focus();
  }));
  node('stopButton').addEventListener('click', () => { if (activeRequest) activeRequest.controller.abort(); });
  node('retryButton').addEventListener('click', send);
  node('newChatButton').addEventListener('click', () => {
    if ((messages.length || node('messageInput').value || activeRequest) && !window.confirm('开始新对话会清空当前对话与草稿，确定继续吗？')) return;
    if (activeRequest) activeRequest.controller.abort();
    activeRequest = null;
    messages = [];
    node('messages').replaceChildren();
    node('messageInput').value = '';
    node('welcome').hidden = false;
    feedback('');
    busy(false);
    persist();
    node('messageInput').focus();
  });
  node('lockButton').addEventListener('click', () => {
    if (activeRequest) activeRequest.controller.abort();
    activeRequest = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (error) {}
    access.lock();
    node('agentApp').hidden = true;
    window.location.replace('../index.html#work');
  });
})();
