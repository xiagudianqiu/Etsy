import { useMemo } from 'react';
import KPICard from './KPICard';
import { calculateProfit, calculateOrderProfit } from '../utils/profitCalculator';
import { aggregateByDay, findPreviousMonth } from '../utils/dailyAggregator';
import { useMoney } from '../utils/MoneyContext';

/**
 * KPI 行 — 4 张带 sparkline 的卡片
 * 销售额 / 净利润 / 到账 / 客单价
 *
 * 单月：显示对比上月环比 + 当月细节
 * 多月：显示月均 + 当前合计的占比/平均值
 */
export default function KPIRow({ monthData, profitData, compareProfitData, availableMonths, monthsData, selectedMonth, selectedMonths = [], config }) {
  const money = useMoney();
  const productCosts = config?.products;
  const exchangeRate = config?.exchangeRate || 7.2;
  const isMulti = selectedMonths.length > 1;
  const monthCount = selectedMonths.length || 1;

  // 上一个月利润数据（仅单月模式用于环比）
  const prevProfit = useMemo(() => {
    if (isMulti) return null;
    if (compareProfitData) return compareProfitData;
    const prevKey = findPreviousMonth(availableMonths, selectedMonth);
    if (prevKey && monthsData[prevKey]) {
      return calculateProfit(monthsData[prevKey], productCosts, exchangeRate);
    }
    return null;
  }, [isMulti, compareProfitData, availableMonths, selectedMonth, monthsData, productCosts, exchangeRate]);

  if (!profitData || !monthData) return null;

  const orders = monthData.orders || [];

  // sparkline 数据（按日）
  const dailySales = aggregateByDay(orders, { metric: 'sales' });
  const dailyNet = aggregateByDay(orders, { metric: 'net' });

  // 费用按日（订单费用近似）—— 用 sale - net 近似每日费用
  const dailyFees = dailySales.map((d, i) => ({
    date: d.date,
    value: Math.max(0, (d.value || 0) - (dailyNet[i]?.value || 0))
  }));
  const feeSpark = dailyFees.map(d => d.value);

  // 环比 helper
  const trend = (curr, prev) => {
    if (prev === undefined || prev === null || prev === 0) return undefined;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const fmtAbs = (diff) =>
    `${diff >= 0 ? '+' : '-'}${money.fmtCompact(Math.abs(diff))}`;

  const median = getMedian(orders.map(o => o.sale));
  const highest = Math.max(0, ...orders.map(o => o.sale));

  // 多月：计算净利润（含产品成本）
  const totalProfit = profitData.profit || 0;
  const avgMonthSales = profitData.totalSales / monthCount;
  const avgMonthProfit = totalProfit / monthCount;
  const avgMonthNet = profitData.netAmount / monthCount;
  const avgMonthOrders = profitData.orderCount / monthCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KPICard
        label={isMulti ? `累计销售额 · ${monthCount} 月` : '销售额'}
        value={money.fmt(profitData.totalSales)}
        change={!isMulti ? trend(profitData.totalSales, prevProfit?.totalSales) : undefined}
        changeAbs={!isMulti && prevProfit ? fmtAbs(profitData.totalSales - prevProfit.totalSales) : undefined}
        sub={isMulti
          ? `月均 ${money.fmtCompact(avgMonthSales)} · ${profitData.orderCount} 笔订单`
          : `${profitData.orderCount} 笔订单 · 客单价 ${money.fmtCompact(profitData.avgOrderValue)}`}
        sparkData={dailySales.map(d => d.value)}
        sparkType="area"
        accent="gold"
        delay={0.05}
      />
      <KPICard
        label={isMulti ? `累计净利润 · ${monthCount} 月` : '净利润'}
        value={money.fmt(totalProfit)}
        change={!isMulti ? trend(totalProfit, prevProfit?.profit) : undefined}
        changeAbs={!isMulti && prevProfit ? fmtAbs(totalProfit - prevProfit.profit) : undefined}
        sub={isMulti
          ? `月均 ${money.fmtCompact(avgMonthProfit)} · 利润率 ${profitData.profitRate.toFixed(1)}%`
          : `利润率 ${profitData.profitRate.toFixed(1)}%`}
        sparkData={dailyNet.map((d, i) => Math.max(0, d.value - (productCosts ? (calculateOrderProfit({ net: d.value, product: orders[i]?.product }, productCosts, exchangeRate) / d.value || 0.5) * d.value : d.value * 0.5)))}
        sparkType="area"
        accent="up"
        delay={0.1}
      />
      <KPICard
        label={isMulti ? `累计到账 · ${monthCount} 月` : 'Etsy 到账'}
        value={money.fmt(profitData.netAmount)}
        change={!isMulti ? trend(profitData.netAmount, prevProfit?.netAmount) : undefined}
        changeAbs={!isMulti && prevProfit ? fmtAbs(profitData.netAmount - prevProfit.netAmount) : undefined}
        sub={isMulti
          ? `月均 ${money.fmtCompact(avgMonthNet)} · 占销售 ${profitData.totalSales > 0 ? ((profitData.netAmount / profitData.totalSales) * 100).toFixed(1) : 0}%`
          : `占销售 ${profitData.totalSales > 0 ? ((profitData.netAmount / profitData.totalSales) * 100).toFixed(1) : 0}% · 扣费 ${money.fmtCompact(profitData.totalFees)}`}
        sparkData={dailyNet.map(d => d.value)}
        sparkType="area"
        accent="gold"
        delay={0.15}
      />
      <KPICard
        label={isMulti ? `累计订单 · ${monthCount} 月` : '客单价'}
        value={isMulti ? `${profitData.orderCount}` : money.fmt(profitData.avgOrderValue)}
        change={!isMulti ? trend(profitData.avgOrderValue, prevProfit?.avgOrderValue) : undefined}
        changeAbs={!isMulti && prevProfit ? fmtAbs(profitData.avgOrderValue - prevProfit.avgOrderValue) : undefined}
        sub={isMulti
          ? `月均 ${avgMonthOrders.toFixed(0)} 单 · 客单价 ${money.fmtCompact(profitData.avgOrderValue)}`
          : `中位 ${money.fmtCompact(median)} · 最高 ${money.fmtCompact(highest)}`}
        sparkData={dailySales.map(d => d.count)}
        sparkType="bar"
        accent="muted"
        delay={0.2}
      />
    </div>
  );
}

function getMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2);
}
