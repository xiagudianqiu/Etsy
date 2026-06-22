import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { calculateProfit } from '../utils/profitCalculator';

export default function SalesChart({ availableMonths, monthsData, config }) {
  const productCosts = config?.products;
  const exchangeRate = config?.exchangeRate || 7.2;

  const chartData = useMemo(() => {
    if (!availableMonths.length || !monthsData) return [];

    return availableMonths
      .slice()
      .sort()
      .map(monthKey => {
        const monthData = monthsData[monthKey];
        if (!monthData) return null;

        const summary = monthData.summary || {};
        const sales = summary.totalSales || 0;
        const fees = summary.totalFees || 0;
        const ads = Math.abs(summary.totalEtsyAds || 0) + Math.abs(summary.totalOffsiteAds || 0);

        // 真实利润（含产品成本）
        const { profit } = calculateProfit(monthData, productCosts, exchangeRate);

        const [, month] = monthKey.split('-');
        const monthLabel = `${parseInt(month)}月`;

        return {
          month: monthLabel,
          fullMonth: monthKey,
          销售额: Math.round(sales * 100) / 100,
          费用: Math.round(fees * 100) / 100,
          净利润: Math.round(profit * 100) / 100,
          广告费: Math.round(ads * 100) / 100,
          订单数: monthData.orders?.length || 0
        };
      })
      .filter(Boolean);
  }, [availableMonths, monthsData, productCosts, exchangeRate]);

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
        <p className="text-slate-500">暂无足够数据展示图表</p>
      </div>
    );
  }

  // 单月：展示订单销售额分布
  if (chartData.length === 1) {
    const monthKey = chartData[0].fullMonth;
    const orders = monthsData[monthKey]?.orders || [];
    const orderChart = orders.map((o, i) => ({
      订单: `#${i + 1}`,
      销售额: Math.round(o.sale * 100) / 100
    }));

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">订单销售额分布</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={orderChart} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="订单" type="category" stroke="#94a3b8" width={60} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#f8fafc' }}
            />
            <Bar dataKey="销售额" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 多月：趋势折线图 + 订单数柱状图
  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">月度趋势</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#f8fafc' }}
            />
            <Legend />
            <Line type="monotone" dataKey="销售额" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', strokeWidth: 2 }} />
            <Line type="monotone" dataKey="净利润" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', strokeWidth: 2 }} />
            <Line type="monotone" dataKey="广告费" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#f59e0b', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">订单数量趋势</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#f8fafc' }}
            />
            <Bar dataKey="订单数" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
