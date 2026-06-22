import { useEffect, useState } from 'react';
import {
  ArrowRight, Sparkles, TrendingUp, TrendingDown, Wallet, Receipt,
  ChevronDown, Zap
} from 'lucide-react';

/**
 * 高端落地页 Hero
 * - 克制的渐变、大量留白、精致的微交互
 * - 数字滚动动画 + 产品预览 mock
 */
export default function Hero({ stats, onImportClick, hasData, onScrollToDashboard }) {
  const [mounted, setMounted] = useState(false);
  const [num, setNum] = useState({ sales: 0, profit: 0, rate: 0 });

  const tSales = stats?.totalSales || 0;
  const tProfit = stats?.profit || 0;
  const tRate = stats?.profitRate || 0;

  useEffect(() => { setMounted(true); }, []);

  // 数字滚动
  useEffect(() => {
    if (!hasData) return;
    let frame;
    const start = performance.now();
    const dur = 1800;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setNum({ sales: tSales * e, profit: tProfit * e, rate: tRate * e });
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hasData, tSales, tProfit, tRate]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16">
      {/* 光晕层 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[15%] w-[350px] h-[350px] bg-cyan-500/8 rounded-full blur-[120px]" />
      </div>

      {/* 顶部细线网格 */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(129,140,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)'
        }}
      />

      <div className={`relative z-10 w-full max-w-5xl mx-auto px-6 text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-8 rounded-full border border-indigo-400/20 bg-indigo-500/5 backdrop-blur-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400" />
          </span>
          <span className="text-xs font-medium text-indigo-200/90 tracking-wide">LumiFlask 利润智能分析</span>
        </div>

        {/* 标题 */}
        <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
          <span className="text-white">看清每一分利润</span>
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
            真正流向了哪里
          </span>
        </h1>

        {/* 副标题 */}
        <p className="text-base sm:text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          导入 Etsy 月度账单，自动拆解全部费用、广告、退款与税费。
          <br className="hidden sm:block" />
          一眼看到 <span className="text-slate-200 font-medium">真实到账利润</span>，不再被平台抽成蒙在鼓里。
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <button
            onClick={onImportClick}
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-slate-900 font-semibold text-[15px] hover:bg-slate-100 transition-all shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] hover:shadow-indigo-500/40"
          >
            {hasData ? '导入更多数据' : '导入 CSV 开始分析'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          {hasData && (
            <button
              onClick={onScrollToDashboard}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-700/60 bg-slate-900/40 backdrop-blur-sm text-slate-200 hover:text-white hover:border-slate-500 font-medium text-[15px] transition-all"
            >
              查看仪表盘
            </button>
          )}
        </div>

        {/* 产品预览 mock —— 浮动的玻璃卡片，营造"这就是产品"的质感 */}
        <div className="relative max-w-3xl mx-auto">
          {/* 主预览卡片 */}
          <div className="relative rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-indigo-950/50 overflow-hidden">
            {/* 顶栏 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/40">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 text-center text-xs text-slate-500 font-mono">etsy-profit-dashboard</div>
            </div>

            {/* 卡片内容 */}
            <div className="p-5 grid grid-cols-3 gap-3 text-left">
              <MockStat
                label="月销售额"
                value={hasData ? `$${num.sales.toFixed(0)}` : '$633'}
                icon={TrendingUp}
                color="text-indigo-400"
              />
              <MockStat
                label="净利润"
                value={hasData ? `$${num.profit.toFixed(0)}` : '$284'}
                icon={Wallet}
                color="text-emerald-400"
              />
              <MockStat
                label="利润率"
                value={hasData ? `${num.rate.toFixed(1)}%` : '44.8%'}
                icon={Zap}
                color="text-purple-400"
              />

              {/* 费用拆解条 */}
              <div className="col-span-3 mt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>费用构成</span>
                  <span className="text-rose-400/80">-$199.57</span>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-800">
                  <div className="bg-indigo-500" style={{ width: '47%' }} title="手续费" />
                  <div className="bg-purple-500" style={{ width: '18%' }} title="处理费" />
                  <div className="bg-pink-500" style={{ width: '22%' }} title="税费" />
                  <div className="bg-teal-500" style={{ width: '8%' }} title="运费" />
                  <div className="bg-amber-500" style={{ width: '5%' }} title="广告" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[10px] text-slate-500">
                  <Legend c="bg-indigo-500" t="手续费 47%" />
                  <Legend c="bg-purple-500" t="处理费 18%" />
                  <Legend c="bg-pink-500" t="税费 22%" />
                  <Legend c="bg-teal-500" t="运费 8%" />
                  <Legend c="bg-amber-500" t="广告 5%" />
                </div>
              </div>
            </div>
          </div>

          {/* 浮动小卡片 1 */}
          <div className="hidden md:flex absolute -left-16 top-20 items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-xl shadow-xl animate-float">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-500">环比增长</div>
              <div className="text-sm font-semibold text-emerald-400">+56.6%</div>
            </div>
          </div>

          {/* 浮动小卡片 2 */}
          <div className="hidden md:flex absolute -right-12 bottom-16 items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-xl shadow-xl animate-float-delayed">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-500">广告占比</div>
              <div className="text-sm font-semibold text-rose-400">仅 4.2%</div>
            </div>
          </div>
        </div>

        {/* 信任指标 */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-500">
          <Trust icon={Sparkles} text="9 类费用全透明" />
          <span className="w-px h-3 bg-slate-700" />
          <Trust icon={TrendingDown} text="真实到账净额" />
          <span className="w-px h-3 bg-slate-700" />
          <Trust icon={Wallet} text="数据本地存储" />
          <span className="w-px h-3 bg-slate-700" />
          <Trust icon={Zap} text="一键导出报表" />
        </div>
      </div>

      {/* 滚动提示 */}
      {hasData && (
        <button
          onClick={onScrollToDashboard}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600 hover:text-slate-400 transition-colors"
        >
          <span className="text-[10px] tracking-widest uppercase">向下滚动</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </button>
      )}
    </section>
  );
}

function MockStat({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
      <Icon className={`w-4 h-4 ${color} mb-2`} />
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function Legend({ c, t }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${c}`} />
      {t}
    </span>
  );
}

function Trust({ icon: Icon, text }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" />
      {text}
    </span>
  );
}
