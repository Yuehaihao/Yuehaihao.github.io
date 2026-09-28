(function () {
  'use strict';
  const access = window.YeuhubAccess;
  const node = id => document.getElementById(id);
  const gates = [
    { scope: 'work', prefix: 'gate', destination: 'work/index.html' },
    { scope: 'life', prefix: 'lifeGate', destination: 'fitness/index.html' }
  ];

  function setupGate(gate) {
    let timer;
    const get = suffix => node(gate.prefix + suffix);
    function render() {
      clearTimeout(timer);
      const left = access.remainingMs(gate.scope);
      get('Locked').hidden = left > 0;
      get('Open').hidden = left <= 0;
      if (left > 0) {
        get('Remain').textContent = `已解锁 · ${Math.ceil(left / 60000)} 分钟内免密进入`;
        timer = setTimeout(render, Math.min(left + 50, 60000));
      }
    }
    get('Form').addEventListener('submit', event => {
      event.preventDefault();
      const error = get('Error');
      try {
        if (access.unlock(get('Input').value, gate.scope)) {
          error.hidden = true;
          get('Input').value = '';
          window.location.assign(gate.destination);
          return;
        }
        error.textContent = '密码不正确，请重新输入。';
        get('Input').select();
      } catch (storageError) {
        error.textContent = '浏览器无法保存解锁状态，请允许此网站存储数据后重试。';
      }
      error.hidden = false;
    });
    get('LockBtn').addEventListener('click', () => {
      access.lock(gate.scope);
      render();
      get('Input').focus();
    });
    window.addEventListener('storage', render);
    window.addEventListener('pageshow', render);
    render();
  }

  gates.forEach(setupGate);
})();
