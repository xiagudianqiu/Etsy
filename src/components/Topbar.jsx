import { Plus, X, Bell, Search, ChevronRight } from 'lucide-react';
import { CURRENCIES } from '../utils/currency';

const PAGE_META = {
  dashboard: { title: '仪表盘', desc: '店铺整体经营状况 · 健康度评分' },
  orders: { title: '订单', desc: '订单明细 · 产品利润 · 费用拆解' },
  cost: { title: '成本与广告', desc: '成本模拟 · 广告 ROI · 盈亏分析' },
  'ai-image': { title: 'AI 生图', desc: 'GPT-Image-2 提示词库 · 一键生产品图/广告图' }
};

export default function Topbar({ activePage, selectedMonth, selectedMonths = [], onImportClick, hasData, showUploader, displayCurrency = 'USD', onCurrencyChange }) {
  const meta = PAGE_META[activePage] || PAGE_META.dashboard;
  const fmtMonth = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return `${y} · ${parseInt(mo)} 月`;
  };

  // 月份标签：单月显示「4 月」，多月显示合并提示
  const monthLabel = selectedMonths.length === 0
    ? null
    : selectedMonths.length === 1
      ? fmtMonth(selectedMonths[0])
      : `已选 ${selectedMonths.length} 个月合并`;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xl">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] mb-1.5">
            <span>仪表盘</span>
            <ChevronRight className="w-3 h-3" />
            <span>{meta.title}</span>
            {monthLabel && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[var(--gold)]">{monthLabel}</span>
              </>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold text-[var(--text-primary)] tracking-tight">{meta.title}</h1>
            <span className="text-[13px] text-[var(--text-tertiary)]">{meta.desc}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 币种切换 */}
          {onCurrencyChange && (
            <div className="flex items-center gap-1 px-1 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
              {['USD', 'CNY', 'EUR'].map(code => {
                const cur = CURRENCIES[code];
                const active = displayCurrency === code;
                return (
                  <button
                    key={code}
                    onClick={() => onCurrencyChange(code)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
                      ${active
                        ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                    title={`${cur.name} (${code})`}
                  >
                    {cur.symbol} {cur.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] w-52">
            <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="搜索订单 / 产品"
              className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
            />
          </div>

          <button onClick={onImportClick} className="btn-primary" title={showUploader ? '收起导入面板' : '导入 CSV 文件'}>
            {showUploader ? <X className="w-4 h-4" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
            {showUploader ? '收起' : '导入'}
          </button>
        </div>
      </div>
    </header>
  );
}
