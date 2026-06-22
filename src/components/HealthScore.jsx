import { useMemo } from 'react';
import { Activity, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

/**
 * 运营健康度评分
 * 4 维加权：利润率(35) + 广告占比(25) + 退款率(20) + 利润绝对值(20)
 */
export default function HealthScore({ monthData, profitData }) {
  const score = useMemo(() => {
    if (!monthData?.summary || !profitData) return null;
    const s = monthData.summary;
    const sales = s.totalSales || 0;
    if (sales === 0) return null;

    // 1) 利润率得分 (35%)
    const rate = profitData.profitRate || 0;
    let rateScore = 0;
    if (rate >= 45) rateScore = 100;
    else if (rate >= 35) rateScore = 80;
    else if (rate >= 25) rateScore = 60;
    else if (rate >= 15) rateScore = 40;
    else rateScore = 20;

    // 2) 广告占比得分 (25%)
    const adCost = Math.max(0, s.totalEtsyAds || 0) + Math.max(0, s.totalOffsiteAds || 0);
    const adPct = (adCost / sales) * 100;
    let adScore = 0;
    if (adPct < 3) adScore = 100;
    else if (adPct < 6) adScore = 80;
    else if (adPct < 10) adScore = 60;
    else if (adPct < 15) adScore = 40;
    else adScore = 20;

    // 3) 退款率得分 (20%)
    const refund = Math.max(0, s.totalRefund || 0);
    const refundPct = (refund / sales) * 100;
    let refundScore = 100;
    if (refundPct > 10) refundScore = 20;
    else if (refundPct > 5) refundScore = 50;
    else if (refundPct > 2) refundScore = 70;
    else if (refundPct > 0) refundScore = 90;

    // 4) 利润绝对值得分 (20%)
    const profit = profitData.profit || 0;
    let absScore = 0;
    if (profit >= 500) absScore = 100;
    else if (profit >= 300) absScore = 80;
    else if (profit >= 150) absScore = 60;
    else if (profit >= 50) absScore = 40;
    else absScore = 20;

    const totalScore = Math.round(
      rateScore * 0.35 + adScore * 0.25 + refundScore * 0.20 + absScore * 0.20
    );

    return {
      total: totalScore,
      dimensions: [
        { key: 'profit', label: '利润率', score: rateScore, value: `${rate.toFixed(1)}%`, weight: 35 },
        { key: 'ad', label: '广告占比', score: adScore, value: `${adPct.toFixed(1)}%`, weight: 25 },
        { key: 'refund', label: '退款率', score: refundScore, value: `${refundPct.toFixed(1)}%`, weight: 20 },
        { key: 'abs', label: '利润规模', score: absScore, value: `$${profit.toFixed(0)}`, weight: 20 }
      ]
    };
  }, [monthData, profitData]);

  if (!score) {
    return (
      <div className="card p-6 fade-in">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--gold)]" />
          运营健康度
        </h3>
        <div className="mt-8 text-center">
          <div className="text-sm text-[var(--text-tertiary)]">本月暂无销售数据</div>
          <div className="text-xs text-[var(--text-muted)] mt-1.5">导入有订单的月份后将自动评分</div>
        </div>
      </div>
    );
  }

  const levelInfo = (s) => {
    if (s >= 80) return { label: '优秀', color: 'var(--up)', icon: CheckCircle };
    if (s >= 60) return { label: '良好', color: 'var(--gold-bright)', icon: Activity };
    if (s >= 40) return { label: '注意', color: '#fbbf24', icon: AlertTriangle };
    return { label: '需改善', color: 'var(--down)', icon: AlertCircle };
  };

  const lv = levelInfo(score.total);
  const Icon = lv.icon;

  // 圆环进度
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score.total / 100);

  return (
    <div className="card p-6 fade-in">
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--gold)]" />
          运营健康度
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">综合 4 维加权评分</p>
      </div>

      <div className="grid grid-cols-12 gap-4 items-center">
        {/* 圆环大分数 */}
        <div className="col-span-12 sm:col-span-5 flex flex-col items-center">
          <div className="relative w-[140px] h-[140px]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70" cy="70" r={radius}
                stroke="var(--border)" strokeWidth="8" fill="none"
              />
              <circle
                cx="70" cy="70" r={radius}
                stroke={lv.color}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold tabular-nums" style={{ color: lv.color }}>{score.total}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] tracking-wider uppercase">满分 100</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm font-medium" style={{ color: lv.color }}>
            <Icon className="w-3.5 h-3.5" />
            {lv.label}
          </div>
        </div>

        {/* 4 维细分 */}
        <div className="col-span-12 sm:col-span-7 space-y-2.5">
          {score.dimensions.map(d => {
            const dlv = levelInfo(d.score);
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">{d.label}</span>
                  <span className="tabular-nums">
                    <span className="text-[var(--text-primary)] font-medium">{d.value}</span>
                    <span className="text-[var(--text-tertiary)] mx-1.5">·</span>
                    <span style={{ color: dlv.color }}>{d.score} 分</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${d.score}%`, background: dlv.color }}
                  />
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 tabular-nums">权重 {d.weight}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
