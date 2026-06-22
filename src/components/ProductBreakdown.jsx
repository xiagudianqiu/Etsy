import { useMemo } from 'react';
import { Package, Trophy, TrendingUp } from 'lucide-react';
import { calculateOrderProfit } from '../utils/profitCalculator';
import { useMoney } from '../utils/MoneyContext';

/**
 * 产品利润分析 — 卡片式，突出最赚钱产品
 */
export default function ProductBreakdown({ orders, config }) {
  const money = useMoney();
  const productCosts = config?.products;
  const exchangeRate = config?.exchangeRate || 7.2;

  const stats = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const map = new Map();
    orders.forEach(order => {
      const product = order.product || '未知';
      if (!map.has(product)) {
        map.set(product, { product, count: 0, sales: 0, fees: 0, costUSD: 0, profit: 0 });
      }
      const s = map.get(product);
      const costRMB = productCosts?.[product] ?? 95;
      const costUSD = costRMB / exchangeRate;
      s.count++;
      s.sales += order.sale || 0;
      s.fees += order.totalFees || 0;
      s.costUSD += costUSD;
      s.profit += calculateOrderProfit(order, productCosts, exchangeRate);
    });
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [orders, productCosts, exchangeRate]);

  if (stats.length === 0) {
    return <div className="card p-8 text-center text-[var(--text-tertiary)]">暂无产品数据</div>;
  }

  const totalProfit = stats.reduce((s, p) => s + p.profit, 0);
  const totalSales = stats.reduce((s, p) => s + p.sales, 0);
  const best = stats[0];

  return (
    <div className="card p-7 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">哪个产品最赚钱</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">按利润从高到低排列</p>
        </div>
        <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
      </div>

      {/* 最赚钱产品高亮 */}
      <div className="mb-6 p-4 rounded-xl bg-[rgba(212,160,86,0.06)] border border-[rgba(212,160,86,0.2)] trophy-glow flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f5b955] to-[#8a6630] flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-[#1a1208]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--gold-bright)] mb-0.5">利润冠军</div>
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">{best.product}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {best.count} 单 · 贡献 {((best.profit / totalProfit) * 100).toFixed(0)}% 的利润
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums gold-text">{money.fmt(best.profit)}</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">净利润</div>
        </div>
      </div>

      {/* 产品列表 */}
      <div className="space-y-2">
        {stats.map((s, idx) => {
          const profitRate = s.sales > 0 ? (s.profit / s.sales) * 100 : 0;
          const sharePct = totalProfit > 0 ? (s.profit / totalProfit) * 100 : 0;
          return (
            <div key={s.product} className="flex items-center gap-4 p-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold tabular-nums flex-shrink-0
                ${idx === 0 ? 'bg-[rgba(212,160,86,0.15)] text-[var(--gold-bright)]' : 'bg-[var(--bg)] text-[var(--text-tertiary)]'}`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[var(--text-primary)]">{s.product}</span>
                  <span className="chip chip-muted">{s.count} 单</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-tertiary)]">
                  <span className="tabular-nums">销 {money.fmtCompact(s.sales)}</span>
                  <span className="tabular-nums">费 -{money.fmtCompact(s.fees)}</span>
                  <span className="tabular-nums">本 -{money.fmtCompact(s.costUSD)}</span>
                </div>
                {/* 利润占比条 */}
                <div className="mt-2 h-1 rounded-full bg-[var(--bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#d4a056] to-[#8a6630]"
                    style={{ width: `${Math.min(100, sharePct)}%` }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0 min-w-[80px]">
                <div className="text-[15px] font-semibold tabular-nums text-[var(--gold-bright)]">{money.fmt(s.profit)}</div>
                <div className="text-[11px] tabular-nums text-[var(--text-tertiary)] mt-0.5">
                  率 {profitRate.toFixed(0)}% · 占 {sharePct.toFixed(0)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部汇总 */}
      <div className="mt-5 pt-5 border-t border-[var(--border)] flex items-center justify-between text-sm">
        <span className="text-[var(--text-tertiary)]">合计 {stats.length} 个产品 · {stats.reduce((s, p) => s + p.count, 0)} 单</span>
        <div className="flex items-center gap-5">
          <span className="text-[var(--text-tertiary)]">总利润 <span className="text-[var(--gold-bright)] font-semibold tabular-nums">${totalProfit.toFixed(2)}</span></span>
        </div>
      </div>
    </div>
  );
}
