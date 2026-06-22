/**
 * 多币种支持 + 汇率管理
 *
 * 基准货币：USD（Etsy 账单原始币种）
 * 显示货币：可切换 CNY / EUR / GBP / JPY / HKD / SGD
 *
 * 汇率来源（多 API 容灾）：
 *   1. open.er-api.com（免费、无 key）
 *   2. exchangerate-api.com 镜像
 *   3. 失败则用户手动输入
 *
 * 产品成本：以 USD 为基准存储（USD 成本）
 *   - 用户输入时可选择币种，自动换算为 USD 保存
 *   - 利润计算统一用 USD
 */

export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: '美元', emoji: '🇺🇸' },
  CNY: { code: 'CNY', symbol: '¥', name: '人民币', emoji: '🇨🇳' },
  EUR: { code: 'EUR', symbol: '€', name: '欧元', emoji: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: '英镑', emoji: '🇬🇧' },
  JPY: { code: 'JPY', symbol: '¥', name: '日元', emoji: '🇯🇵' },
  HKD: { code: 'HKD', symbol: 'HK$', name: '港币', emoji: '🇭🇰' },
  SGD: { code: 'SGD', symbol: 'S$', name: '新加坡元', emoji: '🇸🇬' }
};

// 默认汇率（USD → 其他）— API 失败时用
export const DEFAULT_RATES = {
  USD: 1,
  CNY: 7.2,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156,
  HKD: 7.8,
  SGD: 1.34
};

/**
 * 从多个 API 获取实时 USD 汇率
 * 返回 { USD: 1, CNY: 7.2, ... } 形式
 */
export async function fetchRates() {
  const apis = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD'
  ];

  for (const url of apis) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const rates = data.rates || data.conversion_rates;
      if (!rates) continue;
      const result = { USD: 1 };
      Object.keys(CURRENCIES).forEach(code => {
        if (code === 'USD') return;
        if (rates[code]) result[code] = rates[code];
      });
      result._fetchedAt = new Date().toISOString();
      result._source = new URL(url).hostname;
      return result;
    } catch (e) {
      // 继续尝试下一个 API
    }
  }
  throw new Error('所有汇率 API 均不可用，请手动输入');
}

/**
 * 格式化金额：USD 转目标币种
 */
export function formatMoney(usdAmount, displayCurrency = 'USD', rates = DEFAULT_RATES, opts = {}) {
  const { decimals = 2, withSymbol = true, withCode = false } = opts;
  const rate = rates[displayCurrency] || DEFAULT_RATES[displayCurrency] || 1;
  const v = (usdAmount || 0) * rate;
  const cur = CURRENCIES[displayCurrency] || CURRENCIES.USD;
  const formatted = v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  let out = withSymbol ? `${cur.symbol}${formatted}` : formatted;
  if (withCode) out += ` ${cur.code}`;
  return out;
}

/**
 * 把任意币种金额换算为 USD（用于存储成本）
 */
export function toUSD(amount, fromCurrency, rates = DEFAULT_RATES) {
  if (fromCurrency === 'USD') return amount;
  const rate = rates[fromCurrency] || DEFAULT_RATES[fromCurrency] || 1;
  return amount / rate;
}

/**
 * 把 USD 换算为指定币种
 */
export function fromUSD(usdAmount, toCurrency, rates = DEFAULT_RATES) {
  if (toCurrency === 'USD') return usdAmount;
  const rate = rates[toCurrency] || DEFAULT_RATES[toCurrency] || 1;
  return usdAmount * rate;
}
