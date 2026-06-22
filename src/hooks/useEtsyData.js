import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { parseEtsyCSV } from '../utils/csvParser';
import { calculateProfit, getFeeBreakdown, calculateAdROI } from '../utils/profitCalculator';

const STORAGE_KEY = 'etsy-profit-data';
const DEFAULT_CONFIG = {
  products: {
    '40oz Stanley LSF': 140,
    '40oz LSF': 95,
    '40oz LSF 粉花': 110,
    '64oz Stanley': 120,
    '40oz Stanley 银钛': 130,
    '32oz 粉色蝴蝶结': 110,
    '32oz': 100
  },
  exchangeRate: 7.2,
  displayCurrency: 'USD',
  costCurrency: 'CNY',
  rates: { USD: 1, CNY: 7.2, EUR: 0.92, GBP: 0.79, JPY: 156, HKD: 7.8, SGD: 1.34 }
};

export function useEtsyData() {
  const [etsyData, setEtsyData] = useLocalStorage(STORAGE_KEY, {
    config: DEFAULT_CONFIG,
    months: {}
  });

  const [selectedMonths, setSelectedMonths] = useState([]);  // 数组：支持多选
  const [compareMode, setCompareMode] = useState(false);
  const [compareMonth, setCompareMonth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取所有已导入的月份
  const availableMonths = useMemo(() => {
    return Object.keys(etsyData.months).sort().reverse();
  }, [etsyData.months]);

  // 兼容旧 API：selectedMonth 是 selectedMonths 第一个
  const selectedMonth = selectedMonths.length > 0 ? selectedMonths[0] : null;
  const setSelectedMonth = useCallback((m) => {
    setSelectedMonths(m ? [m] : []);
  }, []);

  // 合并多月数据成单个 monthData（兼容所有展示组件）
  const currentMonthData = useMemo(() => {
    if (selectedMonths.length === 0) return null;
    const monthsToMerge = selectedMonths
      .map(k => etsyData.months[k])
      .filter(Boolean);
    if (monthsToMerge.length === 0) return null;
    if (monthsToMerge.length === 1) return monthsToMerge[0];

    // 合并多个月：summary 求和、orders 拼接
    const allOrders = [];
    const mergedSummary = {
      totalSales: 0, totalFees: 0, totalTransactionFee: 0, totalProcessingFee: 0,
      totalTax: 0, totalShipping: 0, totalEtsyAds: 0, totalOffsiteAds: 0,
      totalListingFee: 0, totalRefund: 0, otherFees: 0, paymentIncome: 0,
      netAmount: 0, totalAds: 0, orderCount: 0
    };

    monthsToMerge.forEach(md => {
      const s = md.summary || {};
      Object.keys(mergedSummary).forEach(key => {
        mergedSummary[key] += s[key] || 0;
      });
      (md.orders || []).forEach(o => allOrders.push(o));
    });

    return {
      monthKey: selectedMonths.length === availableMonths.length
        ? `全部 ${selectedMonths.length} 月`
        : `${selectedMonths.length} 个月合计`,
      isMerged: true,
      mergedMonths: selectedMonths.slice().sort(),
      filename: monthsToMerge.map(m => m.filename).join(' + '),
      importedAt: new Date().toISOString(),
      orders: allOrders,
      summary: mergedSummary
    };
  }, [selectedMonths, etsyData.months, availableMonths.length]);

  // 设置对比月份的月份数据
  const compareMonthData = useMemo(() => {
    if (!compareMode || !compareMonth || !etsyData.months[compareMonth]) return null;
    return etsyData.months[compareMonth];
  }, [compareMode, compareMonth, etsyData.months]);

  // 计算当前月份的利润数据
  const currentProfitData = useMemo(() => {
    if (!currentMonthData) return null;
    return calculateProfit(currentMonthData, etsyData.config.products, etsyData.config.exchangeRate);
  }, [currentMonthData, etsyData.config]);

  // 计算对比月份的利润数据
  const compareProfitData = useMemo(() => {
    if (!compareMonthData) return null;
    return calculateProfit(compareMonthData, etsyData.config.products, etsyData.config.exchangeRate);
  }, [compareMonthData, etsyData.config]);

  // 获取费用拆解
  const currentFeeBreakdown = useMemo(() => {
    if (!currentMonthData) return [];
    return getFeeBreakdown(currentMonthData);
  }, [currentMonthData]);

  // 计算广告ROI
  const currentAdROI = useMemo(() => {
    if (!currentMonthData) return null;
    return calculateAdROI(currentMonthData);
  }, [currentMonthData]);

  // 跨月汇总（仪表盘"全部月份"视图用）
  const allMonthsSummary = useMemo(() => {
    const months = Object.values(etsyData.months || {});
    if (months.length === 0) return null;

    let totalSales = 0, totalFees = 0, totalNet = 0, totalProfit = 0;
    let totalOrders = 0, totalCostRMB = 0;
    let totalEtsyAds = 0, totalOffsiteAds = 0, totalRefund = 0;
    let totalTransactionFee = 0, totalProcessingFee = 0, totalTax = 0, totalShipping = 0;
    const allOrders = [];

    months.forEach(md => {
      const s = md.summary || {};
      totalSales += s.totalSales || 0;
      totalFees += s.totalFees || 0;
      totalNet += s.netAmount || 0;
      totalOrders += s.orderCount || 0;
      totalEtsyAds += Math.max(0, s.totalEtsyAds || 0);
      totalOffsiteAds += Math.max(0, s.totalOffsiteAds || 0);
      totalRefund += Math.max(0, s.totalRefund || 0);
      totalTransactionFee += Math.max(0, s.totalTransactionFee || 0);
      totalProcessingFee += Math.max(0, s.totalProcessingFee || 0);
      totalTax += Math.max(0, s.totalTax || 0);
      totalShipping += Math.max(0, s.totalShipping || 0);

      const p = calculateProfit(md, etsyData.config.products, etsyData.config.exchangeRate);
      totalProfit += p.profit;
      totalCostRMB += p.productCostRMB;

      (md.orders || []).forEach(o => allOrders.push(o));
    });

    const exRate = etsyData.config.exchangeRate || 7.2;
    return {
      monthCount: months.length,
      totalSales,
      totalFees,
      totalNet,
      totalProfit,
      profitRate: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      avgMonthProfit: months.length > 0 ? totalProfit / months.length : 0,
      productCostUSD: totalCostRMB / exRate,
      productCostRMB: totalCostRMB,
      totalEtsyAds,
      totalOffsiteAds,
      totalAds: totalEtsyAds + totalOffsiteAds,
      totalRefund,
      totalTransactionFee,
      totalProcessingFee,
      totalTax,
      totalShipping,
      adRate: totalSales > 0 ? ((totalEtsyAds + totalOffsiteAds) / totalSales) * 100 : 0,
      refundRate: totalSales > 0 ? (totalRefund / totalSales) * 100 : 0,
      allOrders
    };
  }, [etsyData.months, etsyData.config]);

  // 导入 CSV 文件
  const importCSV = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      const content = await file.text();
      const parsedData = parseEtsyCSV(content, file.name);

      if (!parsedData.monthKey) {
        console.error('解析结果:', parsedData);
        throw new Error(`无法从文件名 "${file.name}" 提取月份信息。请确保文件名格式为: etsy_statement_2026_4.csv`);
      }

      // 检查是否有订单数据
      if (!parsedData.orders || parsedData.orders.length === 0) {
        console.warn(`文件 ${file.name} 没有解析出订单数据`);
      }

      // 更新数据
      setEtsyData(prev => ({
        ...prev,
        months: {
          ...prev.months,
          [parsedData.monthKey]: parsedData
        }
      }));

      // 自动选中刚导入的月份（单选模式）
      setSelectedMonths([parsedData.monthKey]);

      return parsedData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setEtsyData]);

  // 批量导入多个 CSV 文件
  const importMultipleCSV = useCallback(async (files) => {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await importCSV(file);
        results.push(result);
      } catch (err) {
        errors.push({ file: file.name, error: err.message });
      }
    }

    return { results, errors };
  }, [importCSV]);

  // 删除月份数据
  const deleteMonth = useCallback((monthKey) => {
    setEtsyData(prev => {
      const newMonths = { ...prev.months };
      delete newMonths[monthKey];
      return { ...prev, months: newMonths };
    });

    // 从选中列表中移除
    setSelectedMonths(prev => {
      const filtered = prev.filter(k => k !== monthKey);
      if (filtered.length === 0) {
        const remaining = Object.keys(etsyData.months).filter(k => k !== monthKey);
        return remaining.length > 0 ? [remaining[0]] : [];
      }
      return filtered;
    });

    if (compareMonth === monthKey) setCompareMonth(null);
  }, [setEtsyData, compareMonth, etsyData.months]);

  // 更新产品成本配置
  const updateProductCosts = useCallback((newCosts) => {
    setEtsyData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        products: { ...prev.config.products, ...newCosts }
      }
    }));
  }, [setEtsyData]);

  // 更新汇率
  const updateExchangeRate = useCallback((rate) => {
    setEtsyData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        exchangeRate: parseFloat(rate) || 7.2
      }
    }));
  }, [setEtsyData]);

  // 通用 config 字段更新（币种、汇率表等）
  const updateConfigFields = useCallback((fields) => {
    setEtsyData(prev => ({
      ...prev,
      config: { ...prev.config, ...fields }
    }));
  }, [setEtsyData]);

  // 清除所有数据
  const clearAllData = useCallback(() => {
    setEtsyData({ config: DEFAULT_CONFIG, months: {} });
    setSelectedMonths([]);
    setCompareMonth(null);
    setCompareMode(false);
  }, [setEtsyData]);

  return {
    // 数据
    etsyData,
    availableMonths,
    selectedMonth,
    setSelectedMonth,
    selectedMonths,
    setSelectedMonths,
    currentMonthData,
    currentProfitData,
    currentFeeBreakdown,
    currentAdROI,
    allMonthsSummary,

    // 对比模式
    compareMode,
    setCompareMode,
    compareMonth,
    setCompareMonth,
    compareMonthData,
    compareProfitData,

    // 操作
    importCSV,
    importMultipleCSV,
    deleteMonth,
    updateProductCosts,
    updateExchangeRate,
    updateConfigFields,
    clearAllData,

    // 状态
    isLoading,
    error,
    setError
  };
}

export default useEtsyData;