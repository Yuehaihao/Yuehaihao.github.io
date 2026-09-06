(function () {
  'use strict';
  const access = window.YeuhubAccess;
  const node = id => document.getElementById(id);
  let timer;
  function render() {
    clearTimeout(timer);
    const left = access.remainingMs();
    node('gateLocked').hidden = left > 0;
    node('gateOpen').hidden = left <= 0;
    if (left > 0) {
      node('gateRemain').textContent = `已解锁 · ${Math.ceil(left / 60000)} 分钟内免密进入`;
      timer = setTimeout(render, Math.min(left + 50, 60000));
    }
  }
  node('gateForm').addEventListener('submit', event => {
    event.preventDefault();
    const error = node('gateError');
    try {
      if (access.unlock(node('gateInput').value)) {
        error.hidden = true;
        node('gateInput').value = '';
        window.location.assign('agent/index.html');
        return;
      }
      error.textContent = '密码不正确，请重新输入。';
      node('gateInput').select();
    } catch (storageError) {
      error.textContent = '浏览器无法保存解锁状态，请允许此网站存储数据后重试。';
    }
    error.hidden = false;
  });
  node('gateLockBtn').addEventListener('click', () => { access.lock(); render(); node('gateInput').focus(); });
  window.addEventListener('storage', render);
  window.addEventListener('pageshow', render);
  render();
})();
