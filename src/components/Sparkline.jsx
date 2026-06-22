import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Area, AreaChart, Bar, BarChart } from 'recharts';

/**
 * Sparkline — 极简 micro-chart
 * - 无坐标、无 tooltip、无 legend
 * - 用于 KPI 卡片等小空间
 *
 * Props:
 *   data: number[] | { value: number }[]
 *   color?: string                       默认金色 #d4a056
 *   type?: 'line' | 'area' | 'bar'       默认 'area'
 *   height?: number                      默认 36
 *   strokeWidth?: number                 默认 1.5
 */
export default function Sparkline({
  data,
  color = '#d4a056',
  type = 'area',
  height = 36,
  strokeWidth = 1.5,
  gradientId
}) {
  // 标准化数据：支持纯数字数组
  const normalized = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (typeof data[0] === 'number') {
      return data.map((v, i) => ({ x: i, value: v }));
    }
    return data;
  }, [data]);

  // 唯一 gradientId（多个 sparkline 在同一页时避免冲突）
  const gid = useMemo(
    () => gradientId || `spark-${Math.random().toString(36).slice(2, 9)}`,
    [gradientId]
  );

  if (normalized.length === 0) {
    return <div style={{ height }} className="flex items-center text-xs text-[var(--text-muted)]">—</div>;
  }

  // 单点的情况，画一条横线
  if (normalized.length === 1) {
    return (
      <div style={{ height }} className="flex items-center">
        <div className="w-full h-px" style={{ backgroundColor: color, opacity: 0.4 }} />
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={normalized} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Bar dataKey="value" fill={color} radius={[1, 1, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={normalized} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // area (默认)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={normalized} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={strokeWidth}
          fill={`url(#${gid})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
