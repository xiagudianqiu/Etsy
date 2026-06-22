import { useMemo } from 'react';
import { ArrowRight, Receipt } from 'lucide-react';
import { calculateOrderProfit } from '../utils/profitCalculator';
import { useMoney } from '../utils/MoneyContext';

/**
 * 最新订单 — 总览页右侧卡片，显示最近 5 单
 */
export default function RecentOrders({ orders, config, onViewAll }) {
  const money = useMoney();
  const recent = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const productCosts = config?.products;
    const exchangeRate = config?.exchangeRate || 7.2;
    return orders
      .slice()
      .map(o => ({
        ...o,
        profit: calculateOrderProfit(o, productCosts, exchangeRate)
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [orders, config]);

  if (recent.length === 0) {
    return <div className="card p-8 text-center text-[var(--text-tertiary)]">暂无订单</div>;
  }

  const fmtDate = (s) => {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="card p-6 fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">最新订单</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">最近 5 笔交易</p>
        </div>
        <Receipt className="w-4 h-4 text-[var(--text-tertiary)]" />
      </div>

      <div className="flex-1 space-y-1">
        {recent.map(o => {
          const rate = o.sale > 0 ? (o.profit / o.sale) * 100 : 0;
          return (
            <div
              key={o.orderId}
              className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer"
            >
              <div className="w-1 h-8 rounded-full bg-[var(--gold)] opacity-30" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--text-tertiary)]">#{o.orderId}</span>
                  <span className="text-xs text-[var(--text-muted)]">·</span>
                  <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{fmtDate(o.date)}</span>
                </div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{o.product || '未知'}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[13.5px] tabular-nums text-[var(--text-primary)] font-medium">{money.fmt(o.sale)}</div>
                <div className={`text-[11px] tabular-nums ${o.profit >= 0 ? 'text-[var(--up)]' : 'text-[var(--down)]'}`}>
                  {o.profit >= 0 ? '+' : ''}{money.fmtCompact(o.profit)} · {rate.toFixed(0)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onViewAll}
        className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--gold-bright)] transition-colors w-full"
      >
        查看全部订单
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
