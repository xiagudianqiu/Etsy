import { useEffect, useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Sparkles, TrendingUp } from 'lucide-react';
import { calculateProfit, calculateOrderProfit } from '../utils/profitCalculator';
import { aggregateByDay, getDailyStats, findPreviousMonth, toSparklineValues } from '../utils/dailyAggregator';
import { formatMoney, CURRENCIES, DEFAULT_RATES } from '../utils/currency';
import { useMoney } from '../utils/MoneyContext';
import Sparkline from './Sparkline';

/**
 * HERO 焦点区
 * 左：净利润大数字 + 环比 + 智能洞察
 * 右：本月日销售走势 sparkline（大图）
 */
export default function HeroSection({
  profitData, monthData, compareProfitData,
  availableMonths, monthsData, selectedMonth, config
}) {
  const money = useMoney();
  const [num, setNum] = useState({ profit: 0, rate: 0 });

  const tProfit = profitData?.profit || 0;
  const tRate = profitData?.profitRate || 0;
  const tSales = profitData?.totalSales || 0;

  // 数字滚动
  useEffect(() => {
    let frame;
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setNum({ profit: tProfit * e, rate: tRate * e });
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tProfit, tRate]);

  // 日销售走势（右侧大 sparkline）
  const dailySales = useMemo(() => {
    if (!monthData?.orders) return [];
    return aggregateByDay(monthData.orders, { metric: 'sales' });
  }, [monthData]);

  const dailyStats = useMemo(() => getDailyStats(dailySales), [dailySales]);

  // 环比
  const change = useMemo(() => {
    let prevProfit = compareProfitData?.profit;
    if (prevProfit === undefined) {
      const prevKey = findPreviousMonth(availableMonths, selectedMonth);
      if (prevKey && monthsData[prevKey]) {
        prevProfit = calculateProfit(monthsData[prevKey], config?.products, config?.exchangeRate || 7.2).profit;
      }
    }
    if (prevProfit === undefined || prevProfit === 0) {
      return { pct: 0, absDiff: 0, hasCompare: false };
    }
    return {
      pct: ((tProfit - prevProfit) / Math.abs(prevProfit)) * 100,
      absDiff: tProfit - prevProfit,
      hasCompare: true
    };
  }, [compareProfitData, tProfit, availableMonths, selectedMonth, monthsData, config]);

  // 智能洞察
  const insights = useMemo(() => {
    if (!profitData || !monthData) return [];
    const s = monthData.summary || {};
    const out = [];

    const fees = [
      { name: '手续费', v: Math.max(0, s.totalTransactionFee || 0) },
      { name: '处理费', v: Math.max(0, s.totalProcessingFee || 0) },
      { name: '销售税', v: Math.max(0, s.totalTax || 0) },
      { name: '运费', v: Math.max(0, s.totalShipping || 0) },
      { name: '站内广告', v: Math.max(0, s.totalEtsyAds || 0) },
      { name: '站外广告', v: Math.max(0, s.totalOffsiteAds || 0) }
    ].sort((a, b) => b.v - a.v);
    if (fees[0]?.v > 0) {
      out.push({ icon: '💸', text: `${fees[0].name}是最大支出，吃掉了 $${fees[0].v.toFixed(0)}` });
    }

    const orders = monthData.orders || [];
    if (orders.length > 0) {
      const byProduct = {};
      orders.forEach(o => {
        const p = o.product || '未知';
        byProduct[p] = (byProduct[p] || 0) + (o.sale || 0);
      });
      const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        const pct = (top[1] / tSales) * 100;
        out.push({ icon: '🏆', text: `${top[0]} 贡献了 ${pct.toFixed(0)}% 的销售额` });
      }
    }

    const adCost = Math.max(0, s.totalEtsyAds || 0) + Math.max(0, s.totalOffsiteAds || 0);
    if (tSales > 0 && adCost > 0) {
      const pct = (adCost / tSales) * 100;
      const desc = pct < 5 ? '健康' : pct < 10 ? '可控' : '偏高';
      out.push({ icon: '📣', text: `广告占销售额 ${pct.toFixed(1)}% · ${desc}` });
    }

    return out.slice(0, 3);
  }, [profitData, monthData, tSales]);

  if (!profitData) return null;

  const isUp = change.pct >= 0;
  const exRate = config?.exchangeRate || 7.2;

  return (
    <div className="card hero-glow p-8 fade-in relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* 左：焦点数字 */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 mb-4">
            <span className="section-label">本月净利润</span>
            <span className="chip chip-gold">
              <Sparkles className="w-3 h-3" />
              真实到手
            </span>
          </div>

          <div className="flex items-baseline gap-4 flex-wrap">
            <div className="focus-number tabular-nums">
              {money.fmt(num.profit)}
            </div>
            {change.hasCompare && (
              <div className={`chip ${isUp ? 'chip-up' : 'chip-down'} text-sm px-2.5 py-1`}>
                {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(change.pct).toFixed(1)}%
                <span className="opacity-70 ml-1">
                  ({isUp ? '+' : ''}{money.fmtCompact(change.absDiff)})
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 text-sm text-[var(--text-secondary)]">
            {money.code !== 'CNY' && (
              <>约 <span className="text-[var(--text-primary)] font-medium tabular-nums">¥{(num.profit * exRate).toFixed(0)}</span> 人民币 · </>
            )}
            利润率 <span className="text-[var(--text-primary)] font-medium tabular-nums">{num.rate.toFixed(1)}%</span>
          </div>

          {/* 智能洞察 */}
          {insights.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-2.5">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                  <span className="text-base leading-none mt-0.5">{ins.icon}</span>
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右：日销售走势 */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              本月日销售走势
            </span>
          </div>

          {dailySales.length > 0 ? (
            <>
              <div className="h-[140px] -mx-1">
                <Sparkline
                  data={dailySales}
                  color="#d4a056"
                  type="area"
                  height={140}
                  strokeWidth={2}
                  gradientId="heroDailySales"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <DailyStat label="总单数" value={monthData.summary?.orderCount || 0} />
                <DailyStat label="峰值" value={money.fmtCompact(dailyStats.peak)} />
                <DailyStat label="日均" value={money.fmtCompact(dailyStats.avg)} />
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-[var(--text-tertiary)]">
              暂无订单数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DailyStat({ label, value }) {
  return (
    <div className="text-center px-2 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
      <div className="text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</div>
      <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 tracking-wider uppercase">{label}</div>
    </div>
  );
}
