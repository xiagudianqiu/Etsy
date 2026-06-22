import { useState, useMemo } from 'react';
import { Sliders, TrendingUp, TrendingDown } from 'lucide-react';
import { useMoney } from '../utils/MoneyContext';

/**
 * 成本敏感度模拟
 * 滑块调整产品成本/汇率，实时看利润变化
 */
export default function CostSensitivity({ monthData, profitData, config }) {
  const money = useMoney();
  const [costDelta, setCostDelta] = useState(0);   // RMB 增量，-30 ~ +30
  const [rateDelta, setRateDelta] = useState(0);   // 汇率增量，-0.5 ~ +0.5

  const sim = useMemo(() => {
    if (!monthData?.orders || !profitData) return null;
    const productCosts = config?.products || {};
    const baseRate = config?.exchangeRate || 7.2;
    const newRate = baseRate + rateDelta;

    const orders = monthData.orders;
    let newCostRMB = 0;
    orders.forEach(o => {
      const baseCost = productCosts[o.product] ?? 95;
      newCostRMB += baseCost + costDelta;
    });
    const newCostUSD = newCostRMB / newRate;
    const newProfit = (monthData.summary?.netAmount || 0) - newCostUSD;
    const profitDiff = newProfit - profitData.profit;
    const newProfitRate = profitData.totalSales > 0 ? (newProfit / profitData.totalSales) * 100 : 0;

    return {
      newProfit,
      newProfitRate,
      profitDiff,
      newCostUSD,
      newRate
    };
  }, [costDelta, rateDelta, monthData, profitData, config]);

  if (!sim) {
    return (
      <div className="card p-6 fade-in">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">成本敏感度</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-2">暂无数据</p>
      </div>
    );
  }

  const isUp = sim.profitDiff >= 0;

  return (
    <div className="card p-6 fade-in">
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[var(--gold)]" />
          成本敏感度模拟
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">滑动看成本/汇率变化对利润的影响</p>
      </div>

      {/* 滑块 1：产品成本 */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-secondary)]">产品成本浮动</span>
          <span className={`text-sm font-semibold tabular-nums ${costDelta === 0 ? 'text-[var(--text-secondary)]' : costDelta > 0 ? 'text-[var(--down)]' : 'text-[var(--up)]'}`}>
            {costDelta > 0 ? '+' : ''}¥{costDelta}/件
          </span>
        </div>
        <input
          type="range"
          min={-30}
          max={30}
          step={1}
          value={costDelta}
          onChange={e => setCostDelta(parseInt(e.target.value))}
          className="slider-gold w-full"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] tabular-nums mt-1">
          <span>-¥30</span>
          <span>0</span>
          <span>+¥30</span>
        </div>
      </div>

      {/* 滑块 2：汇率 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-secondary)]">汇率浮动</span>
          <span className={`text-sm font-semibold tabular-nums ${rateDelta === 0 ? 'text-[var(--text-secondary)]' : rateDelta > 0 ? 'text-[var(--up)]' : 'text-[var(--down)]'}`}>
            {rateDelta > 0 ? '+' : ''}{rateDelta.toFixed(2)} (USD→RMB {sim.newRate.toFixed(2)})
          </span>
        </div>
        <input
          type="range"
          min={-0.5}
          max={0.5}
          step={0.05}
          value={rateDelta}
          onChange={e => setRateDelta(parseFloat(e.target.value))}
          className="slider-gold w-full"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] tabular-nums mt-1">
          <span>-0.5</span>
          <span>0</span>
          <span>+0.5</span>
        </div>
      </div>

      {/* 结果展示 */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
          <div className="text-[10px] text-[var(--text-tertiary)] tracking-wider uppercase mb-1">原利润</div>
          <div className="text-lg font-semibold tabular-nums text-[var(--text-secondary)]">{money.fmt(profitData.profit)}</div>
          <div className="text-[10px] text-[var(--text-tertiary)] mt-1">利润率 {profitData.profitRate.toFixed(1)}%</div>
        </div>
        <div className={`p-3 rounded-lg border ${isUp ? 'bg-[rgba(74,222,128,0.06)] border-[rgba(74,222,128,0.2)]' : 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.2)]'}`}>
          <div className="text-[10px] text-[var(--text-tertiary)] tracking-wider uppercase mb-1 flex items-center gap-1">
            模拟后 {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </div>
          <div className={`text-lg font-semibold tabular-nums ${isUp ? 'text-[var(--up)]' : 'text-[var(--down)]'}`}>
            {money.fmt(sim.newProfit)}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] mt-1 tabular-nums">
            {isUp ? '+' : ''}{money.fmt(sim.profitDiff)} · 利润率 {sim.newProfitRate.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
