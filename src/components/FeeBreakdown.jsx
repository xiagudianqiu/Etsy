import { useMemo } from 'react';
import { TrendingDown, ChevronRight } from 'lucide-react';
import { useMoney } from '../utils/MoneyContext';

const FEE_META = [
  { key: 'transactionFee', name: '交易手续费', desc: '6.5% 销售佣金', color: '#d4a056' },
  { key: 'processingFee', name: '处理费', desc: '3% + $0.25 支付通道', color: '#a37b54' },
  { key: 'tax', name: '销售税', desc: 'Etsy 代收代缴', color: '#8a6630' },
  { key: 'shipping', name: '运费标签', desc: 'USPS 运单', color: '#6b5238' },
  { key: 'etsyAds', name: '站内广告', desc: 'Etsy Ads 按点击付费', color: '#b8853d' },
  { key: 'offsiteAds', name: '站外广告', desc: 'Offsite Ads 15% 佣金', color: '#c99450' },
  { key: 'listingFee', name: '上架费', desc: '每 listing $0.20', color: '#7a5f3e' },
  { key: 'refund', name: '退款', desc: '退给买家', color: '#5a4a38' }
];

/**
 * 费用拆解 — 水平堆叠条 + 详细列表 + 洞察
 */
export default function FeeBreakdown({ monthData, feeBreakdown }) {
  const money = useMoney();
  const { summary } = monthData || {};

  const fees = useMemo(() => {
    if (!summary) return [];
    return FEE_META.map(m => ({
      ...m,
      value: Math.max(0, summary[`total${m.key.charAt(0).toUpperCase() + m.key.slice(1)}`] || 0)
    })).filter(f => f.value > 0.01)
      .sort((a, b) => b.value - a.value);
  }, [summary]);

  const totalFees = fees.reduce((s, f) => s + f.value, 0);
  const totalSales = summary?.totalSales || 0;
  const net = summary?.netAmount || 0;

  // 洞察
  const insights = useMemo(() => {
    const out = [];
    if (fees.length > 0) {
      const top = fees[0];
      const pct = totalFees > 0 ? (top.value / totalFees) * 100 : 0;
      out.push(`${top.name}占比最大，${pct.toFixed(0)}% 的费用花在这`);
    }
    if (totalSales > 0) {
      const rate = (totalFees / totalSales) * 100;
      out.push(`Etsy 总共抽走了 ${rate.toFixed(1)}% 的销售额`);
    }
    return out;
  }, [fees, totalFees, totalSales]);

  if (fees.length === 0) {
    return <div className="card p-8 text-center text-[var(--text-tertiary)]">暂无费用数据</div>;
  }

  return (
    <div className="card p-7 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">钱去哪了</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Etsy 各项费用拆解</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums text-[var(--down)]">-{money.fmt(totalFees)}</div>
          <div className="text-xs text-[var(--text-tertiary)]">总费用</div>
        </div>
      </div>

      {/* 堆叠条 */}
      <div className="mb-6">
        <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg)]">
          {fees.map(f => (
            <div
              key={f.key}
              style={{ width: `${(f.value / totalFees) * 100}%`, backgroundColor: f.color }}
              title={`${f.name}: ${money.fmt(f.value)}`}
              className="h-full transition-all hover:brightness-125"
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2.5 text-xs">
          <span className="text-[var(--text-tertiary)]">销售额 <span className="text-[var(--text-secondary)] tabular-nums">{money.fmtCompact(totalSales)}</span></span>
          <span className="text-[var(--text-tertiary)]">到账 <span className="text-[var(--text-primary)] tabular-nums">{money.fmtCompact(net)}</span></span>
        </div>
      </div>

      {/* 详细列表 */}
      <div className="space-y-1">
        {fees.map(f => {
          const pct = totalFees > 0 ? (f.value / totalFees) * 100 : 0;
          return (
            <div key={f.key} className="group flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] text-[var(--text-primary)] font-medium">{f.name}</div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{f.desc}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[13.5px] tabular-nums text-[var(--text-primary)] font-medium">{money.fmt(f.value)}</div>
                <div className="text-[11px] tabular-nums text-[var(--text-tertiary)] mt-0.5">{pct.toFixed(1)}%</div>
              </div>
              <div className="w-16 flex-shrink-0 hidden sm:block">
                <div className="h-1 rounded-full bg-[var(--bg)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: f.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 洞察 */}
      {insights.length > 0 && (
        <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-1.5">
          {insights.map((line, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
              <TrendingDown className="w-3.5 h-3.5 text-[var(--down)] mt-0.5 flex-shrink-0" />
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
