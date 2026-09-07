import { ArrowDown, Download, Image as ImageIcon, Settings } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FunnelLevel } from './types';
import FunnelChart from './FunnelChart';
import { HISTORY_KEY, readHistory, saveSnapshot, type Snapshot } from './history';

const defaultColors = [
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  '#f97316', // orange-500
];

const initialData: FunnelLevel[] = [
  { id: uuidv4(), label: '网站访客', value: 10000, color: defaultColors[0], actionItem: '增加社交媒体广告投放并优化搜索引擎排名。', hasActionItem: true },
  { id: uuidv4(), label: '注册用户', value: 4000, color: defaultColors[1], actionItem: '对落地页标题和行动号召按钮进行 A/B 测试。', hasActionItem: true },
  { id: uuidv4(), label: '活跃用户', value: 2000, color: defaultColors[2], actionItem: '启动入职邮件序列以提升活跃度。', hasActionItem: true },
  { id: uuidv4(), label: '付费客户', value: 500, color: defaultColors[3], actionItem: '为首次升级提供限时折扣优惠。', hasActionItem: true },
];

export default function App() {
  const [loaded] = useState(() => { try { return { records: readHistory(localStorage), error: '' }; } catch { return { records: [] as Snapshot[], error: '历史记录暂时无法读取，原数据未修改。' }; } });
  const [history, setHistory] = useState<Snapshot[]>(loaded.records);
  const [notice, setNotice] = useState(loaded.error);
  const [title, setTitle] = useState(loaded.records[0]?.title || '我的增长漏斗');
  const [levels, setLevels] = useState<FunnelLevel[]>(loaded.records[0]?.levels || initialData);
  const [baseline, setBaseline] = useState(JSON.stringify({ title: loaded.records[0]?.title || '我的增长漏斗', levels: loaded.records[0]?.levels || initialData }));
  const retain = () => {
    try {
      const name = title.trim() || '未命名漏斗';
      const next = saveSnapshot(localStorage, { id: uuidv4(), title: name, savedAt: new Date().toISOString(), levels });
      setHistory(next); setTitle(name); setBaseline(JSON.stringify({ title: name, levels })); setNotice('已保留，历史记录中可以重新打开。');
    } catch { setNotice('保留失败，浏览器存储不可用或空间不足。当前内容仍保留在页面中，请先导出。'); }
  };
  const openSnapshot = (record: Snapshot) => {
    if (JSON.stringify({ title, levels }) !== baseline && !window.confirm('当前有未保留的修改，打开历史记录会替换当前图表。确定继续吗？')) return;
    const copy = JSON.parse(JSON.stringify(record)); setLevels(copy.levels); setTitle(copy.title);
    setBaseline(JSON.stringify({ title: copy.title, levels: copy.levels })); setNotice('已打开历史版本，编辑后点击保留会生成一条新记录。');
  };
  const deleteSnapshot = (id: string) => {
    if (!window.confirm('确定删除这条历史记录吗？当前图表不会被清空。')) return;
    try { const next = readHistory(localStorage).filter(r => r.id !== id); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); setHistory(next); setNotice('历史记录已删除。'); }
    catch { setNotice('删除失败，历史记录未更改。'); }
  };
  const chartRef = useRef<HTMLDivElement>(null);

  const maxVal = Math.max(...levels.map((l) => l.value), 1);

  const handleLevelChange = (id: string, field: keyof FunnelLevel, value: string | number | boolean) => {
    setLevels(levels.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleLevelCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    if (isNaN(count) || count < 1 || count > 20) return;

    if (count > levels.length) {
      const newLevels = [...levels];
      for (let i = levels.length; i < count; i++) {
        newLevels.push({
          id: uuidv4(),
          label: `层级 ${i + 1}`,
          value: Math.floor((newLevels[i - 1]?.value || 100) * 0.8),
          color: defaultColors[i % defaultColors.length],
          actionItem: '',
          hasActionItem: true,
        });
      }
      setLevels(newLevels);
    } else if (count < levels.length) {
      setLevels(levels.slice(0, count));
    }
  };

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const exportChart = async (format: 'png' | 'pdf') => {
    if (!chartRef.current || exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
      const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const image = canvas.toDataURL('image/png');
      if (format === 'png') {
        const link = document.createElement('a');
        link.href = image;
        link.download = '漏斗图.png';
        link.click();
      } else {
        const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(image, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('漏斗图.pdf');
      }
    } catch (error) {
      setExportError('导出失败，请稍后重试；图表中的内容仍然保留。');
    } finally { setExporting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 lg:p-6 flex justify-center overflow-x-hidden">
      <div className="w-full max-w-[1920px] grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Config Panel */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 xl:sticky xl:top-6 z-30">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">漏斗图设置</h2>
          </div>

          <a href="../index.html#work" className="block text-sm text-indigo-600 hover:underline">← 返回海浩主页</a>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                层级数量
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={levels.length}
                onChange={handleLevelCountChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              层级颜色
            </label>
            {levels.map((level, index) => (
              <div key={level.id} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 truncate mr-3">
                    {index + 1}. {level.label}
                  </span>
                  <input
                    type="color"
                    value={level.color}
                    onChange={(e) => handleLevelChange(level.id, 'color', e.target.value)}
                    className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer shrink-0 shadow-sm"
                    title="更改层级颜色"
                  />
                </div>
                <div className="flex items-center border-t border-slate-200/60 pt-2">
                  <label className="text-xs text-slate-600 flex items-center cursor-pointer hover:text-indigo-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={level.hasActionItem}
                      onChange={(e) => handleLevelChange(level.id, 'hasActionItem', e.target.checked)}
                      className="mr-2 w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    显示下周待办事项
                  </label>
                </div>
                {level.hasActionItem && <textarea aria-label={`${level.label} 待办内容`} className="w-full text-sm leading-relaxed bg-white border border-slate-200 rounded-lg p-2" rows={3} placeholder="填写待办事项；留空时右侧不显示卡片" value={level.actionItem} onChange={e => handleLevelChange(level.id, 'actionItem', e.target.value)}/>}
              </div>
            ))}
          </div>
          
          <section className="pt-4 border-t border-slate-100" aria-label="历史记录">
            <h3 className="text-base font-semibold mb-2">历史记录 · {history.length}</h3>
            <p className="text-xs text-slate-500 mb-4">点击保留生成一个版本，仅保存在当前浏览器。</p>
            <div className="history-list">{history.map(record => <article className="history-item" key={record.id}>
              <p className="text-sm font-semibold">{record.title}</p>
              <p className="text-xs text-slate-500 mt-1">{new Date(record.savedAt).toLocaleString('zh-CN')} · {record.levels.length} 个环节</p>
              <div className="flex justify-between mt-2"><button className="text-sm text-indigo-600" onClick={() => openSnapshot(record)}>打开</button><button className="text-sm text-slate-500" onClick={() => deleteSnapshot(record.id)}>删除</button></div>
            </article>)}</div>
            {!history.length && <p className="text-sm text-slate-500">还没有保留的版本。</p>}
          </section>
          <div className="pt-4 border-t border-slate-100">
             <p className="text-xs text-slate-500 text-center flex items-center justify-center space-x-1">
                <span className="font-medium text-indigo-500">提示：</span> 
                <span>点击图表文字即可编辑；待办留空则不显示。</span>
             </p>
          </div>
        </div>

        {/* Visualization & Action Items */}
        <div className="xl:col-span-10 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap gap-4 justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">增长漏斗图</h1>
            <div className="flex flex-wrap gap-3 items-center">
              <input aria-label="历史记录名称" className="border border-slate-300 rounded-xl px-3 py-2 text-sm w-44" value={title} maxLength={100} onChange={e => setTitle(e.target.value)}/>
              <button onClick={retain} className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium">保留</button>
              <button
                onClick={() => exportChart('png')}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <ImageIcon className="w-4 h-4 mr-2 text-slate-500" />
                导出为 PNG
              </button>
              <button
                onClick={() => exportChart('pdf')}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Download className="w-4 h-4 mr-2 opacity-80" />
                导出为 PDF
              </button>
            </div>
          </div>

          {notice && <p role="status" className="text-sm text-indigo-700">{notice}</p>}
          {exporting && <p role="status" className="text-sm text-indigo-600">正在导出…</p>}
          {exportError && <p role="alert" className="text-sm text-red-600">{exportError}</p>}
          <div 
            className="overflow-x-auto">
          <div ref={chartRef}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 pt-12 pb-12 "
          >
            <FunnelChart levels={levels} onChange={handleLevelChange}/>

          </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
