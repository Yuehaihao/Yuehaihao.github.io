import type { FunnelLevel } from './types';
export function createDefaultLevels(): FunnelLevel[] {
  const labels = ['赠送客户数', '任务开启客户数', '获得分发客户数', '分发后接管客户数', '接管后发A客户数', '发AB客户数'];
  const values = [108, 101, 94, 61, 50, 40];
  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];
  return labels.map((label, i) => ({ id: crypto.randomUUID(), label, value: values[i], color: colors[i], actionItem: '', hasActionItem: i > 0 && i < 5, valueNote: '', percentNote: '' }));
}
export function topPercentage(value: number, firstValue: number): string {
  if (!Number.isFinite(value) || !Number.isFinite(firstValue) || firstValue <= 0) return '—';
  return `${Number((value / firstValue * 100).toFixed(1))}%`;
}
