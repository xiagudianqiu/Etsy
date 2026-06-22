import { useState } from 'react';
import { Calendar, Layers, ArrowUpRight } from 'lucide-react';

/**
 * 跨月汇总卡片
 * 显示全部月份累计销售/利润/订单/广告等
 * 与本月对比凸显累计成绩
 */
export default function OverviewSummary({ allMonthsSummary, currentProfitData, selectedMonth, monthCount }) {
  if (!allMonthsSummary) return null;

  const fmtMonth = (m) => {
    if (!m) return '';
    const [, mo] = m.split('-');
    return `${parseInt(mo)} 月`;
  };

  const items = [
    {
      label: '累计销售额',
      value: `$${allMonthsSummary.totalSales.toFixed(2)}`,
      sub: `${monthCount} 个月 · 月均 $${(allMonthsSummary.totalSales / monthCount).toFixed(0)}`,
      currentValue: currentProfitData ? `$${currentProfitData.totalSales.toFixed(0)}` : null,
      currentLabel: selectedMonth ? `${fmtMonth(selectedMonth)} 占比` : null,
      currentPct: currentProfitData && allMonthsSummary.totalSales > 0
        ? (currentProfitData.totalSales / allMonthsSummary.totalSales) * 100 : 0,
      gold: false
    },
    {
      label: '累计净利润',
      value: `$${allMonthsSummary.totalProfit.toFixed(2)}`,
      sub: `≈ ¥${(allMonthsSummary.totalProfit * 7.2).toFixed(0)} · 月均 $${allMonthsSummary.avgMonthProfit.toFixed(0)}`,
      currentValue: currentProfitData ? `$${currentProfitData.profit.toFixed(0)}` : null,
      currentLabel: selectedMonth ? `${fmtMonth(selectedMonth)} 占比` : null,
      currentPct: currentProfitData && allMonthsSummary.totalProfit > 0
        ? (currentProfitData.profit / allMonthsSummary.totalProfit) * 100 : 0,
      gold: true
    },
    {
      label: '平均利润率',
      value: `${allMonthsSummary.profitRate.toFixed(1)}%`,
      sub: allMonthsSummary.profitRate >= 40 ? '健康水平' : allMonthsSummary.profitRate >= 25 ? '可接受' : '偏低',
      currentValue: currentProfitData ? `${currentProfitData.profitRate.toFixed(1)}%` : null,
      currentLabel: selectedMonth ? `${fmtMonth(selectedMonth)}` : null,
      gold: false
    },
    {
      label: '累计订单',
      value: allMonthsSummary.totalOrders,
      sub: `客单价 $${allMonthsSummary.avgOrderValue.toFixed(2)}`,
      currentValue: currentProfitData ? `${currentProfitData.orderCount}` : null,
      currentLabel: selectedMonth ? `${fmtMonth(selectedMonth)} 占比` : null,
      currentPct: currentProfitData && allMonthsSummary.totalOrders > 0
        ? (currentProfitData.orderCount / allMonthsSummary.totalOrders) * 100 : 0,
      gold: false
    }
  ];

  return (
    <div className="card hero-glow p-6 fade-in relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--gold)]" />
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">店铺累计</h3>
              <span className="chip chip-gold ml-1">
                {monthCount} 个月数据
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">所有已导入月份的总和</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <div
              key={item.label}
              className={`p-4 rounded-xl border ${item.gold
                ? 'bg-[var(--gold-soft)] border-[rgba(212,160,86,0.3)] trophy-glow'
                : 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}
            >
              <div className="section-label mb-2">{item.label}</div>
              <div className={`text-2xl font-bold tabular-nums ${item.gold ? 'gold-text' : 'text-[var(--text-primary)]'}`}>
                {item.value}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-1.5">{item.sub}</div>

              {item.currentValue !== null && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-tertiary)]">{item.currentLabel}</span>
                  <span className="text-xs tabular-nums">
                    <span className="text-[var(--text-secondary)]">{item.currentValue}</span>
                    {item.currentPct !== undefined && (
                      <span className="text-[var(--text-tertiary)] ml-1.5">
                        ({item.currentPct.toFixed(0)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
