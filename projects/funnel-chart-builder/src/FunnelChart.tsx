import React, { useLayoutEffect, useRef, useState } from 'react';
import type { FunnelLevel } from './types';
type Props = { levels: FunnelLevel[]; onChange: (id: string, field: keyof FunnelLevel, value: string | number | boolean) => void };
export default function FunnelChart({ levels, onChange }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<{ id: string; color: string; path: string; x: number; y: number }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const max = Math.max(1, ...levels.map(l => l.value));
  const todos = levels.filter(l => l.hasActionItem && (l.actionItem.trim() || editing === l.id));
  useLayoutEffect(() => {
    const root = container.current!;
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const next = todos.flatMap(level => {
        const shape = root.querySelector<HTMLElement>(`[data-stage="${levels.indexOf(level)}"]`);
        const card = root.querySelector<HTMLElement>(`[data-card="${levels.indexOf(level)}"]`);
        if (!shape || !card) return [];
        const a = shape.getBoundingClientRect(), b = card.getBoundingClientRect();
        const i = levels.indexOf(level);
        const bottom = levels[i + 1]?.value ?? level.value * .5;
        const x = a.left - bounds.left + a.width * (.5 + (level.value + bottom) / max / 4);
        const y = a.top - bounds.top + a.height / 2;
        const endX = b.left - bounds.left, endY = b.top - bounds.top + b.height / 2;
        const bend = a.right - bounds.left + 24;
        return [{ id: level.id, color: level.color, x, y, path: `M ${x} ${y} C ${bend} ${y}, ${endX - 24} ${endY}, ${endX} ${endY}` }];
      });
      setLinks(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll('[data-stage], [data-card]').forEach(el => observer.observe(el));
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [levels, editing]);
  return <div ref={container} className={`funnel-board ${todos.length ? '' : 'without-todos'}`}>
    <svg className="funnel-connectors" aria-hidden="true">{links.map(link => <g key={link.id}><path d={link.path} stroke={link.color} fill="none" strokeWidth="1.5" opacity=".65"/><circle cx={link.x} cy={link.y} r="3" fill={link.color}/></g>)}</svg>
    <div className="funnel-stages">
      {levels.map((level, i) => {
        const top = level.value / max * 100;
        const bottom = (levels[i + 1]?.value ?? level.value * .5) / max * 100;
        return <React.Fragment key={level.id}>
          <div className="stage-label">
            <input aria-label={`环节 ${i + 1} 名称`} value={level.label} onChange={e => onChange(level.id, 'label', e.target.value)} style={{ width: `${Math.max(8, Array.from(level.label).reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : .6), 0)) + 1.5}em` }}/>
            <input aria-label={`${level.label} 数值`} type="number" min="0" value={level.value} onChange={e => onChange(level.id, 'value', Math.max(0, Number(e.target.value) || 0))}/>
          </div>
          <div className="stage-shape" data-stage={i}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`${level.label}：${level.value}`}><polygon points={`${(100-top)/2},0 ${(100+top)/2},0 ${(100+bottom)/2},100 ${(100-bottom)/2},100`} fill={level.color} opacity=".9"/></svg>
            {i < levels.length - 1 && <span className="conversion-rate">↓ 转化率 {level.value > 0 ? `${(levels[i+1].value / level.value * 100).toFixed(1)}%` : '—'}</span>}
          </div>
        </React.Fragment>;
      })}
    </div>
    {todos.length > 0 && <div className="funnel-todos">{todos.map(level => <article className="todo-card" key={level.id} data-card={levels.indexOf(level)} style={{ borderLeftColor: level.color }}>
      <div className="todo-heading"><span style={{ background: level.color }} />{level.label}</div>
      <p className="todo-caption">下周待办事项</p>
      {editing === level.id ? <textarea autoFocus aria-label={`${level.label} 待办事项`} value={level.actionItem} ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }} onChange={e => onChange(level.id, 'actionItem', e.target.value)} onBlur={() => setEditing(null)}/> : <button className="todo-content" title="点击编辑待办事项" onClick={() => setEditing(level.id)}>{level.actionItem}</button>}
    </article>)}</div>}
  </div>;
}
