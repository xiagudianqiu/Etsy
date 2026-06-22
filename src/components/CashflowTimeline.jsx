import { useMemo } from 'react';
import { Wallet, Clock, ArrowRight } from 'lucide-react';

/**
 * 现金流时间线
 * Etsy 默认 14 天后打款（Funds Available 字段）
 * - 本月销售但还在等的钱（待到账）
 * - 这个月已经实际到账的钱（含上个月延后到的）
 * - 预估下个月会到账的钱
 *
 * 当前 CSV 实现简化版：用 sale 日期 + 14 天估算
 */
export default function CashflowTimeline({ monthData, profitData, selectedMonth }) {
  const stats = useMemo(() => {
    if (!monthData?.orders || !selectedMonth) return null;

    const orders = monthData.orders;
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthEnd = new Date(year, month, 0); // 当月最后一天

    let receivedThisMonth = 0;  // 本月已收到（订单日 + 14 天 <= 月末）
    let pendingNextMonth = 0;   // 本月卖出但要下月才到（订单日 + 14 天 > 月末）
    let receivedDays = [];
    let pendingDays = [];

    orders.forEach(o => {
      if (!o.date) return;
      const saleDate = new Date(o.date);
      const availableDate = new Date(saleDate);
      availableDate.setDate(availableDate.getDate() + 14);
      const net = o.net || 0;

      if (availableDate <= monthEnd) {
        receivedThisMonth += net;
        receivedDays.push({ date: o.date, available: availableDate, amount: net });
      } else {
        pendingNextMonth += net;
        pendingDays.push({ date: o.date, available: availableDate, amount: net });
      }
    });

    const totalNet = monthData.summary?.netAmount || 0;

    return {
      received: receivedThisMonth,
      pending: pendingNextMonth,
      total: totalNet,
      receivedPct: totalNet > 0 ? (receivedThisMonth / totalNet) * 100 : 0,
      pendingPct: totalNet > 0 ? (pendingNextMonth / totalNet) * 100 : 0,
      orderCount: orders.length,
      pendingCount: pendingDays.length,
      avgWaitDays: 14
    };
  }, [monthData, selectedMonth]);

  if (!stats) {
    return (
      <div className="card p-6 fade-in">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">现金流时间线</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-2">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="card p-6 fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[var(--gold)]" />
            现金流时间线
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Etsy 默认 14 天延迟打款</p>
        </div>
      </div>

      {/* 两条进度条对比 */}
      <div className="space-y-4 mb-5">
        <CashRow
          label="本月已到账"
          sub="销售后 14 天内已收到"
          amount={stats.received}
          pct={stats.receivedPct}
          color="var(--up)"
          icon={Wallet}
        />
        <CashRow
          label="等待到账"
          sub={`${stats.pendingCount} 笔订单 · 预计下月到账`}
          amount={stats.pending}
          pct={stats.pendingPct}
          color="var(--gold)"
          icon={Clock}
          delayed
        />
      </div>

      {/* 总览 */}
      <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
        <span className="text-xs text-[var(--text-tertiary)]">本月销售总净额</span>
        <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">${stats.total.toFixed(2)}</span>
      </div>

      {/* 时间线提示 */}
      {stats.pending > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--gold-soft)] border border-[rgba(212,160,86,0.15)]">
          <div className="flex items-center gap-2 text-xs text-[var(--gold-bright)]">
            <Clock className="w-3.5 h-3.5" />
            <span>
              预计 <span className="font-semibold tabular-nums">${stats.pending.toFixed(2)}</span> 将在下月到账
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CashRow({ label, sub, amount, pct, color, icon: Icon, delayed }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          ${amount.toFixed(2)}
        </span>
      </div>
      <div className="text-[11px] text-[var(--text-tertiary)] mb-2">{sub}</div>
      <div className="h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: color,
            opacity: delayed ? 0.6 : 1
          }}
        />
      </div>
      <div className="text-[10px] text-[var(--text-muted)] mt-1 tabular-nums">{pct.toFixed(1)}%</div>
    </div>
  );
}
