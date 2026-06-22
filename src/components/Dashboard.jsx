import { DollarSign, TrendingUp, Percent, ShoppingCart, Package, Calculator, Receipt, Megaphone, Target, Wallet, Coins, Activity } from 'lucide-react';

function StatCard({ title, value, subtitle, icon: Icon, trend, accentColor = 'indigo' }) {
  const colorClasses = {
    indigo: 'text-indigo-400 bg-indigo-500/20',
    green: 'text-green-400 bg-green-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    sky: 'text-sky-400 bg-sky-500/20',
    pink: 'text-pink-400 bg-pink-500/20'
  };

  return (
    <div className="bg-slate-800/30 stat-card rounded-2xl p-5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[accentColor] || colorClasses.indigo}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && (
        <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default function Dashboard({ profitData, compareProfitData, compareMode, adROI, monthData }) {
  if (!profitData) {
    return (
      <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
        <Package className="w-16 h-16 mx-auto text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-300 mb-2">暂无数据</h3>
        <p className="text-slate-500">请导入 Etsy CSV 文件开始分析</p>
      </div>
    );
  }

  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return undefined;
    return ((current - previous) / previous) * 100;
  };

  const {
    totalSales, totalFees, netAmount, productCostUSD, productCostRMB,
    profit, profitRate, orderCount, avgOrderValue
  } = profitData;

  const summary = monthData?.summary || {};
  const transactionFee = Math.max(0, summary.totalTransactionFee || 0);
  const processingFee = Math.max(0, summary.totalProcessingFee || 0);
  const tax = Math.max(0, summary.totalTax || 0);
  const shipping = Math.max(0, summary.totalShipping || 0);
  const listingFee = Math.max(0, summary.totalListingFee || 0);
  const refund = Math.max(0, summary.totalRefund || 0);

  let compareData = null;
  if (compareMode && compareProfitData) {
    compareData = {
      salesTrend: getTrend(totalSales, compareProfitData.totalSales),
      profitTrend: getTrend(profit, compareProfitData.profit),
      profitRateTrend: getTrend(profitRate, compareProfitData.profitRate),
      orderTrend: getTrend(orderCount, compareProfitData.orderCount),
      netTrend: getTrend(netAmount, compareProfitData.netAmount),
      feesTrend: getTrend(totalFees, compareProfitData.totalFees),
      aovTrend: getTrend(avgOrderValue, compareProfitData.avgOrderValue)
    };
  }

  return (
    <div className="space-y-6">
      {/* 第一行：核心利润指标 */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> 核心指标
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="销售额"
            value={`$${totalSales.toFixed(2)}`}
            subtitle={compareMode && compareData ? `vs 对比月: $${compareProfitData.totalSales.toFixed(2)}` : `${orderCount} 笔订单`}
            icon={DollarSign}
            trend={compareData?.salesTrend}
            accentColor="indigo"
          />
          <StatCard
            title="到账净额"
            value={`$${netAmount.toFixed(2)}`}
            subtitle={compareMode && compareData ? `vs 对比月: $${compareProfitData.netAmount.toFixed(2)}` : 'Etsy 打到账户'}
            icon={Wallet}
            trend={compareData?.netTrend}
            accentColor="cyan"
          />
          <StatCard
            title="净利润"
            value={`$${profit.toFixed(2)}`}
            subtitle={compareMode && compareData ? `vs 对比月: $${compareProfitData.profit.toFixed(2)}` : `≈ ¥${(profit * 7.2).toFixed(0)} RMB`}
            icon={Calculator}
            trend={compareData?.profitTrend}
            accentColor="green"
          />
          <StatCard
            title="利润率"
            value={`${profitRate.toFixed(1)}%`}
            subtitle={compareMode && compareData ? `vs 对比月: ${compareProfitData.profitRate.toFixed(1)}%` : profitRate >= 40 ? '健康' : profitRate >= 25 ? '可接受' : '偏低'}
            icon={Percent}
            trend={compareData?.profitRateTrend}
            accentColor={profitRate >= 40 ? 'green' : profitRate >= 25 ? 'amber' : 'rose'}
          />
        </div>
      </div>

      {/* 第二行：成本与订单指标 */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4" /> 成本与订单
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="订单数"
            value={orderCount}
            subtitle={compareMode && compareData ? `vs 对比月: ${compareProfitData.orderCount}` : '本月成交订单'}
            icon={ShoppingCart}
            trend={compareData?.orderTrend}
            accentColor="sky"
          />
          <StatCard
            title="客单价"
            value={`$${avgOrderValue.toFixed(2)}`}
            subtitle={compareMode && compareData ? `vs 对比月: $${compareProfitData.avgOrderValue.toFixed(2)}` : '平均每单'}
            icon={Target}
            trend={compareData?.aovTrend}
            accentColor="purple"
          />
          <StatCard
            title="产品成本"
            value={`$${productCostUSD.toFixed(2)}`}
            subtitle={`¥${productCostRMB.toFixed(0)} RMB`}
            icon={Package}
            accentColor="amber"
          />
          <StatCard
            title="Etsy 费用合计"
            value={`$${totalFees.toFixed(2)}`}
            subtitle={`占销售额 ${totalSales > 0 ? ((totalFees / totalSales) * 100).toFixed(1) : '0.0'}%`}
            icon={Receipt}
            trend={compareData?.feesTrend}
            accentColor="rose"
          />
        </div>
      </div>

      {/* 第三行：Etsy 费用拆解 */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4" /> Etsy 费用拆解
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="交易手续费"
            value={`$${transactionFee.toFixed(2)}`}
            subtitle="6.5% 销售佣金"
            icon={Receipt}
            accentColor="indigo"
          />
          <StatCard
            title="处理费"
            value={`$${processingFee.toFixed(2)}`}
            subtitle="3% + $0.25"
            icon={Receipt}
            accentColor="purple"
          />
          <StatCard
            title="销售税"
            value={`$${tax.toFixed(2)}`}
            subtitle="Etsy 代收"
            icon={Receipt}
            accentColor="pink"
          />
          <StatCard
            title="运费标签"
            value={`$${shipping.toFixed(2)}`}
            subtitle="USPS"
            icon={Receipt}
            accentColor="cyan"
          />
          <StatCard
            title="Listing 费"
            value={`$${listingFee.toFixed(2)}`}
            subtitle="上架费"
            icon={Receipt}
            accentColor="sky"
          />
          <StatCard
            title="退款"
            value={`$${refund.toFixed(2)}`}
            subtitle="退给买家"
            icon={Receipt}
            accentColor="rose"
          />
        </div>
      </div>

      {/* 第四行：广告分析 */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4" /> 广告分析
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="站内广告"
            value={`$${(adROI?.etsyAds || 0).toFixed(2)}`}
            subtitle="Etsy Ads（按点击）"
            icon={Megaphone}
            accentColor="amber"
          />
          <StatCard
            title="站外广告"
            value={`$${(adROI?.offsiteAds || 0).toFixed(2)}`}
            subtitle="Offsite Ads（15% 佣金）"
            icon={Megaphone}
            accentColor="purple"
          />
          <StatCard
            title="广告总投入"
            value={`$${(adROI?.adCost || 0).toFixed(2)}`}
            subtitle={`占销售额 ${(adROI?.adRate || 0).toFixed(1)}%`}
            icon={TrendingUp}
            accentColor={adROI?.adRate < 5 ? 'green' : adROI?.adRate < 10 ? 'amber' : 'rose'}
          />
          <StatCard
            title="广告 ROI"
            value={`${(adROI?.roi || 0).toFixed(0)}%`}
            subtitle={(adROI?.roi || 0) > 500 ? '极佳' : (adROI?.roi || 0) > 200 ? '良好' : '需优化'}
            icon={Target}
            accentColor={(adROI?.roi || 0) > 500 ? 'green' : (adROI?.roi || 0) > 200 ? 'amber' : 'rose'}
          />
        </div>
      </div>

      {/* 对比模式下的差异提示 */}
      {compareMode && compareData && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h4 className="text-sm font-medium text-slate-400 mb-3">月度变化对比</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              ['销售额', compareData.salesTrend],
              ['到账', compareData.netTrend],
              ['利润', compareData.profitTrend],
              ['利润率', compareData.profitRateTrend],
              ['订单数', compareData.orderTrend],
              ['客单价', compareData.aovTrend],
              ['Etsy费用', compareData.feesTrend]
            ].map(([label, val]) => val !== undefined && (
              <div key={label} className="flex justify-between bg-slate-700/30 rounded-lg px-3 py-2">
                <span className="text-slate-400">{label}:</span>
                <span className={val >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                  {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
