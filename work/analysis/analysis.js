(function () {
  'use strict';
  var list = document.getElementById('reportList');
  var empty = document.getElementById('emptyState');
  var count = document.getElementById('reportCount');
  var updated = document.getElementById('updatedAt');

  function safeHref(value) {
    if (typeof value !== 'string' || !value || value.includes('..')) return '';
    try {
      var resolved = new URL(value, window.location.href);
      return resolved.origin === window.location.origin && resolved.pathname.indexOf('/work/analysis/reports/') >= 0 ? resolved.href : '';
    } catch (error) { return ''; }
  }

  function reportCard(item) {
    var href = safeHref(item.href);
    if (!href || typeof item.title !== 'string') return null;
    var link = document.createElement('a');
    link.className = 'report-card';
    link.href = href;
    var date = document.createElement('time');
    date.className = 'report-date';
    date.dateTime = typeof item.date === 'string' ? item.date : '';
    date.textContent = item.date || '未标日期';
    var copy = document.createElement('div');
    copy.className = 'report-copy';
    var title = document.createElement('h3');
    title.textContent = item.title.slice(0, 120);
    var summary = document.createElement('p');
    summary.textContent = typeof item.summary === 'string' ? item.summary.slice(0, 240) : '查看完整分析报告。';
    copy.append(title, summary);
    if (Array.isArray(item.tags) && item.tags.length) {
      var tags = document.createElement('div');
      tags.className = 'report-tags';
      item.tags.slice(0, 5).forEach(function (tag) {
        if (typeof tag !== 'string') return;
        var label = document.createElement('span');
        label.textContent = tag.slice(0, 24);
        tags.append(label);
      });
      copy.append(tags);
    }
    var open = document.createElement('span');
    open.className = 'report-open';
    open.textContent = '查看报告 ↗';
    link.append(date, copy, open);
    return link;
  }

  fetch('manifest.json', { cache: 'no-store' })
    .then(function (response) { if (!response.ok) throw new Error('manifest'); return response.json(); })
    .then(function (data) {
      var items = Array.isArray(data.items) ? data.items.slice() : [];
      items.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
      var rendered = 0;
      items.forEach(function (item) {
        var card = reportCard(item);
        if (card) { list.append(card); rendered += 1; }
      });
      count.textContent = rendered + ' 份报告';
      updated.textContent = typeof data.updatedAt === 'string' && data.updatedAt ? data.updatedAt : '—';
      empty.hidden = rendered > 0;
    })
    .catch(function () {
      count.textContent = '暂时无法读取报告';
      empty.querySelector('h3').textContent = '报告列表加载失败';
      empty.querySelector('p').textContent = '请稍后刷新页面重试。';
      empty.classList.add('analysis-error');
    });
})();
