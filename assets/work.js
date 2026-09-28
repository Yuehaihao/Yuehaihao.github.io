(function () {
  'use strict';
  document.querySelectorAll('[data-lock-scope]').forEach(function (button) {
    button.addEventListener('click', function () {
      var scope = button.getAttribute('data-lock-scope') || 'work';
      window.YeuhubAccess.lock(scope);
      window.location.replace(button.getAttribute('data-return') || '/index.html#' + scope);
    });
  });
})();
