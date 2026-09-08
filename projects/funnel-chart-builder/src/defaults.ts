import type { FunnelLevel } from './types';
export function createDefaultLevels(): FunnelLevel[] {
  const labels = ['赠送客户数', '任务开启客户数', '获得分发客户数', '分发后接管客户数', '接管后发A客户数', '发AB客户数'];
  const values = [108, 101, 94, 61, 50, 40];
  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];
  const actionItems = [
    '',
    'CSM：了解客户开启任务的卡点；最后通知客户在周四前开启任务，否则收回赠送点数。',
    '中台：拉出创建任务 7 天以上、分发数仍为 0 的客户预警。CSM：配合诊断客户所在商品的赛道是否需要修改。',
    '中台：拉出分发数大于 0、接管数低于 10% 的客户预警。CSM：回访客户，了解不接管的具体原因。',
    '中台：拉出接管数大于 0、发 A 数低于 20% 的客户预警。CSM：回访客户，了解接管后不发 A 的具体原因。',
    '',
  ];
  return labels.map((label, i) => ({ id: crypto.randomUUID(), label, value: values[i], color: colors[i], actionItem: actionItems[i], hasActionItem: Boolean(actionItems[i]), valueNote: '', percentNote: '' }));
}
export function topPercentage(value: number, firstValue: number): string {
  if (!Number.isFinite(value) || !Number.isFinite(firstValue) || firstValue <= 0) return '—';
  return `${Number((value / firstValue * 100).toFixed(1))}%`;
}
