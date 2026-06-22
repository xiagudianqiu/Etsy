import { GitCompare, Trash2, Download, Calendar, FileText, CheckSquare, Layers } from 'lucide-react';

export default function MonthSelector({
  availableMonths,
  selectedMonths,           // 数组
  onToggleMonth,            // (monthKey) => toggle
  onSelectAll,              // () => 全选/取消全选
  allSelected,              // bool
  compareMode,
  onToggleCompareMode,
  compareMonth,
  onSelectCompareMonth,
  onDeleteMonth,
  onExportClick,
  onExportPDF,
  canExport
}) {
  const fmt = (m) => {
    if (!m) return '';
    const [, mo] = m.split('-');
    return `${parseInt(mo)} 月`;
  };

  const toggle = (m) => {
    onToggleMonth(m);
  };

  return (
    <div className="card p-4 flex items-center justify-between gap-4 flex-wrap fade-in">
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-[var(--text-tertiary)] mr-1" />

        {/* 全部按钮 */}
        {availableMonths.length > 1 && (
          <button
            onClick={onSelectAll}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 border
              ${allSelected
                ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border-[rgba(212,160,86,0.4)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)] border-[var(--border)]'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            全部 {availableMonths.length} 月
          </button>
        )}

        {/* 多选提示 */}
        {selectedMonths.length > 1 && !allSelected && (
          <span className="chip chip-gold ml-1">
            <CheckSquare className="w-3 h-3" />
            已选 {selectedMonths.length} 月
          </span>
        )}

        {/* 月份按钮 */}
        {availableMonths.map(m => {
          const active = selectedMonths.includes(m);
          return (
            <button
              key={m}
              onClick={() => toggle(m)}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all tabular-nums
                ${active
                  ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border border-[rgba(212,160,86,0.3)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                }`}
              title={allSelected ? '点击取消全选' : active ? '点击取消选择' : '点击选择'}
            >
              {fmt(m)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {availableMonths.length >= 2 && (
          <button
            onClick={onToggleCompareMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all
              ${compareMode
                ? 'bg-[rgba(212,160,86,0.1)] text-[var(--gold-bright)] border border-[rgba(212,160,86,0.3)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            对比
          </button>
        )}

        {compareMode && availableMonths.length >= 2 && (
          <select
            value={compareMonth || ''}
            onChange={e => onSelectCompareMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[13px] bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--gold)]"
          >
            <option value="">选择月份</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>vs {fmt(m)}</option>
            ))}
          </select>
        )}

        {canExport && (
          <>
            <button onClick={onExportClick} className="btn-ghost" title="导出 CSV">
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            {onExportPDF && (
              <button onClick={onExportPDF} className="btn-ghost" title="导出 PDF 报表">
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
            )}
          </>
        )}

        {selectedMonths.length === 1 && (
          <button
            onClick={() => onDeleteMonth(selectedMonths[0])}
            className="btn-icon"
            title="删除当前月份"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
