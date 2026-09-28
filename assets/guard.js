(function () {
  'use strict';
  var script = document.currentScript;
  var scope = script && script.getAttribute('data-scope') === 'life' ? 'life' : 'work';
  var returnUrl = script && script.getAttribute('data-return') || '/index.html#' + scope;
  var access = window.YeuhubAccess;
  var timer;

  function guard() {
    clearTimeout(timer);
    var left = access ? access.remainingMs(scope) : 0;
    if (left <= 0) {
      document.documentElement.hidden = true;
      window.location.replace(returnUrl);
      return false;
    }
    document.documentElement.hidden = false;
    timer = setTimeout(guard, left + 50);
    return true;
  }

  window.addEventListener('storage', guard);
  window.addEventListener('pageshow', guard);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) guard();
  });
  guard();
})();
