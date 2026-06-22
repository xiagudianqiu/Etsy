import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateOrderProfit } from '../utils/profitCalculator';
import { useMoney } from '../utils/MoneyContext';

const PAGE_SIZE = 12;

export default function OrderList({ orders, config }) {
  const money = useMoney();
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const productCosts = config?.products;
  const exchangeRate = config?.exchangeRate || 7.2;

  const enriched = useMemo(() => {
    if (!orders) return [];
    return orders.map(o => {
      const costRMB = productCosts?.[o.product] ?? 95;
      const costUSD = costRMB / exchangeRate;
      const profit = calculateOrderProfit(o, productCosts, exchangeRate);
      return { ...o, costRMB, costUSD, profit };
    });
  }, [orders, productCosts, exchangeRate]);

  const filtered = useMemo(() => {
    return enriched
      .filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return o.orderId.toLowerCase().includes(q) || o.product?.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        let c = 0;
        if (sortBy === 'date') c = new Date(a.date) - new Date(b.date);
        else if (sortBy === 'sale') c = a.sale - b.sale;
        else if (sortBy === 'profit') c = a.profit - b.profit;
        return sortOrder === 'desc' ? -c : c;
      });
  }, [enriched, search, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  // 分页
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // 搜索/排序变化时回到第一页
  const resetPage = () => setPage(1);

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="opacity-20"><ChevronDown className="w-3 h-3" /></span>;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const fmtDate = (s) => {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-[var(--text-tertiary)] text-sm">本月暂无订单数据</div>
        <div className="text-xs text-[var(--text-muted)] mt-2">请先选择有订单的月份或导入新数据</div>
      </div>
    );
  }

  const totalSales = filtered.reduce((s, o) => s + o.sale, 0);
  const totalRealProfit = filtered.reduce((s, o) => s + o.profit, 0);

  return (
    <div className="card overflow-hidden fade-in">
      <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">订单明细</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{filtered.length} 笔订单</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] w-56">
          <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            placeholder="搜索订单或产品"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>订单</th>
              <th className="cursor-pointer hover:text-[var(--text-secondary)]" onClick={() => toggleSort('date')}>
                <span className="flex items-center gap-1">日期 <SortIcon field="date" /></span>
              </th>
              <th>产品</th>
              <th className="text-right cursor-pointer hover:text-[var(--text-secondary)]" onClick={() => toggleSort('sale')}>
                <span className="flex items-center justify-end gap-1">销售额 <SortIcon field="sale" /></span>
              </th>
              <th className="text-right">费用</th>
              <th className="text-right">成本</th>
              <th className="text-right cursor-pointer hover:text-[var(--text-secondary)]" onClick={() => toggleSort('profit')}>
                <span className="flex items-center justify-end gap-1">利润 <SortIcon field="profit" /></span>
              </th>
              <th className="text-right">利润率</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-[var(--text-tertiary)] py-8">
                  没有匹配「{search}」的订单
                </td>
              </tr>
            ) : paged.map(o => {
              const rate = o.sale > 0 ? (o.profit / o.sale) * 100 : 0;
              return (
                <tr key={o.orderId}>
                  <td>
                    <span className="font-mono text-xs text-[var(--text-tertiary)]">#{o.orderId}</span>
                  </td>
                  <td className="text-[var(--text-secondary)] tabular-nums">{fmtDate(o.date)}</td>
                  <td>
                    <span className="chip chip-muted">{o.product || '未知'}</span>
                  </td>
                  <td className="text-right tabular-nums font-medium text-[var(--text-primary)]">{money.fmt(o.sale)}</td>
                  <td className="text-right tabular-nums text-[var(--down)]">-{money.fmt(o.totalFees)}</td>
                  <td className="text-right tabular-nums text-[var(--text-tertiary)]" title={`¥${o.costRMB.toFixed(0)}`}>-{money.fmt(o.costUSD)}</td>
                  <td className="text-right tabular-nums font-semibold gold-text">{money.fmt(o.profit)}</td>
                  <td className="text-right">
                    <span className={`chip ${rate >= 40 ? 'chip-up' : rate >= 25 ? 'chip-gold' : 'chip-down'}`}>
                      {rate.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
            第 {safePage} / {totalPages} 页 · 共 {filtered.length} 笔
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed w-8 h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed w-8 h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}