import { useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts';
import { calculateProfit } from '../utils/profitCalculator';

/**
 * 月度对比 — 柱状图 + 数据表 + 环比
 */
export default function MonthCompare({ availableMonths, monthsData, config }) {
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
          monthKey: key,
          label: `${parseInt(m)}月`,
          销售额: Math.round(p.totalSales * 100) / 100,
          净利润: Math.round(p.profit * 100) / 100,
          利润率: Math.round(p.profitRate * 10) / 10,
          订单数: p.orderCount,
          avgOrder: Math.round(p.avgOrderValue * 100) / 100
        };
      })
      .filter(Boolean);
  }, [availableMonths, monthsData, config]);

  if (data.length === 0) {
    return <div className="card p-8 text-center text-[var(--text-tertiary)]">暂无数据</div>;
  }

  return (
    <div className="card p-7 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">月度对比</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{data.length} 个月的利润变化</p>
        </div>
      </div>

      {/* 柱状图 */}
      <div className="mb-7" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              cursor={{ fill: 'rgba(212,160,86,0.05)' }}
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                fontSize: 12
              }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            />
            <Bar dataKey="销售额" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((d, i) => (
                <Cell key={i} fill="#3a3128" />
              ))}
            </Bar>
            <Bar dataKey="净利润" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((d, i) => (
                <Cell key={i} fill="#d4a056" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 对比表 */}
      <div className="overflow-x-auto -mx-2">
        <table className="data-table">
          <thead>
            <tr>
              <th>月份</th>
              <th className="text-right">销售额</th>
              <th className="text-right">净利润</th>
              <th className="text-right">利润率</th>
              <th className="text-right">订单</th>
              <th className="text-right">环比</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const prev = i > 0 ? data[i - 1] : null;
              const profitChange = prev ? ((d.净利润 - prev.净利润) / Math.abs(prev.净利润)) * 100 : null;
              return (
                <tr key={d.monthKey}>
                  <td>
                    <span className="font-medium text-[var(--text-primary)]">{d.label}</span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-2 tabular-nums">{d.monthKey}</span>
                  </td>
                  <td className="text-right tabular-nums text-[var(--text-secondary)]">${d.销售额.toFixed(2)}</td>
                  <td className="text-right tabular-nums text-[var(--gold-bright)] font-medium">${d.净利润.toFixed(2)}</td>
                  <td className="text-right tabular-nums text-[var(--text-secondary)]">{d.利润率.toFixed(1)}%</td>
                  <td className="text-right tabular-nums text-[var(--text-secondary)]">{d.订单数}</td>
                  <td className="text-right">
                    {profitChange === null ? (
                      <span className="text-[var(--text-muted)] text-xs">—</span>
                    ) : (
                      <span className={`chip ${profitChange > 0 ? 'chip-up' : profitChange < 0 ? 'chip-down' : 'chip-muted'}`}>
                        {profitChange > 0 ? <ArrowUp className="w-3 h-3" /> : profitChange < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {Math.abs(profitChange).toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
