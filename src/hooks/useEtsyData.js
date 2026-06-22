import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './useAuth';
import { parseEtsyCSV } from '../utils/csvParser';
import { calculateProfit, getFeeBreakdown, calculateAdROI } from '../utils/profitCalculator';

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

const QUOTA_UPLOAD = 30;
const QUOTA_EMAIL = 31;

export function useEtsyData() {
  const { user } = useAuth();

  const [etsyData, setEtsyData] = useState({
    config: DEFAULT_CONFIG,
    months: {}
  });
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareMonth, setCompareMonth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);  // 首次加载
  const [error, setError] = useState(null);
  const [quota, setQuota] = useState({ uploads: 0, emails: 0, uploadLimit: QUOTA_UPLOAD, emailLimit: QUOTA_EMAIL });
  const [mailConfig, setMailConfig] = useState({ enabled: false, to: '' });

  // ===== 加载用户数据（月份 + 配置 + 配额）=====
  const loadUserData = useCallback(async () => {
    if (!user || !supabase) return;
    setLoadingData(true);

    try {
      // 并行加载 months 和 profile
      const [monthsResp, profileResp] = await Promise.all([
        supabase.from('months').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);

      // 月份 → 转成 { monthKey: {...} } 形态（兼容旧接口）
      const months = {};
      (monthsResp.data || []).forEach(row => {
        months[row.month_key] = {
          monthKey: row.month_key,
          filename: row.filename,
          importedAt: row.imported_at,
          orders: row.orders || [],
          summary: row.summary || {}
        };
      });

      // 配置（合并默认值）
      const profile = profileResp.data || {};
      const config = {
        ...DEFAULT_CONFIG,
        ...(profile.config || {}),
        evolinkApiKey: profile.evolink_api_key || ''  // AI 生图 Key（独立字段）
      };

      setEtsyData({ config, months });
      setQuota({
        uploads: profile.uploads_this_month || 0,
        emails: profile.emails_this_month || 0,
        uploadLimit: QUOTA_UPLOAD,
        emailLimit: QUOTA_EMAIL
      });
      setMailConfig({
        enabled: !!profile.mail_enabled,
        to: profile.mail_to || ''
      });
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('加载数据失败：' + err.message);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // ===== 派生数据（保持旧接口）=====
  const availableMonths = useMemo(() => Object.keys(etsyData.months).sort().reverse(), [etsyData.months]);

  const selectedMonth = selectedMonths.length > 0 ? selectedMonths[0] : null;
  const setSelectedMonth = useCallback((m) => setSelectedMonths(m ? [m] : []), []);

  const currentMonthData = useMemo(() => {
    if (selectedMonths.length === 0) return null;
    const monthsToMerge = selectedMonths.map(k => etsyData.months[k]).filter(Boolean);
    if (monthsToMerge.length === 0) return null;
    if (monthsToMerge.length === 1) return monthsToMerge[0];

    const allOrders = [];
    const mergedSummary = {
      totalSales: 0, totalFees: 0, totalTransactionFee: 0, totalProcessingFee: 0,
      totalTax: 0, totalShipping: 0, totalEtsyAds: 0, totalOffsiteAds: 0,
      totalListingFee: 0, totalRefund: 0, otherFees: 0, paymentIncome: 0,
      netAmount: 0, totalAds: 0, orderCount: 0
    };
    monthsToMerge.forEach(md => {
      const s = md.summary || {};
      Object.keys(mergedSummary).forEach(key => { mergedSummary[key] += s[key] || 0; });
      (md.orders || []).forEach(o => allOrders.push(o));
    });

    return {
      monthKey: selectedMonths.length === availableMonths.length
        ? `全部 ${selectedMonths.length} 月` : `${selectedMonths.length} 个月合计`,
      isMerged: true,
      mergedMonths: selectedMonths.slice().sort(),
      filename: monthsToMerge.map(m => m.filename).join(' + '),
      importedAt: new Date().toISOString(),
      orders: allOrders,
      summary: mergedSummary
    };
  }, [selectedMonths, etsyData.months, availableMonths.length]);

  const compareMonthData = useMemo(() => {
    if (!compareMode || !compareMonth || !etsyData.months[compareMonth]) return null;
    return etsyData.months[compareMonth];
  }, [compareMode, compareMonth, etsyData.months]);

  const currentProfitData = useMemo(() => {
    if (!currentMonthData) return null;
    return calculateProfit(currentMonthData, etsyData.config.products, etsyData.config.exchangeRate);
  }, [currentMonthData, etsyData.config]);

  const compareProfitData = useMemo(() => {
    if (!compareMonthData) return null;
    return calculateProfit(compareMonthData, etsyData.config.products, etsyData.config.exchangeRate);
  }, [compareMonthData, etsyData.config]);

  const currentFeeBreakdown = useMemo(() => {
    if (!currentMonthData) return [];
    return getFeeBreakdown(currentMonthData);
  }, [currentMonthData]);

  const currentAdROI = useMemo(() => {
    if (!currentMonthData) return null;
    return calculateAdROI(currentMonthData);
  }, [currentMonthData]);

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
      monthCount: months.length, totalSales, totalFees, totalNet, totalProfit,
      profitRate: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      avgMonthProfit: months.length > 0 ? totalProfit / months.length : 0,
      productCostUSD: totalCostRMB / exRate, productCostRMB: totalCostRMB,
      totalEtsyAds, totalOffsiteAds, totalAds: totalEtsyAds + totalOffsiteAds, totalRefund,
      totalTransactionFee, totalProcessingFee, totalTax, totalShipping,
      adRate: totalSales > 0 ? ((totalEtsyAds + totalOffsiteAds) / totalSales) * 100 : 0,
      refundRate: totalSales > 0 ? (totalRefund / totalSales) * 100 : 0,
      allOrders
    };
  }, [etsyData.months, etsyData.config]);

  // ===== 导入 CSV =====
  const importCSV = useCallback(async (file) => {
    if (!user || !supabase) throw new Error('未登录');

    // 配额检查
    if (quota.uploads >= quota.uploadLimit) {
      throw new Error(`本月上传配额已用完（${quota.uploadLimit} 个），下月 1 号自动重置`);
    }

    setIsLoading(true);
    setError(null);

    try {
      const content = await file.text();
      const parsedData = parseEtsyCSV(content, file.name);

      if (!parsedData.monthKey) {
        throw new Error(`无法从文件名 "${file.name}" 提取月份。格式应为 etsy_statement_2026_4.csv`);
      }

      // 写入 Supabase（upsert：同月份覆盖）
      const { error: insertError } = await supabase
        .from('months')
        .upsert({
          user_id: user.id,
          month_key: parsedData.monthKey,
          filename: parsedData.filename,
          imported_at: parsedData.importedAt,
          summary: parsedData.summary,
          orders: parsedData.orders
        }, { onConflict: 'user_id,month_key' });

      if (insertError) throw insertError;

      // 更新本地状态
      setEtsyData(prev => ({
        ...prev,
        months: { ...prev.months, [parsedData.monthKey]: parsedData }
      }));
      setSelectedMonths([parsedData.monthKey]);

      // 配额计数 +1（乐观更新）
      setQuota(prev => ({ ...prev, uploads: prev.uploads + 1 }));
      // 同步到数据库
      await supabase.rpc('increment_upload_count', { p_user_id: user.id });

      return parsedData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, quota]);

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

  // ===== 删除月份 =====
  const deleteMonth = useCallback(async (monthKey) => {
    if (!user || !supabase) return;
    await supabase.from('months').delete().eq('user_id', user.id).eq('month_key', monthKey);

    setEtsyData(prev => {
      const newMonths = { ...prev.months };
      delete newMonths[monthKey];
      return { ...prev, months: newMonths };
    });

    setSelectedMonths(prev => {
      const filtered = prev.filter(k => k !== monthKey);
      if (filtered.length === 0) {
        const remaining = availableMonths.filter(k => k !== monthKey);
        return remaining.length > 0 ? [remaining[0]] : [];
      }
      return filtered;
    });
    if (compareMonth === monthKey) setCompareMonth(null);
  }, [user, availableMonths, compareMonth]);

  // ===== 更新配置 =====
  const updateProductCosts = useCallback((newCosts) => {
    setEtsyData(prev => ({
      ...prev,
      config: { ...prev.config, products: { ...prev.config.products, ...newCosts } }
    }));
  }, []);

  const updateExchangeRate = useCallback((rate) => {
    setEtsyData(prev => ({
      ...prev, config: { ...prev.config, exchangeRate: parseFloat(rate) || 7.2 }
    }));
  }, []);

  const updateConfigFields = useCallback(async (fields) => {
    setEtsyData(prev => ({ ...prev, config: { ...prev.config, ...fields } }));
    // 持久化到 Supabase
    if (user && supabase) {
      const newConfig = { ...etsyData.config, ...fields };
      await supabase.from('profiles').update({ config: newConfig }).eq('id', user.id);
    }
  }, [user, etsyData.config]);

  // ===== AI 生图 API Key =====
  const updateEvolinkKey = useCallback(async (key) => {
    if (!user || !supabase) return;
    setEtsyData(prev => ({ ...prev, config: { ...prev.config, evolinkApiKey: key } }));
    await supabase.from('profiles').update({ evolink_api_key: key }).eq('id', user.id);
  }, [user]);

  // ===== 邮件备份配置 =====
  const updateMailConfig = useCallback(async ({ mailEnabled, mailTo }) => {
    if (!user || !supabase) return;
    const update = {};
    if (mailEnabled !== undefined) update.mail_enabled = mailEnabled;
    if (mailTo !== undefined) update.mail_to = mailTo;
    await supabase.from('profiles').update(update).eq('id', user.id);
    // 同步本地状态
    setMailConfig(prev => ({
      enabled: mailEnabled !== undefined ? mailEnabled : prev.enabled,
      to: mailTo !== undefined ? mailTo : prev.to
    }));
  }, [user]);

  const clearAllData = useCallback(async () => {
    if (!user || !supabase) return;
    await supabase.from('months').delete().eq('user_id', user.id);
    setEtsyData({ config: DEFAULT_CONFIG, months: {} });
    setSelectedMonths([]);
    setCompareMonth(null);
    setCompareMode(false);
  }, [user]);

  return {
    // 数据
    etsyData,
    availableMonths,
    selectedMonth, setSelectedMonth,
    selectedMonths, setSelectedMonths,
    currentMonthData, currentProfitData, currentFeeBreakdown, currentAdROI,
    allMonthsSummary,
    compareMode, setCompareMode, compareMonth, setCompareMonth,
    compareMonthData, compareProfitData,

    // 操作
    importCSV, importMultipleCSV, deleteMonth,
    updateProductCosts, updateExchangeRate, updateConfigFields,
    updateMailConfig, updateEvolinkKey, clearAllData,
    reload: loadUserData,

    // 配额
    quota,
    mailConfig,

    // 状态
    isLoading, loadingData, error, setError
  };
}

export default useEtsyData;
