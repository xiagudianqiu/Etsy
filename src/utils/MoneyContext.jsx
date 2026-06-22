import { createContext, useContext, useMemo } from 'react';
import { CURRENCIES, DEFAULT_RATES, formatMoney } from './currency';

/**
 * 货币上下文 — 全局共享当前显示币种 + 汇率
 * 避免每个组件都通过 props 传 displayCurrency
 */
const MoneyContext = createContext({
  currency: 'USD',
  rates: DEFAULT_RATES,
  fmt: (usd) => `$${(usd || 0).toFixed(2)}`,
  fmtCompact: (usd) => `$${Math.round(usd || 0)}`,
  symbol: '$',
  code: 'USD',
  name: '美元'
});

export function MoneyProvider({ currency = 'USD', rates = DEFAULT_RATES, children }) {
  const value = useMemo(() => {
    const cur = CURRENCIES[currency] || CURRENCIES.USD;
    return {
      currency,
      rates,
      symbol: cur.symbol,
      code: cur.code,
      name: cur.name,
      // 标准格式：$1,234.56
      fmt: (usd, opts = {}) => formatMoney(usd, currency, rates, { decimals: 2, ...opts }),
      // 紧凑格式：$1,234（取整）
      fmtCompact: (usd) => formatMoney(usd, currency, rates, { decimals: 0 }),
      // 数字部分（不带符号）
      raw: (usd) => formatMoney(usd, currency, rates, { decimals: 2, withSymbol: false })
    };
  }, [currency, rates]);

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoney() {
  return useContext(MoneyContext);
}
