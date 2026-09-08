import type { FunnelLevel } from './types';
export const HISTORY_KEY = 'yeuhub_funnel_history_v1';
export type Snapshot = { id: string; title: string; savedAt: string; levels: FunnelLevel[] };
export function readHistory(storage: Pick<Storage, 'getItem'>): Snapshot[] {
  const raw = storage.getItem(HISTORY_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(s => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.savedAt === 'string' && Number.isFinite(Date.parse(s.savedAt)) && Array.isArray(s.levels) && s.levels.length >= 1 && s.levels.length <= 20 && new Set(s.levels.map((l: FunnelLevel) => l.id)).size === s.levels.length && s.levels.every((l: FunnelLevel) => l && typeof l.id === 'string' && typeof l.label === 'string' && Number.isFinite(l.value) && l.value >= 0 && /^#[0-9a-f]{6}$/i.test(l.color) && typeof l.actionItem === 'string' && typeof l.hasActionItem === 'boolean' && (l.valueNote === undefined || typeof l.valueNote === 'string') && (l.percentNote === undefined || typeof l.percentNote === 'string')))) throw new Error('历史记录无法读取，原数据未修改。');
  return data.map(s => ({ ...s, levels: s.levels.map((l: FunnelLevel) => ({ ...l, valueNote: l.valueNote ?? '', percentNote: l.percentNote ?? '' })) }));
}
export function saveSnapshot(storage: Pick<Storage, 'getItem' | 'setItem'>, snapshot: Snapshot): Snapshot[] {
  const next = [JSON.parse(JSON.stringify(snapshot)), ...readHistory(storage)];
  storage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}
