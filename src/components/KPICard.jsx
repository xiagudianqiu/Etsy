import { ArrowUp, ArrowDown } from 'lucide-react';
import Sparkline from './Sparkline';

/**
 * KPI 卡片 — 带微图、对比 chip、副标签
 *
 * Props:
 *   label       卡片标题
 *   value       主数值（字符串，已格式化）
 *   change?     环比百分比（数字，正/负自动判断方向）
 *   changeAbs?  环比绝对差额（字符串如 "+$63"）
 *   sub?        底部副标签
 *   subColor?   副标签颜色 class
 *   sparkData?  number[] — sparkline 数据
 *   sparkType?  'area'|'line'|'bar'
 *   accent?     强调色 'gold'|'up'|'down'|'muted'
 *   rank?       排名 1/2/3 等（可选，金色突出）
 */
const ACCENT_COLOR = {
  gold: '#d4a056',
  up: '#4ade80',
  down: '#ef4444',
  muted: '#6b5d52'
};

export default function KPICard({
  label,
  value,
  change,
  changeAbs,
  sub,
  subColor,
  sparkData,
  sparkType = 'area',
  accent = 'gold',
  delay = 0
}) {
  const hasChange = change !== undefined && change !== null && isFinite(change);
  const isUp = hasChange && change >= 0;
  const sparkColor = ACCENT_COLOR[accent] || ACCENT_COLOR.gold;

  return (
    <div
      className="card kpi-card p-5 fade-in relative overflow-hidden"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="section-label">{label}</span>
        {hasChange && (
          <span className={`chip ${isUp ? 'chip-up' : 'chip-down'}`}>
            {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[26px] font-semibold tabular-nums text-[var(--text-primary)] leading-none tracking-tight">
          {value}
        </span>
        {hasChange && changeAbs && (
          <span className={`text-xs tabular-nums ${isUp ? 'text-[var(--up)]' : 'text-[var(--down)]'}`}>
            ({changeAbs})
          </span>
        )}
      </div>

      {/* Sparkline */}
      {sparkData && sparkData.length > 0 && (
        <div className="mb-2 -mx-1">
          <Sparkline data={sparkData} color={sparkColor} type={sparkType} height={32} />
        </div>
      )}

      {sub && (
        <div className={`text-xs ${subColor || 'text-[var(--text-tertiary)]'}`}>{sub}</div>
      )}
    </div>
  );
}
