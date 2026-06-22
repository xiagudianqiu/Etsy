/**
 * 日维度聚合工具 — 用于 sparkline 数据源
 * Etsy 订单的 date 字段格式为 "2026-04-28"（已被 csvParser 标准化）
 */

import { calculateOrderProfit } from './profitCalculator';

/**
 * 按日聚合订单
 * @param {Array} orders - 订单数组
 * @param {Object} options - { metric: 'sales'|'profit'|'count'|'net', productCosts, exchangeRate }
 * @returns {Array<{date: string, value: number, count: number}>}
 *   按日期升序，包含订单覆盖范围内所有日（空日填 0）
 */
export function aggregateByDay(orders, options = {}) {
  if (!orders || orders.length === 0) return [];

  const { metric = 'sales', productCosts, exchangeRate = 7.2 } = options;

  // 1) 按日聚合
  const map = new Map();
  orders.forEach(o => {
    const date = o.date;
    if (!date) return;
    if (!map.has(date)) map.set(date, { date, value: 0, count: 0 });
    const bucket = map.get(date);
    bucket.count += 1;
    if (metric === 'sales') bucket.value += o.sale || 0;
    else if (metric === 'count') bucket.value += 1;
    else if (metric === 'net') bucket.value += o.net || 0;
    else if (metric === 'profit') bucket.value += calculateOrderProfit(o, productCosts, exchangeRate);
  });

  // 2) 找出范围并填空
  const dates = Array.from(map.keys()).sort();
  if (dates.length === 0) return [];
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);

  const result = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = formatDate(d);
    if (map.has(key)) {
      result.push(map.get(key));
    } else {
      result.push({ date: key, value: 0, count: 0 });
    }
  }
  return result;
}

/**
 * 把日聚合压缩成 sparkline 需要的纯数值数组
 */
export function toSparklineValues(dailyData) {
  return dailyData.map(d => d.value);
}

/**
 * 提取常用统计
 */
export function getDailyStats(dailyData) {
  if (!dailyData || dailyData.length === 0) {
    return { peak: 0, peakDate: null, avg: 0, total: 0, days: 0 };
  }
  let peak = 0, peakDate = null, total = 0;
  dailyData.forEach(d => {
    total += d.value;
    if (d.value > peak) {
      peak = d.value;
      peakDate = d.date;
    }
  });
  return {
    peak,
    peakDate,
    avg: total / dailyData.length,
    total,
    days: dailyData.length
  };
}

/**
 * 找出当前 selectedMonth 在 availableMonths 中的「上一个月」key
 */
export function findPreviousMonth(availableMonths, selectedMonth) {
  if (!availableMonths || !selectedMonth) return null;
  const sorted = availableMonths.slice().sort();
  const idx = sorted.indexOf(selectedMonth);
  return idx > 0 ? sorted[idx - 1] : null;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
