import { useMemo } from 'react';
import { Receipt, ArrowDown, ArrowUp } from 'lucide-react';

/**
 * 月度汇总：以文字+列表形式清晰展示「销售额 → 扣除什么 → 到账 → 减成本 → 利润」全过程
 */
export default function SummaryReport({ monthData, profitData, adROI }) {
  const lines = useMemo(() => {
    if (!monthData || !profitData) return null;
    const s = monthData.summary || {};

    const deductions = [
      { name: '交易手续费 (Transaction fee)', value: s.totalTransactionFee, desc: '每单 6.5% 的销售佣金' },
      { name: '处理费 (Processing fee)', value: s.totalProcessingFee, desc: '支付通道费 3% + $0.25' },
      { name: '销售税 (Sales tax)', value: s.totalTax, desc: '美国各州销售税，由 Etsy 代收代缴' },
      { name: '运费标签 (USPS Shipping)', value: s.totalShipping, desc: '美国境内 USPS 运单费用' },
      { name: 'Etsy 站内广告 (Etsy Ads)', value: s.totalEtsyAds, desc: '按点击付费的站内推广' },
      { name: '站外广告 (Offsite Ads)', value: s.totalOffsiteAds, desc: '15% 佣金，订单超过 $10 强制收取' },
      { name: 'Listing 费 (上架费)', value: s.totalListingFee, desc: '每个 listing $0.20，Etsy Plus 会员可抵扣' },
      { name: '退款 (Refund)', value: s.totalRefund, desc: '退给买家的金额' },
      { name: '其他费用', value: s.otherFees, desc: 'Etsy Plus 订阅、店铺设置费等' }
    ].filter(item => Math.abs(item.value || 0) > 0.01);

    return deductions;
  }, [monthData, profitData]);

  if (!monthData || !profitData || !lines) return null;

  const {
    totalSales, totalFees, netAmount, productCostUSD, productCostRMB,
    profit, profitRate, orderCount
  } = profitData;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">本月利润全流程</h3>
        <span className="text-sm text-slate-400 ml-2">共 {orderCount} 笔订单</span>
      </div>

      <div className="p-5 space-y-5">
        {/* 第一步：销售额 */}
        <div className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
          <div>
            <div className="text-slate-400 text-sm">① 销售额（Gross Sales）</div>
            <div className="text-xs text-slate-500 mt-1">所有订单 Sale 行金额之和</div>
          </div>
          <div className="text-2xl font-bold text-indigo-300">${totalSales.toFixed(2)}</div>
        </div>

        {/* 第二步：Etsy 扣除明细 */}
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-rose-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-rose-400" />
              <span className="text-sm text-slate-300">② Etsy 扣除的费用（共 {lines.length} 类）</span>
            </div>
            <span className="text-rose-300 font-semibold">-${totalFees.toFixed(2)}</span>
          </div>
          <div className="divide-y divide-slate-700/50">
            {lines.map(item => {
              const v = Math.max(0, item.value);
              const pct = totalFees > 0 ? (v / totalFees) * 100 : 0;
              return (
                <div key={item.name} className="px-4 py-3 hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-slate-200 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-rose-400 font-medium">-${v.toFixed(2)}</div>
                      <div className="text-xs text-slate-500">{pct.toFixed(1)}%</div>
                    </div>
                  </div>
                  {/* 占比进度条 */}
                  <div className="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-400/60"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 第三步：到账净额 */}
        <div className="flex items-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div>
            <div className="text-slate-400 text-sm">③ Etsy 打款到你账户（Net）</div>
            <div className="text-xs text-slate-500 mt-1">销售额 - 上面所有 Etsy 费用</div>
          </div>
          <div className="text-2xl font-bold text-cyan-300">${netAmount.toFixed(2)}</div>
        </div>

        {/* 第四步：减产品成本 */}
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div>
            <div className="text-slate-400 text-sm flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-amber-400" />
              ④ 减去产品成本
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ¥{productCostRMB.toFixed(0)} RMB ÷ 汇率 = USD
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300">-${productCostUSD.toFixed(2)}</div>
        </div>

        {/* 第五步：最终利润 */}
        <div className={`flex items-center justify-between p-5 rounded-lg border-2 ${
          profit >= 0
            ? 'bg-green-500/10 border-green-500/40'
            : 'bg-red-500/10 border-red-500/40'
        }`}>
          <div>
            <div className="text-slate-300 text-sm flex items-center gap-2">
              <ArrowUp className={`w-4 h-4 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              ⑤ 实际净利润
            </div>
            <div className="text-xs text-slate-400 mt-1">
              利润率 {profitRate.toFixed(1)}% · 折合人民币 ¥{(profit * 7.2).toFixed(0)}
            </div>
          </div>
          <div className={`text-3xl font-bold ${profit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            ${profit.toFixed(2)}
          </div>
        </div>

        {/* 广告效率小结 */}
        {adROI && adROI.adCost > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-sm text-slate-400 mb-2">广告效率小结</div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="text-slate-500 text-xs">广告总投入</div>
                <div className="text-white font-medium mt-1">${adROI.adCost.toFixed(2)}</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="text-slate-500 text-xs">占销售额</div>
                <div className="text-white font-medium mt-1">{adROI.adRate.toFixed(1)}%</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="text-slate-500 text-xs">广告 ROI</div>
                <div className={`font-medium mt-1 ${adROI.roi > 500 ? 'text-green-400' : adROI.roi > 200 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {adROI.roi.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
