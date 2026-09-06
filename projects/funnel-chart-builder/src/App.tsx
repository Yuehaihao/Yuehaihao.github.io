import { ArrowDown, Download, Image as ImageIcon, Settings } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FunnelLevel } from './types';

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
  const [levels, setLevels] = useState<FunnelLevel[]>(initialData);
  const [editing, setEditing] = useState<{ id: string; field: keyof FunnelLevel } | null>(null);
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
      <div className="w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Config Panel */}
        <div className="lg:col-span-3 xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 lg:sticky lg:top-6 z-30">
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
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-slate-100">
             <p className="text-xs text-slate-500 text-center flex items-center justify-center space-x-1">
                <span className="font-medium text-indigo-500">提示：</span> 
                <span>双击图表上的任意文本即可进行编辑。</span>
             </p>
          </div>
        </div>

        {/* Visualization & Action Items */}
        <div className="lg:col-span-9 xl:col-span-9 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap gap-4 justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">增长漏斗图</h1>
            <div className="flex space-x-3">
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

          {exporting && <p role="status" className="text-sm text-indigo-600">正在导出…</p>}
          {exportError && <p role="alert" className="text-sm text-red-600">{exportError}</p>}
          <div 
            className="overflow-x-auto">
          <div ref={chartRef}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 pt-12 pb-12 min-w-[760px]"
          >
            <div className="flex flex-col w-full relative">
              {levels.map((level, i) => {
                const isLast = i === levels.length - 1;
                const nextLevel = isLast ? null : levels[i + 1];
                
                const wTop = (level.value / maxVal) * 100;
                let wBottom = nextLevel ? (nextLevel.value / maxVal) * 100 : wTop * 0.5;
                
                const conversionRate = nextLevel 
                  ? (level.value > 0 ? ((nextLevel.value / level.value) * 100).toFixed(1) + '%' : '—')
                  : null;

                return (
                  <div key={level.id} className={`relative flex h-[100px] items-stretch ${!isLast ? 'mb-5' : ''}`}>
                    
                    {/* Left: Label & Value Segment */}
                    <div className="w-[15%] shrink-0 flex flex-col justify-center items-end pr-4 relative z-10">
                      {editing?.id === level.id && editing?.field === 'label' ? (
                        <input
                          autoFocus
                          className="text-slate-800 font-bold text-lg text-right bg-white rounded px-2 py-0.5 w-full outline-none focus:ring-2 focus:ring-indigo-500 border border-indigo-200 shadow-sm"
                          value={level.label}
                          onChange={(e) => handleLevelChange(level.id, 'label', e.target.value)}
                          onBlur={() => setEditing(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                        />
                      ) : (
                        <span 
                          className="text-slate-800 font-bold text-lg cursor-text px-2 py-0.5 hover:bg-slate-100 rounded transition-colors text-right"
                          onDoubleClick={() => setEditing({ id: level.id, field: 'label' })}
                          title="双击编辑标签"
                        >
                          {level.label}
                        </span>
                      )}

                      {editing?.id === level.id && editing?.field === 'value' ? (
                        <input
                          type="number"
                          autoFocus
                          className="text-slate-600 font-bold text-right bg-white rounded px-2 py-0.5 w-3/4 outline-none focus:ring-2 focus:ring-indigo-500 mt-1 border border-indigo-200 shadow-sm"
                          value={level.value}
                          onChange={(e) => handleLevelChange(level.id, 'value', Math.max(0, Number(e.target.value) || 0))}
                          onBlur={() => setEditing(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                        />
                      ) : (
                        <span 
                          className="text-slate-600 font-bold cursor-text px-2 py-0.5 hover:bg-slate-100 rounded transition-colors text-right mt-1"
                          onDoubleClick={() => setEditing({ id: level.id, field: 'value' })}
                          title="双击编辑数值"
                        >
                          {level.value.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Middle: SVG Funnel Segment */}
                    <div className="w-[60%] shrink-0 relative">
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="w-full h-full drop-shadow-sm"
                      >
                        <polygon
                          points={`
                            ${(100 - wTop) / 2},0 
                            ${(100 + wTop) / 2},0 
                            ${(100 + wBottom) / 2},100 
                            ${(100 - wBottom) / 2},100
                          `}
                          fill={level.color}
                          opacity={0.9}
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                    </div>

                    {/* Right: Action Items Segment */}
                    <div className="w-[25%] pl-4 py-1 relative flex flex-col justify-center">
                      {level.hasActionItem && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm transition-all hover:border-indigo-200 h-full flex flex-col justify-center relative z-10 overflow-hidden">
                          <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-1 flex items-center shrink-0">
                             下周待办事项
                          </label>
                          
                          {editing?.id === level.id && editing?.field === 'actionItem' ? (
                            <textarea
                              autoFocus
                              value={level.actionItem}
                              onChange={(e) => handleLevelChange(level.id, 'actionItem', e.target.value)}
                              onBlur={() => setEditing(null)}
                              placeholder="需要做些什么来提升这个指标？"
                              className="w-full bg-white border border-indigo-300 p-2 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 resize-none outline-none leading-snug shadow-sm flex-1"
                            />
                          ) : (
                            <div 
                              className="w-full text-slate-700 text-sm leading-snug cursor-text p-1 -m-1 hover:bg-slate-100 rounded transition-colors flex-1 overflow-y-auto"
                              onDoubleClick={() => setEditing({ id: level.id, field: 'actionItem' })}
                              title="双击编辑待办事项"
                            >
                              {level.actionItem || <span className="text-slate-400 italic">双击添加待办事项...</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Connection Line & Conversion Rate */}
                    {!isLast && (
                      <div className="absolute top-full mt-2.5 -translate-y-1/2 left-[15%] w-[60%] flex items-center justify-center z-20 pointer-events-none">
                        <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-full shadow-md border border-slate-200">
                           <ArrowDown className="w-3 h-3 text-indigo-500" />
                           <span className="text-[11px] font-bold text-indigo-600">转化率 {conversionRate}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
