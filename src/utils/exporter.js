/**
 * 数据导出工具
 * 导出月份利润明细为 CSV（带 UTF-8 BOM，Excel 可直接打开中文不乱码）
 */

const DEFAULT_PRODUCT_COSTS = {
  '104款': 140,
  '80款': 95,
  '64oz': 120,
  '40oz银灰色': 130,
  '32oz': 100,
  '32oz粉色蝴蝶结': 110
};

/**
 * CSV 字段转义（含逗号、引号、换行需用双引号包裹，内部双引号转义为两个）
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildRow(values) {
  return values.map(escapeCSV).join(',');
}

/**
 * 触发浏览器下载
 */
function downloadCSV(content, filename) {
  const BOM = '﻿';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return 'unknown';
  const [, month] = monthKey.split('-');
  return monthKey.replace('-', '_');
}

/**
 * 导出单个月份的完整利润明细
 */
export function exportMonthToCSV(monthKey, monthData, profitData, config) {
  const productCosts = config?.products || DEFAULT_PRODUCT_COSTS;
  const exchangeRate = config?.exchangeRate || 7.2;
  const summary = monthData?.summary || {};
  const orders = monthData?.orders || [];

  const lines = [];

  // ===== 概览区 =====
  lines.push(buildRow(['Etsy 月度利润报表']));
  lines.push(buildRow(['月份', monthKey]));
  lines.push(buildRow(['源文件', monthData?.filename || '']));
  lines.push(buildRow([]));

  lines.push(buildRow(['一、月度概览']));
  lines.push(buildRow(['指标', '数值']));
  lines.push(buildRow(['总销售额 ($)', profitData?.totalSales?.toFixed(2)]));
  lines.push(buildRow(['Etsy 费用合计 ($)', profitData?.totalFees?.toFixed(2)]));
  lines.push(buildRow(['到账净额 ($)', profitData?.netAmount?.toFixed(2)]));
  lines.push(buildRow(['产品成本 (RMB)', profitData?.productCostRMB?.toFixed(0)]));
  lines.push(buildRow([`产品成本 (USD, 汇率${exchangeRate})`, profitData?.productCostUSD?.toFixed(2)]));
  lines.push(buildRow(['净利润 ($)', profitData?.profit?.toFixed(2)]));
  lines.push(buildRow(['利润率 (%)', profitData?.profitRate?.toFixed(1)]));
  lines.push(buildRow(['订单数', profitData?.orderCount]));
  lines.push(buildRow(['客单价 ($)', profitData?.avgOrderValue?.toFixed(2)]));
  lines.push(buildRow([]));

  // ===== 费用拆解 =====
  lines.push(buildRow(['二、Etsy 费用拆解']));
  lines.push(buildRow(['费用类型', '金额 ($)']));
  const feeItems = [
    ['交易手续费', summary.totalTransactionFee],
    ['处理费', summary.totalProcessingFee],
    ['销售税', summary.totalTax],
    ['运费标签', summary.totalShipping],
    ['Etsy 站内广告', summary.totalEtsyAds],
    ['站外广告 Offsite Ads', summary.totalOffsiteAds],
    ['Listing 费', summary.totalListingFee],
    ['退款', summary.totalRefund],
    ['其他费用', summary.otherFees]
  ];
  feeItems.forEach(([name, val]) => {
    lines.push(buildRow([name, Math.abs(val || 0).toFixed(2)]));
  });
  lines.push(buildRow([]));

  // ===== 订单明细 =====
  lines.push(buildRow(['三、订单明细']));
  lines.push(buildRow([
    '订单号', '日期', '产品', '销售额 ($)', 'Etsy费用 ($)',
    '产品成本 (RMB)', '产品成本 (USD)', '净利润 ($)', '利润率 (%)'
  ]));

  orders.forEach(order => {
    const costRMB = productCosts[order.product] ?? 95;
    const costUSD = costRMB / exchangeRate;
    const net = order.net ?? 0;
    const orderProfit = net - costUSD;
    const profitRate = order.sale > 0 ? (orderProfit / order.sale) * 100 : 0;
    lines.push(buildRow([
      `#${order.orderId}`,
      order.date || '',
      order.product || '未知',
      order.sale?.toFixed(2),
      order.totalFees?.toFixed(2),
      costRMB,
      costUSD.toFixed(2),
      orderProfit.toFixed(2),
      profitRate.toFixed(1)
    ]));
  });

  const csv = lines.join('\r\n');
  downloadCSV(csv, `etsy_profit_${formatMonthLabel(monthKey)}.csv`);
}

export default { exportMonthToCSV };
