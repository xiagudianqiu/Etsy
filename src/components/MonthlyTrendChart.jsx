import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import { calculateProfit } from '../utils/profitCalculator';

/**
 * 月度趋势主图 — 销售额 + 净利润 双柱
 * 当前月柱子金色高亮，其他月 stone 灰
 */
export default function MonthlyTrendChart({ availableMonths, monthsData, selectedMonth, config }) {
  const data = useMemo(() => {
    if (!availableMonths || !monthsData) return [];
    const productCosts = config?.products;
    const rate = config?.exchangeRate || 7.2;
    return availableMonths
      .slice()
      .sort()
      .map(key => {
        const md = monthsData[key];
        if (!md) return null;
        const p = calculateProfit(md, productCosts, rate);
        const [y, m] = key.split('-');
        return {
          key,
          label: `${parseInt(m)}月`,
          销售额: Math.round(p.totalSales * 100) / 100,
          净利润: Math.round(p.profit * 100) / 100,
          费用: Math.round(p.totalFees * 100) / 100,
          利润率: Math.round(p.profitRate * 10) / 10,
          订单数: p.orderCount,
          isCurrent: key === selectedMonth
        };
      })
      .filter(Boolean);
  }, [availableMonths, monthsData, selectedMonth, config]);

  if (data.length === 0) {
    return <div className="card p-8 text-center text-[var(--text-tertiary)]">暂无数据</div>;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
      <div className="card-flat px-3.5 py-2.5 text-xs">
        <div className="font-semibold text-[var(--text-primary)] mb-1.5">{d.label}</div>
        <div className="space-y-0.5">
          <Row label="销售额" value={`$${d.销售额.toFixed(2)}`} color="#d4a056" />
          <Row label="净利润" value={`$${d.净利润.toFixed(2)}`} color="#f5b955" />
          <Row label="费用" value={`-$${d.费用.toFixed(2)}`} color="#6b5d52" />
          <Row label="利润率" value={`${d.利润率.toFixed(1)}%`} color="var(--text-secondary)" />
          <Row label="订单" value={`${d.订单数} 单`} color="var(--text-tertiary)" />
        </div>
      </div>
    );
  };

  return (
    <div className="card p-6 fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">月度利润趋势</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">销售额 vs 净利润</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#3a3128' }} />销售额
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#d4a056' }} />净利润
          </span>
        </div>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: -16 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--text-tertiary)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              stroke="var(--text-tertiary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212,160,86,0.04)' }} />
            <Bar dataKey="销售额" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.isCurrent ? '#5a4a38' : '#3a3128'} />
              ))}
            </Bar>
            <Bar dataKey="净利润" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.isCurrent ? '#f5b955' : '#d4a056'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span style={{ color }} className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-[var(--text-primary)] tabular-nums font-medium">{value}</span>
    </div>
  );
}
