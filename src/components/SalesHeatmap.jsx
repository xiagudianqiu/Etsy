import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMoney } from '../utils/MoneyContext';

/**
 * 销售日历热力图 — 类似 GitHub contributions
 * 增强悬浮反馈 + 自带月份翻阅选择器（独立于全局多选）
 */
export default function SalesHeatmap({ orders, selectedMonth, availableMonths = [], monthsData = {} }) {
  const money = useMoney();
  // 日历自带翻页：默认显示全局选中月（取第一个），可左右切换
  const [viewMonth, setViewMonth] = useState(selectedMonth);

  // 跟随全局选择变化（单选时跟随，多选时保持上次或取第一个）
  useMemo(() => {
    if (selectedMonth && !availableMonths.includes(viewMonth)) {
      setViewMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const sortedMonths = useMemo(() => [...availableMonths].sort(), [availableMonths]);
  const curIdx = sortedMonths.indexOf(viewMonth);
  const canPrev = curIdx > 0;
  const canNext = curIdx >= 0 && curIdx < sortedMonths.length - 1;

  // 获取当前查看月份的订单
  const viewOrders = monthsData[viewMonth]?.orders || orders || [];

  const { weeks, max, total, busiestDay, monthSales, monthProfit } = useMemo(() => {
    if (!viewOrders.length || !viewMonth) {
      return { weeks: [], max: 0, total: 0, busiestDay: null, monthSales: 0, monthProfit: 0 };
    }

    // 按日聚合
    const dayMap = new Map();
    viewOrders.forEach(o => {
      if (!o.date) return;
      if (!dayMap.has(o.date)) dayMap.set(o.date, { date: o.date, count: 0, sales: 0, orders: [] });
      const b = dayMap.get(o.date);
      b.count += 1;
      b.sales += o.sale || 0;
      b.orders.push(o);
    });

    const [year, month] = viewMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const weeks = [];
    let currentWeek = Array(startWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = dayMap.get(key) || { count: 0, sales: 0, orders: [] };
      currentWeek.push({ day: d, date: key, ...dayData });
      if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    const max = Math.max(...Array.from(dayMap.values()).map(d => d.count), 0);
    const total = viewOrders.length;
    const busiestDay = Array.from(dayMap.values()).sort((a, b) => b.count - a.count)[0] || null;
    const monthSales = viewOrders.reduce((s, o) => s + (o.sale || 0), 0);

    return { weeks, max, total, busiestDay, monthSales, monthProfit: 0 };
  }, [viewOrders, viewMonth]);

  if (weeks.length === 0) {
    return (
      <div className="card p-6 fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--gold)]" />
            销售日历
          </h3>
        </div>
        <div className="mt-6 text-center py-6">
          <div className="text-sm text-[var(--text-tertiary)]">该月份暂无订单</div>
        </div>
      </div>
    );
  }

  const getColor = (count) => {
    if (!count) return 'rgba(255,255,255,0.025)';
    const intensity = max > 0 ? count / max : 0;
    if (intensity < 0.34) return 'rgba(212, 160, 86, 0.28)';
    if (intensity < 0.67) return 'rgba(212, 160, 86, 0.58)';
    return 'rgba(245, 185, 85, 0.92)';
  };

  const getHoverBorder = (count) => {
    if (!count) return 'var(--border)';
    const intensity = max > 0 ? count / max : 0;
    if (intensity < 0.34) return 'rgba(212, 160, 86, 0.5)';
    if (intensity < 0.67) return 'rgba(212, 160, 86, 0.8)';
    return 'rgba(245, 185, 85, 1)';
  };

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const fmtMonth = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return `${y} 年 ${parseInt(mo)} 月`;
  };

  const goPrev = () => canPrev && setViewMonth(sortedMonths[curIdx - 1]);
  const goNext = () => canNext && setViewMonth(sortedMonths[curIdx + 1]);

  return (
    <div className="card p-6 fade-in">
      {/* 头部：标题 + 月份翻阅器 */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--gold)]" />
            销售日历
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
            共 {total} 单 · 销售额 {money.fmtCompact(monthSales)}
            {busiestDay && ` · 最忙 ${parseInt(busiestDay.date.split('-')[2])} 日`}
          </p>
        </div>

        {/* 月份翻阅选择器 */}
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex-shrink-0">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--gold-bright)] hover:bg-[var(--gold-soft)] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            title="上个月"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums px-1 min-w-[78px] text-center">
            {fmtMonth(viewMonth)}
          </span>
          <button
            onClick={goNext}
            disabled={!canNext}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--gold-bright)] hover:bg-[var(--gold-soft)] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            title="下个月"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-tertiary)] mb-2">
        <span>少</span>
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.025)' }} />
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(212, 160, 86, 0.28)' }} />
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(212, 160, 86, 0.58)' }} />
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(245, 185, 85, 0.92)' }} />
        <span>多</span>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 gap-1.5 text-[10px] text-[var(--text-tertiary)] text-center mb-1.5">
        {weekdays.map(w => <div key={w} className="py-0.5">{w}</div>)}
      </div>

      {/* 日历格子 */}
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="aspect-square" />;
              const hasOrders = day.count > 0;
              // 基础底色（hover 时通过 CSS 变量提亮）
              const baseColor = getColor(day.count);
              const emptyBase = 'rgba(255,255,255,0.025)';
              return (
                <div
                  key={di}
                  className={`day-cell ${hasOrders ? 'has-orders' : ''} aspect-square rounded-md flex items-center justify-center text-[10px] font-medium tabular-nums relative group ${hasOrders ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    background: baseColor,
                    color: hasOrders ? '#1a1208' : 'var(--text-muted)'
                  }}
                >
                  {day.day}

                  {/* 增强悬浮 tooltip */}
                  {hasOrders && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-30 whitespace-nowrap">
                      <div className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                        {parseInt(day.date.split('-')[1])} 月 {day.day} 日
                      </div>
                      <div className="text-[10px] text-[var(--gold-bright)] font-medium tabular-nums">
                        {day.count} 单 · {money.fmt(day.sales)}
                      </div>
                      {/* 订单产品明细（最多3条） */}
                      <div className="mt-1.5 pt-1.5 border-t border-[var(--border)] space-y-0.5">
                        {day.orders.slice(0, 3).map(o => (
                          <div key={o.orderId} className="text-[9px] text-[var(--text-tertiary)] tabular-nums">
                            #{o.orderId} · {money.fmtCompact(o.sale)} · {o.product}
                          </div>
                        ))}
                        {day.orders.length > 3 && (
                          <div className="text-[9px] text-[var(--text-muted)]">+{day.orders.length - 3} 单…</div>
                        )}
                      </div>
                      {/* 小箭头 */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-[var(--bg-elevated)] border-r border-b border-[var(--border-strong)] rotate-45" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 底部统计 */}
      <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-tertiary)]">
          有订单日 <span className="text-[var(--text-primary)] tabular-nums font-medium">{weeks.flat().filter(d => d && d.count > 0).length}</span> 天
        </span>
        <span className="text-[var(--text-tertiary)]">
          日均 <span className="text-[var(--gold-bright)] tabular-nums font-medium">{(total / new Date(viewMonth.split('-')[0], viewMonth.split('-')[1], 0).getDate()).toFixed(1)}</span> 单
        </span>
      </div>
    </div>
  );
}
