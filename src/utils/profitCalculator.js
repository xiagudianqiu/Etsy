/**
 * 利润计算工具函数
 *
 * 成本存储约定：
 *   - 新版：products[name] = USD 成本（直接用，无需汇率换算）
 *   - 旧版：products[name] = RMB 成本 + exchangeRate（需要 RMB/exchangeRate）
 *
 * 兼容判断：如果 products 的值 > 30（明显是 RMB），按旧版处理；
 *           ≤ 30 按 USD 处理。这是经验阈值（一个杯子 USD 成本最多 30 美元）。
 */

const DEFAULT_PRODUCT_COSTS = {
  '40oz Stanley LSF': 140,
  '40oz LSF': 95,
  '40oz LSF 粉花': 110,
  '64oz Stanley': 120,
  '40oz Stanley 银钛': 130,
  '32oz 粉色蝴蝶结': 110,
  '32oz': 100
};

/**
 * 从产品成本配置中获取该产品的 USD 成本
 * 自动判断是 USD 还是 RMB 存储
 */
function getCostUSD(rawCost, exchangeRate = 7.2) {
  if (rawCost === undefined || rawCost === null) return 95 / exchangeRate;
  // 阈值判断：> 30 视为 RMB（向后兼容旧数据）
  return rawCost > 30 ? rawCost / exchangeRate : rawCost;
}

/**
 * 计算单个订单的真实利润（含产品成本）
 */
export function calculateOrderProfit(order, productCosts = DEFAULT_PRODUCT_COSTS, exchangeRate = 7.2) {
  if (!order) return 0;
  const productCostUSD = getCostUSD(productCosts[order.product], exchangeRate);
  return (order.net ?? 0) - productCostUSD;
}

/**
 * 计算月份数据的利润
 */
export function calculateProfit(monthData, productCosts = DEFAULT_PRODUCT_COSTS, exchangeRate = 7.2) {
  if (!monthData || !monthData.orders) {
    return {
      totalSales: 0,
      totalFees: 0,
      netAmount: 0,
      productCostUSD: 0,
      productCostRMB: 0,
      profit: 0,
      profitRate: 0,
      orderCount: 0,
      productCount: {},
      avgOrderValue: 0
    };
  }

  const orders = monthData.orders;

  // 计算产品成本（USD）
  let productCostUSD = 0;
  let productCostRMB = 0;
  const productCount = {};

  orders.forEach(order => {
    const product = order.product || '未识别';
    const costUSD = getCostUSD(productCosts[product], exchangeRate);
    productCostUSD += costUSD;
    productCostRMB += costUSD * exchangeRate;  // 反算 RMB 用于显示
    productCount[product] = (productCount[product] || 0) + 1;
  });

  const { totalSales, totalFees, netAmount, orderCount } = monthData.summary;
  const profit = netAmount - productCostUSD;
  const profitRate = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  return {
    totalSales,
    totalFees,
    netAmount,
    productCostUSD,
    productCostRMB,
    profit,
    profitRate,
    orderCount,
    productCount,
    avgOrderValue: orderCount > 0 ? totalSales / orderCount : 0
  };
}

/**
 * 获取费用拆解数据（取绝对值用于饼图展示）
 */
export function getFeeBreakdown(monthData) {
  if (!monthData || !monthData.summary) {
    return [];
  }

  const { summary } = monthData;
  const breakdown = [];

  const items = [
    { name: '交易手续费', value: Math.abs(summary.totalTransactionFee || 0), color: '#6366f1' },
    { name: '处理费', value: Math.abs(summary.totalProcessingFee || 0), color: '#8b5cf6' },
    { name: '销售税', value: Math.abs(summary.totalTax || 0), color: '#ec4899' },
    { name: '运费标签', value: Math.abs(summary.totalShipping || 0), color: '#14b8a6' },
    { name: 'Etsy站内广告', value: Math.abs(summary.totalEtsyAds || 0), color: '#f59e0b' },
    { name: '站外广告', value: Math.abs(summary.totalOffsiteAds || 0), color: '#ef4444' },
    { name: '退款', value: Math.abs(summary.totalRefund || 0), color: '#64748b' },
    { name: 'Listing费', value: Math.abs(summary.totalListingFee || 0), color: '#06b6d4' },
    { name: '其他费用', value: Math.abs(summary.otherFees || 0), color: '#475569' }
  ];

  items.forEach(item => {
    if (item.value > 0.01) breakdown.push(item);
  });

  return breakdown;
}

/**
 * 计算广告ROI
 */
export function calculateAdROI(monthData) {
  if (!monthData || !monthData.summary) {
    return { adCost: 0, adRate: 0, roi: 0, etsyAds: 0, offsiteAds: 0 };
  }

  const { summary } = monthData;
  const etsyAds = Math.abs(summary.totalEtsyAds || 0);
  const offsiteAds = Math.abs(summary.totalOffsiteAds || 0);
  const adCost = etsyAds + offsiteAds;
  const totalSales = summary.totalSales || 0;
  const adRate = totalSales > 0 ? (adCost / totalSales) * 100 : 0;
  const roi = adCost > 0 ? (totalSales / adCost) - 1 : 0;

  return {
    adCost,
    adRate,
    roi: roi * 100,
    etsyAds,
    offsiteAds
  };
}

/**
 * 格式化货币
 */
export function formatCurrency(amount, currency = 'USD') {
  const v = Number.isFinite(amount) ? amount : 0;
  if (currency === 'RMB') {
    return `¥${v.toFixed(2)}`;
  }
  return `$${v.toFixed(2)}`;
}

/**
 * 格式化百分比
 */
export function formatPercent(value) {
  const v = Number.isFinite(value) ? value : 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

/**
 * 获取默认产品成本
 */
export function getDefaultProductCosts() {
  return { ...DEFAULT_PRODUCT_COSTS };
}

export default {
  calculateProfit,
  calculateOrderProfit,
  getFeeBreakdown,
  calculateAdROI,
  formatCurrency,
  formatPercent,
  getDefaultProductCosts
};
